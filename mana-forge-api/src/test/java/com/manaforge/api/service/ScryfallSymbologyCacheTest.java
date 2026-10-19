package com.manaforge.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringJUnitConfig(ScryfallSymbologyCacheTest.Config.class)
class ScryfallSymbologyCacheTest {

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("scryfall_symbology");
        }

        @Bean
        RestTemplate restTemplate() {
            return mock(RestTemplate.class);
        }

        @Bean
        ScryfallService scryfallService(RestTemplate restTemplate) {
            return new ScryfallService(restTemplate);
        }
    }

    @Autowired
    private ScryfallService scryfallService;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void clean() {
        cacheManager.getCache("scryfall_symbology").clear();
        reset(restTemplate);
    }

    @Test
    void getSymbology_doesNotCacheTheEmptyFallbackWhenScryfallFails() {
        Map<String, Object> symbols = Map.of(
                "object", "list",
                "data", List.of(Map.of("symbol", "{R}", "svg_uri", "https://svgs.scryfall.io/card-symbols/R.svg")));
        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenThrow(new RuntimeException("scryfall down"))
                .thenReturn(symbols);

        Map<String, Object> first = scryfallService.getSymbology();
        Map<String, Object> second = scryfallService.getSymbology();

        assertThat((List<?>) first.get("data")).isEmpty();
        assertThat((List<?>) second.get("data")).hasSize(1);
        verify(restTemplate, times(2)).getForObject(anyString(), eq(Map.class));
    }

    @Test
    void getSymbology_cachesASuccessfulResponse() {
        Map<String, Object> symbols = Map.of(
                "object", "list",
                "data", List.of(Map.of("symbol", "{W}", "svg_uri", "https://svgs.scryfall.io/card-symbols/W.svg")));
        when(restTemplate.getForObject(anyString(), eq(Map.class))).thenReturn(symbols);

        scryfallService.getSymbology();
        scryfallService.getSymbology();

        verify(restTemplate, times(1)).getForObject(anyString(), eq(Map.class));
    }
}
