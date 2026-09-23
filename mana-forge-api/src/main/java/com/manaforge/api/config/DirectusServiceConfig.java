package com.manaforge.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import com.manaforge.api.service.DirectusService;

@Configuration
public class DirectusServiceConfig {

    @Bean
    public DirectusService directusService(ObjectMapper objectMapper) {
        // Provide a simple RestClient.Builder using default builder
        RestClient.Builder builder = RestClient.builder();
        return new DirectusService(builder, objectMapper, "http://localhost:9055", "");
    }
}
