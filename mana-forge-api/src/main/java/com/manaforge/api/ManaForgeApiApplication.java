package com.manaforge.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@SpringBootApplication
@EnableCaching
@EnableScheduling
public class ManaForgeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManaForgeApiApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setSupportedMediaTypes(List.of(MediaType.APPLICATION_JSON, MediaType.TEXT_HTML));
        restTemplate.getMessageConverters().add(0, converter);
        return restTemplate;
    }

    @Bean("scryfallCacheManager")
    @Primary
    public CacheManager scryfallCacheManager() {
        return new ConcurrentMapCacheManager(
                "scryfall_search", "scryfall_card", "scryfall_symbology", "scryfall_named", "scryfall_autocomplete",
                // Strapi Caches
                "footer", "footer-legal", "heros", "sections", "languages", "formats", "format-detail", "premodern_banned"
        );
    }

    // Limpia la caché cada 30 minutos (1800000 ms) para liberar RAM
    @Scheduled(fixedRate = 1800000)
    public void evictAllCachesAtIntervals() {
        scryfallCacheManager().getCacheNames().stream()
                .map(scryfallCacheManager()::getCache)
                .forEach(org.springframework.cache.Cache::clear);
    }
}