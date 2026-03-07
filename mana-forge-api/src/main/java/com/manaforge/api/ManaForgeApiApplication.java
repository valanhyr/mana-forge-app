package com.manaforge.api;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.AbstractHttpMessageConverter;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.client.RestTemplate;

import com.manaforge.api.service.OAuth2LoginSuccessHandler;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@SpringBootApplication
public class ManaForgeApiApplication {

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

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
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public SecurityFilterChain publicSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/**") 
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Añadimos explícitamente el endpoint /me para que el front no se asuste al arrancar
                .requestMatchers("/api/users/me", "/api/**", "/login/**", "/oauth2/**").permitAll()
                .anyRequest().permitAll()
            )
            // Mantenemos el comentario en exceptionHandling para evitar el 401 forzado
            /* .exceptionHandling(e -> e
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            ) */
            .oauth2Login(oauth -> oauth
                .authorizationEndpoint(auth -> auth
                    .baseUri("/api/oauth2/authorization")
                )
                .redirectionEndpoint(redirect -> redirect
                    .baseUri("/api/login/oauth2/code/*")
                )
                .successHandler(oAuth2LoginSuccessHandler)
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
}