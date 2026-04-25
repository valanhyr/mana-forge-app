package com.manaforge.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableAsync
public class WebConfig implements WebMvcConfigurer {

    @Autowired(required = false)
    private RateLimitingInterceptor rateLimitingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (rateLimitingInterceptor != null) {
            registry.addInterceptor(rateLimitingInterceptor)
                    .addPathPatterns(
                        "/api/users/login",
                        "/api/decks/analyze",
                        "/api/decks/random",
                        "/api/decks/scores",
                        "/api/contact"
                    );
        }
    }
}