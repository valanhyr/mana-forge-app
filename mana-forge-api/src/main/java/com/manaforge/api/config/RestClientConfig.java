package com.manaforge.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig  {

    @Value("${strapi.api.token:}")
    private String strapiApiToken;

    @Value("${strapi.api.url:http://localhost:1337/api}")
    private String strapiApiUrl;

    @Bean
    public RestClient.Builder restClientBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(strapiApiUrl)
                .requestFactory(factory);
        if (strapiApiToken != null && !strapiApiToken.isEmpty()) {
            builder = builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + strapiApiToken);
        }
        return builder;
    }

    @Bean
    public RestClient restClient(RestClient.Builder builder) {
        return builder.build();
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}