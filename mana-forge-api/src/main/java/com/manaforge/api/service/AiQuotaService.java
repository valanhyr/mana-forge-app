package com.manaforge.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Daily quota for the public AI analysis endpoint, plus a result cache.
 *
 * Two independent problems are solved here:
 *
 * <ul>
 *   <li><b>Cost control.</b> The homepage lets anonymous visitors run a real AI
 *       analysis. Without a cap, one scraper can drain the provider budget
 *       overnight. Anonymous callers get a small daily allowance keyed by IP;
 *       authenticated users get a much larger one keyed by user id.</li>
 *   <li><b>Waste control.</b> Decks overlap heavily across users, so identical
 *       analyses are served from cache instead of re-billed to the provider.</li>
 * </ul>
 *
 * Redis is the source of truth because it survives restarts and is shared
 * across replicas. When Redis is unavailable (local dev, or a Redis outage) the
 * service degrades to an in-memory store: quota is still enforced for the life
 * of the process, and caching still works, just not cluster-wide.
 */
@Service
public class AiQuotaService {

    private static final Logger logger = LoggerFactory.getLogger(AiQuotaService.class);

    private static final String QUOTA_KEY_PREFIX = "manaforge:ai:quota:";
    private static final String CACHE_KEY_PREFIX = "manaforge:ai:cache:";

    private final StringRedisTemplate redis;
    private final int anonymousDailyLimit;
    private final int authenticatedDailyLimit;
    private final Duration cacheTtl;
    private final boolean quotaEnabled;

    /** Fallback counters used only when Redis is unreachable. */
    private final Map<String, AtomicInteger> fallbackQuota = new ConcurrentHashMap<>();
    private final Map<String, String> fallbackCache = new ConcurrentHashMap<>();

    /**
     * Local mapper for the cache payload. Deliberately NOT injected: Spring Boot 4
     * uses Jackson 3 for HTTP, so a Jackson 2 ObjectMapper is not guaranteed to be
     * in the context, and this service only needs to round-trip plain maps.
     */
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    public AiQuotaService(
            StringRedisTemplate redis,
            @Value("${ai.quota.anonymous-daily:5}") int anonymousDailyLimit,
            @Value("${ai.quota.authenticated-daily:25}") int authenticatedDailyLimit,
            @Value("${ai.quota.enabled:true}") boolean quotaEnabled,
            @Value("${ai.cache.ttl-hours:24}") long cacheTtlHours) {
        this.redis = redis;
        this.anonymousDailyLimit = Math.max(0, anonymousDailyLimit);
        this.authenticatedDailyLimit = Math.max(0, authenticatedDailyLimit);
        this.quotaEnabled = quotaEnabled;
        this.cacheTtl = Duration.ofHours(Math.max(1, cacheTtlHours));
    }

    /**
     * Result of a quota check. {@code allowed=false} means the caller has
     * exhausted their daily allowance.
     */
    public record QuotaResult(boolean allowed, int limit, int remaining, Instant resetsAt) {
        public boolean limited() {
            return limit >= 0;
        }
    }

    /**
     * Checks whether {@code identity} may run another analysis, without
     * consuming quota. Call {@link #consume} only once the caller is about to
     * actually invoke the engine, so that cached answers stay free.
     */
    public QuotaResult check(String identity, boolean authenticated) {
        int limit = limitFor(authenticated);
        if (!quotaEnabled || limit <= 0) {
            // A limit of 0 means "disabled": treat as unlimited.
            return new QuotaResult(true, -1, -1, null);
        }

        int used = readCount(quotaKey(identity, authenticated));
        int remaining = Math.max(0, limit - used);
        return new QuotaResult(remaining > 0, limit, remaining, nextReset());
    }

    /**
     * Registers one analysis against the caller's daily allowance.
     * Returns the state remaining after the increment.
     */
    public QuotaResult consume(String identity, boolean authenticated) {
        int limit = limitFor(authenticated);
        if (!quotaEnabled || limit <= 0) {
            return new QuotaResult(true, -1, -1, null);
        }

        String key = quotaKey(identity, authenticated);
        Integer used = redisOps(() -> {
            Long value = redis.opsForValue().increment(key);
            // Only the caller that created the key sets expiry, at the next UTC
            // midnight rather than 24 hours after the first request.
            if (value != null && value == 1L) {
                redis.expire(key, untilReset());
            }
            return value == null ? null : value.intValue();
        }, () -> fallbackQuota.computeIfAbsent(key, k -> new AtomicInteger()).incrementAndGet());

        int usedCount = used == null ? 0 : used;
        int remaining = Math.max(0, limit - usedCount);
        return new QuotaResult(remaining > 0, limit, remaining, nextReset());
    }

