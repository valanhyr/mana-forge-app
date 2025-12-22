package com.manaforge.api.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // Esto crea un almacén de caché simple en la memoria RAM del servidor
        return new ConcurrentMapCacheManager("footer", "heros", "sections", "languages", "footer-legal");
    }
}