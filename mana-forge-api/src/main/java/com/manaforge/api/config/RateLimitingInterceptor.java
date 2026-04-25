package com.manaforge.api.config;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * In-memory IP-based rate limiter for sensitive endpoints.
 *
 * Limits per client IP:
 *  - /api/users/login    → 10 requests / minute
 *  - /api/decks/analyze  → 5  requests / minute
 *  - /api/decks/random   → 5  requests / minute
 *  - /api/decks/scores   → 5  requests / minute
 *  - /api/contact        → 5  requests / minute
 *
 * Uses Bucket4j token-bucket algorithm (in-memory, no external state).
 * Note: This does not survive restarts and is not shared across instances.
 * For multi-instance deployments, replace the ConcurrentHashMap with a
 * Redis-backed ProxyManager.
 */
@Component
@Profile("!test")
public class RateLimitingInterceptor implements HandlerInterceptor {

    private static final int LOGIN_CAPACITY = 10;
    private static final int AI_CAPACITY = 5;
    private static final Duration REFILL_PERIOD = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> aiBuckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI();
        String ip = resolveClientIp(request);

        Bucket bucket = switch (path) {
            case "/api/users/login" -> loginBuckets.computeIfAbsent(ip, k -> newBucket(LOGIN_CAPACITY));
            case "/api/decks/analyze", "/api/decks/random", "/api/decks/scores", "/api/contact"
                    -> aiBuckets.computeIfAbsent(ip, k -> newBucket(AI_CAPACITY));
            default -> null;
        };

        if (bucket != null && !bucket.tryConsume(1)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
            return false;
        }

        return true;
    }

    private Bucket newBucket(int capacity) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, REFILL_PERIOD)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    /** Extracts real client IP, respecting X-Forwarded-For when behind a proxy. */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
