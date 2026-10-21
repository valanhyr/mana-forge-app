package com.manaforge.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Covers the two behaviours that protect the AI budget: canonical cache keys and
 * graceful degradation when Redis is unavailable (local dev, or a Redis outage
 * must not turn the analysis endpoint into a 500).
 */
class AiQuotaServiceTest {

    private StringRedisTemplate redis;
    private AiQuotaService service;

    @Test
    void authenticatedResetDoesNotResetOtherUsersAnonymousQuotaOrResultCache() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis down"));
        service.consume("u1", true);
        service.consume("u2", true);
        service.consume("u1", false);
        service.putCached("result-key", Map.of("summary", "cached"));
        service.resetAuthenticatedQuota("u1");
        assertThat(service.check("u1", true).remaining()).isEqualTo(25);
        assertThat(service.check("u2", true).remaining()).isEqualTo(24);
        assertThat(service.check("u1", false).remaining()).isEqualTo(4);
        assertThat(service.getCached("result-key")).containsEntry("summary", "cached");
    }

    private static Map<String, Object> deck(String format, String locale, Object... cards) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("format_name", format);
        payload.put("locale", locale);
        payload.put("main_deck", List.of(cards));
        payload.put("sideboard", List.of());
        return payload;
    }

    @BeforeEach
    void setUp() {
        redis = org.mockito.Mockito.mock(StringRedisTemplate.class);
        service = new AiQuotaService(redis, 5, 25, true, 24);
    }

    @Test
    @DisplayName("cache key ignores card ordering so identical decks share one entry")
    void cacheKey_isOrderIndependent() {
        String a = service.buildCacheKey(deck("Premodern", "es",
                Map.of("name", "Lightning Bolt", "quantity", 4),
                Map.of("name", "Duress", "quantity", 2)));
        String b = service.buildCacheKey(deck("Premodern", "es",
                Map.of("name", "Duress", "quantity", 2),
                Map.of("name", "Lightning Bolt", "quantity", 4)));
        assertThat(a).isEqualTo(b);
    }

    @Test
    @DisplayName("cache key separates formats and locales")
    void cacheKey_separatesFormatAndLocale() {
        String es = service.buildCacheKey(deck("Premodern", "es", Map.of("name", "Bolt", "quantity", 4)));
        String en = service.buildCacheKey(deck("Premodern", "en", Map.of("name", "Bolt", "quantity", 4)));
        String other = service.buildCacheKey(deck("Legacy", "es", Map.of("name", "Bolt", "quantity", 4)));
        assertThat(es).isNotEqualTo(en).isNotEqualTo(other);
    }

    @Test
    @DisplayName("cache key changes when a card count changes")
    void cacheKey_sensitiveToQuantities() {
        String four = service.buildCacheKey(deck("Premodern", "es", Map.of("name", "Bolt", "quantity", 4)));
        String three = service.buildCacheKey(deck("Premodern", "es", Map.of("name", "Bolt", "quantity", 3)));
        assertThat(four).isNotEqualTo(three);
    }

    @Test
    @DisplayName("cache key never contains the raw decklist")
    void cacheKey_doesNotLeakCardNames() {
        String key = service.buildCacheKey(deck("Premodern", "es", Map.of("name", "Secret Card", "quantity", 1)));
        assertThat(key).startsWith("manaforge:ai:cache:").doesNotContain("Secret Card");
    }

    @Test
    @DisplayName("quota is denied once the daily allowance is spent, even without Redis")
    void quota_isEnforcedOnInMemoryFallback() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis down"));

        AiQuotaService.QuotaResult first = service.check("1.2.3.4", false);
        assertThat(first.allowed()).isTrue();
        assertThat(first.remaining()).isEqualTo(5);

        for (int i = 0; i < 5; i++) {
            service.consume("1.2.3.4", false);
        }

        AiQuotaService.QuotaResult exhausted = service.check("1.2.3.4", false);
        assertThat(exhausted.allowed()).isFalse();
        assertThat(exhausted.remaining()).isZero();
    }

    @Test
    @DisplayName("anonymous and authenticated quotas are tracked separately")
    void quota_separatesAnonymousFromAuthenticated() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis down"));

        for (int i = 0; i < 5; i++) {
            service.consume("1.2.3.4", false);
        }
        assertThat(service.check("1.2.3.4", false).allowed()).isFalse();

        // Same network identity, but signed in: the authenticated allowance applies.
        assertThat(service.check("user-42", true).allowed()).isTrue();
        assertThat(service.check("user-42", true).limit()).isEqualTo(25);
    }

    @Test
    @DisplayName("quota is unlimited when disabled")
    void quota_disabled_meansUnlimited() {
        AiQuotaService disabled = new AiQuotaService(redis, 5, 25, false, 24);
        AiQuotaService.QuotaResult result = disabled.check("1.2.3.4", false);
        assertThat(result.allowed()).isTrue();
        assertThat(result.limited()).isFalse();
    }

    @Test
    @DisplayName("cache still works on the in-memory fallback when Redis is down")
    void cache_fallsBackToMemory() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis down"));

        Map<String, Object> analysis = Map.of("general_summary", "ok");
        service.putCached("key", analysis);

        assertThat(service.getCached("key")).containsEntry("general_summary", "ok");
    }

    @Test
    @DisplayName("a Redis outage on read is treated as a cache miss, not an error")
    void cache_readFailureIsACacheMiss() {
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("redis down"));
        assertThat(service.getCached("key")).isNull();
    }

    @Test
    @DisplayName("a corrupt cache entry is discarded instead of surfacing as a 500")
    void cache_corruptEntryBecomesMiss() {
        var ops = org.mockito.Mockito.mock(org.springframework.data.redis.core.ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.get(anyString())).thenReturn("{not json");

        assertThat(service.getCached("key")).isNull();
    }

    @Test
    @DisplayName("empty analyses are never written to the cache")
    void cache_skipsEmptyPayloads() {
        var ops = org.mockito.Mockito.mock(org.springframework.data.redis.core.ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);

        service.putCached("key", Map.of());

        org.mockito.Mockito.verify(ops, org.mockito.Mockito.never()).set(anyString(), anyString(), any());
    }
}
