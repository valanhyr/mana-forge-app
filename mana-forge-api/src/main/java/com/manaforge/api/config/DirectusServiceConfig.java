package com.manaforge.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import com.manaforge.api.service.DirectusService;

@Configuration
public class DirectusServiceConfig {

    @Bean
    public DirectusService directusService(ObjectMapper objectMapper,
                                           RestClient.Builder builder,
                                           @Value("${directus.url:http://directus:8080}") String directusUrl,
                                           @Value("${directus.token:}") String directusToken) {
        // Use provided RestClient.Builder and configuration properties
        return new DirectusService(builder, objectMapper, directusUrl, directusToken);
    }
}
