package com.manaforge.api.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.couchbase.CouchbaseClientFactory;
import org.springframework.data.couchbase.SimpleCouchbaseClientFactory;
import org.springframework.data.couchbase.cache.CouchbaseCacheConfiguration;
import org.springframework.data.couchbase.cache.CouchbaseCacheManager;

import com.couchbase.client.java.Cluster;
import com.couchbase.client.java.ClusterOptions;

@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger logger = LoggerFactory.getLogger(CacheConfig.class);

    @Value("${spring.couchbase.connection-string:}")
    private String connectionString;

    @Value("${spring.couchbase.username:}")
    private String username;

    @Value("${spring.couchbase.password:}")
    private String password;

    @Value("${spring.couchbase.bucket-name:manaforge-cache}")
    private String bucketName;

    @Bean
    public CacheManager cacheManager() {
        // Intentar conectar a Couchbase, con fallback a cache simple en memoria
        try {
            if (connectionString != null && !connectionString.isEmpty()) {
                logger.info("🔄 Attempting to connect to Couchbase at: {}", connectionString);
                
                Cluster cluster = Cluster.connect(
                    connectionString,
                    ClusterOptions.clusterOptions(username, password)
                );
                
                CouchbaseClientFactory clientFactory = new SimpleCouchbaseClientFactory(cluster, bucketName, "_default");
                
                logger.info("✅ Successfully connected to Couchbase bucket: {}", bucketName);
                
                return createCouchbaseCacheManager(clientFactory);
            }
        } catch (Exception e) {
            logger.error("❌ Failed to connect to Couchbase: {}. Falling back to in-memory cache.", e.getMessage());
        }
        
        // Fallback a caché en memoria si Couchbase falla o no está configurado
        logger.warn("⚠️ Using in-memory cache instead of Couchbase");
        return createSimpleCacheManager();
    }

    private CacheManager createCouchbaseCacheManager(CouchbaseClientFactory clientFactory) {
        CouchbaseCacheConfiguration defaultConfig = CouchbaseCacheConfiguration
                .defaultCacheConfig()
                .entryExpiry(Duration.ofHours(1));

        Map<String, CouchbaseCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Caché de Strapi - 6 horas
        addCacheConfig(cacheConfigurations, List.of(
            "footer", "footer-legal", "heros", "sections", "languages", 
            "formats", "format-detail"
        ), Duration.ofHours(6));
        
        // Caché de artículos - 2 horas
        addCacheConfig(cacheConfigurations, List.of(
            "articles-latest", "article-detail"
        ), Duration.ofHours(2));
        
        // Caché de Scryfall - 24 horas
        addCacheConfig(cacheConfigurations, List.of(
            "scryfall_search", "scryfall_card", "scryfall_symbology", 
            "scryfall_named", "scryfall_autocomplete"
        ), Duration.ofHours(24));
        
        // Caché de Premodern - 24 horas
        addCacheConfig(cacheConfigurations, List.of("premodern_banned"), Duration.ofHours(24));

        CouchbaseCacheManager cacheManager = CouchbaseCacheManager.builder(clientFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
        
        logger.info("✅ CouchbaseCacheManager created with {} cache configurations", cacheConfigurations.size());
        return cacheManager;
    }

    private void addCacheConfig(Map<String, CouchbaseCacheConfiguration> configs, List<String> cacheNames, Duration ttl) {
        for (String cacheName : cacheNames) {
            configs.put(cacheName, CouchbaseCacheConfiguration.defaultCacheConfig().entryExpiry(ttl));
        }
    }

    private CacheManager createSimpleCacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        cacheManager.setCacheNames(List.of(
            "footer", "footer-legal", "heros", "sections", "languages", 
            "formats", "format-detail", "articles-latest", "article-detail",
            "scryfall_search", "scryfall_card", "scryfall_symbology", 
            "scryfall_named", "scryfall_autocomplete", "premodern_banned"
        ));
        return cacheManager;
    }
}