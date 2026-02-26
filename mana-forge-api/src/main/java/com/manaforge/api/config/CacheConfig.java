package com.manaforge.api.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger logger = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL,
            JsonTypeInfo.As.PROPERTY
        );

        RedisSerializer<Object> serializer = new RedisSerializer<>() {
            @Override
            public byte[] serialize(Object value) throws SerializationException {
                if (value == null) return new byte[0];
                try {
                    return mapper.writeValueAsBytes(value);
                } catch (Exception e) {
                    throw new SerializationException("Could not serialize object", e);
                }
            }
            @Override
            public Object deserialize(byte[] bytes) throws SerializationException {
                if (bytes == null || bytes.length == 0) return null;
                try {
                    return mapper.readValue(bytes, Object.class);
                } catch (Exception e) {
                    throw new SerializationException("Could not deserialize bytes", e);
                }
            }
        };

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .serializeValuesWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                );

        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // Caché de Strapi - 30 días
        addCacheConfig(cacheConfigurations, List.of(
            "footer", "footer-legal", "heros", "sections", "languages",
            "formats", "format-detail"
        ), Duration.ofDays(30), serializer);

        // Caché de artículos - 30 días
        addCacheConfig(cacheConfigurations, List.of(
            "articles-latest", "article-detail"
        ), Duration.ofDays(30), serializer);

        // Caché de Scryfall - 24 horas
        addCacheConfig(cacheConfigurations, List.of(
            "scryfall_search", "scryfall_card", "scryfall_symbology",
            "scryfall_named", "scryfall_autocomplete"
        ), Duration.ofHours(24), serializer);

        // Caché de Premodern - 24 horas
        addCacheConfig(cacheConfigurations, List.of("premodern_banned"), Duration.ofHours(24), serializer);

        logger.info("✅ RedisCacheManager created with {} cache configurations", cacheConfigurations.size());

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }

    private void addCacheConfig(Map<String, RedisCacheConfiguration> configs, List<String> cacheNames,
                                Duration ttl, RedisSerializer<Object> serializer) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(ttl)
                .serializeValuesWith(
                    RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                );
        for (String cacheName : cacheNames) {
            configs.put(cacheName, config);
        }
    }
}