    private int limitFor(boolean authenticated) {
        return authenticated ? authenticatedDailyLimit : anonymousDailyLimit;
    }

    /** Backoffice reset affects today's authenticated counter only, never the result cache. */
    public void resetAuthenticatedQuota(String userId) {
        String key = quotaKey(userId, true);
        // Clear local state even when Redis is healthy: an earlier outage may have populated it.
        fallbackQuota.remove(key);
        redisOps(() -> redis.delete(key), () -> false);
    }

    private Integer readCount(String key) {
        return redisOps(
                () -> {
                    String raw = redis.opsForValue().get(key);
                    if (raw == null) return 0;
                    try {
                        return Integer.valueOf(raw);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                },
                () -> fallbackQuota.getOrDefault(key, new AtomicInteger()).get());
    }

    // ── Result cache ───────────────────────────────────────────────────────

    /**
     * Builds a cache key from the analysis inputs. The deck is reduced to a
     * canonical form (sorted "qty name" pairs) so that two users pasting the
     * same list in a different order share one cache entry.
     */
    public String buildCacheKey(Map<String, Object> payload) {
        StringBuilder sb = new StringBuilder();
        sb.append("v1|")
          .append(str(payload.get("format_name")).toLowerCase())
          .append('|')
          .append(str(payload.get("locale")).toLowerCase())
          .append('|');

        appendZone(sb, payload.get("main_deck"));
        sb.append('|');
        appendZone(sb, payload.get("sideboard"));

        return CACHE_KEY_PREFIX + sha256(sb.toString());
    }

    private void appendZone(StringBuilder sb, Object zone) {
        if (!(zone instanceof List<?> list)) {
            sb.append("[]");
            return;
        }
        list.stream()
            .filter(Map.class::isInstance)
            .map(item -> {
                Map<?, ?> m = (Map<?, ?>) item;
                return str(m.get("quantity")) + " " + str(m.get("name")).toLowerCase();
            })
            .sorted()
            .forEach(entry -> sb.append(entry).append(';'));
    }

    private static String str(Object value) {
        return value == null ? "" : value.toString();
    }

    /**
     * Returns a cached analysis, or null on a miss.
     * An unreadable entry is treated as a miss and logged rather than propagated:
     * a corrupt cache must never turn into a 500 for the user.
     */
    public Map<String, Object> getCached(String cacheKey) {
        String json = redisOps(
                () -> redis.opsForValue().get(cacheKey),
                () -> fallbackCache.get(cacheKey));
        if (json == null || json.isBlank()) return null;
        try {
            return MAPPER.readValue(json, MAP_TYPE);
        } catch (Exception e) {
            logger.warn("Discarding unreadable AI analysis cache entry {}: {}", cacheKey, e.getMessage());
            return null;
        }
    }

    /** Stores an analysis result. Serialization failures are swallowed on purpose. */
    public void putCached(String cacheKey, Map<String, Object> analysis) {
        if (analysis == null || analysis.isEmpty()) return;
        String json;
        try {
            json = MAPPER.writeValueAsString(analysis);
        } catch (Exception e) {
            logger.warn("Could not serialize AI analysis for caching: {}", e.getMessage());
            return;
        }
        final String payload = json;
        redisOps(
                () -> {
                    redis.opsForValue().set(cacheKey, payload, cacheTtl);
                    return null;
                },
                () -> {
                    fallbackCache.put(cacheKey, payload);
                    return null;
                });
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Runs a Redis operation, falling back to the in-memory path when Redis is
     * down. Swallowing the connection error here keeps a Redis outage from
     * turning into a total outage of the analysis endpoint.
     */
    private <T> T redisOps(Supplier<T> remote, Supplier<T> local) {
        try {
            return remote.get();
        } catch (Exception e) {
            logger.warn("Redis unavailable for AI quota/cache, using in-memory fallback: {}", e.getMessage());
            return local.get();
        }
    }

    private String quotaKey(String identity, boolean authenticated) {
        return QUOTA_KEY_PREFIX
                + (authenticated ? "user:" : "ip:")
                + hash(identity)
                + ":"
                + LocalDate.now(ZoneOffset.UTC);
    }

    /** Hashes the identity so raw IPs are never written to Redis in the clear. */
    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes, 0, 16);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String sha256(String value) {
        return hash(value);
    }

    /** Quota windows roll over at UTC midnight. */
    private static Instant nextReset() {
        return LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private static Duration untilReset() {
        long seconds = ChronoUnit.SECONDS.between(Instant.now(), nextReset());
        // Always keep a floor so a clock skew cannot create a key with no TTL.
        return Duration.ofSeconds(Math.max(60, seconds));
    }
}
