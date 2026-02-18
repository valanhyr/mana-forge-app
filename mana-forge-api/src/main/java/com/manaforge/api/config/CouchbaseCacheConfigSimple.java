package com.manaforge.api.config;

import com.couchbase.client.java.Cluster;
import com.couchbase.client.java.ClusterOptions;
import com.couchbase.client.java.env.ClusterEnvironment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.couchbase.CouchbaseClientFactory;
import org.springframework.data.couchbase.SimpleCouchbaseClientFactory;
import org.springframework.data.couchbase.cache.CouchbaseCacheConfiguration;
import org.springframework.data.couchbase.cache.CouchbaseCacheManager;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

// @Configuration - DESACTIVADA: Usar CacheConfig.java en su lugar
// @EnableCaching
public class CouchbaseCacheConfigSimple {

    @Value("${spring.couchbase.connection-string}")
    private String connectionString;

    @Value("${spring.couchbase.username}")
    private String username;

    @Value("${spring.couchbase.password}")
    private String password;

    @Value("${spring.couchbase.bucket-name}")
    private String bucketName;

    @Bean
    public Cluster couchbaseCluster() {
        ClusterEnvironment environment = ClusterEnvironment.builder().build();
        return Cluster.connect(
            connectionString,
            ClusterOptions.clusterOptions(username, password).environment(environment)
        );
    }

    @Bean
    public CouchbaseClientFactory couchbaseClientFactory(Cluster cluster) {
        return new SimpleCouchbaseClientFactory(cluster, bucketName, "_default");
    }

    @Bean
    public CacheManager cacheManager(CouchbaseClientFactory couchbaseClientFactory) {
        CouchbaseCacheConfiguration defaultConfig = CouchbaseCacheConfiguration
                .defaultCacheConfig()
                .entryExpiry(Duration.ofHours(1));

        Map<String, CouchbaseCacheConfiguration> cacheConfigurations = new HashMap<>();
        
        // Caché de Strapi - 6 horas
        cacheConfigurations.put("footer", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("footer-legal", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("heros", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("sections", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("languages", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("formats", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("format-detail", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(6)));
        cacheConfigurations.put("articles-latest", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(2)));
        cacheConfigurations.put("article-detail", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(2)));
        
        // Caché de Scryfall - 24 horas
        cacheConfigurations.put("scryfall_search", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));
        cacheConfigurations.put("scryfall_card", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));
        cacheConfigurations.put("scryfall_symbology", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));
        cacheConfigurations.put("scryfall_named", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));
        cacheConfigurations.put("scryfall_autocomplete", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));
        
        // Caché de Premodern - 24 horas
        cacheConfigurations.put("premodern_banned", CouchbaseCacheConfiguration.defaultCacheConfig()
                .entryExpiry(Duration.ofHours(24)));

        return CouchbaseCacheManager.builder(couchbaseClientFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }
}
