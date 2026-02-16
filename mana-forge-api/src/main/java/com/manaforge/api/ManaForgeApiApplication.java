package com.manaforge.api;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.web.client.RestTemplate;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

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

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain publicSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/**") // Al estar bajo /api, esto significa realmente /api/**
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults()) // Si tienes config de CORS, actívala
            .authorizeHttpRequests(auth -> auth
                // Spring ya sabe que está en /api, así que aquí no hace falta ponerlo
                // Restauramos la configuración permisiva para eliminar los 401 en endpoints públicos
                .requestMatchers("/oauth2/**", "/login/**", "/decks/**", "/cards/**", "/formats/**").permitAll()
                .anyRequest().permitAll()
            )
            // IMPORTANTE: Devuelve 401 en lugar de redirigir a Google si no hay sesión.
            // Esto evita los errores de CORS en el frontend.
            .exceptionHandling(e -> e
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            // .requiresChannel(channel -> channel.anyRequest().requiresSecure()) // Desactivado temporalmente para diagnosticar el 502.
            .oauth2Login(oauth -> oauth
                .successHandler(new SimpleUrlAuthenticationSuccessHandler("https://mana-forge.com"))
            )
            .logout(logout -> logout.logoutSuccessHandler((req, res, auth) -> res.setStatus(200)));
        return http.build();
    }

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Mana Forge API")
                        .version("1.0.0")
                        .description("Documentación de la API de Mana Forge"));
    }

    @Bean("scryfallCacheManager")
    @Primary
    public CacheManager scryfallCacheManager() {
        return new ConcurrentMapCacheManager(
                "scryfall_search", "scryfall_card", "scryfall_symbology", "scryfall_named", "scryfall_autocomplete",
                // Strapi Caches
                "footer", "footer-legal", "heros", "sections", "languages", "formats", "format-detail", "premodern_banned",
                "article-detail", "articles-latest"
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