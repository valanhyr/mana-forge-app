package com.manaforge.api;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.web.client.RestTemplate;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@SpringBootApplication
@EnableScheduling
public class ManaForgeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManaForgeApiApplication.class, args);
    }

    @Bean
    @Primary
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getMessageConverters().stream()
                .filter(c -> c.getSupportedMediaTypes().contains(MediaType.APPLICATION_JSON))
                .filter(c -> c instanceof AbstractHttpMessageConverter)
                .map(c -> (AbstractHttpMessageConverter<?>) c)
                .findFirst()
                .ifPresent(c -> {
                    List<MediaType> types = new ArrayList<>(c.getSupportedMediaTypes());
                    types.add(MediaType.TEXT_HTML);
                    c.setSupportedMediaTypes(types);
                });
        return restTemplate;
    }

    /**
     * Dedicated RestTemplate for the AI engine with a long read timeout.
     * AI calls (generation + review pass) can take 60-120 seconds.
     */
    @Bean("aiRestTemplate")
    public RestTemplate aiRestTemplate(
            @Value("${services.python-engine.timeout:120000}") int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Mana Forge API")
                        .version("1.0.0")
                        .description("Documentación de la API de Mana Forge"));
    }
}