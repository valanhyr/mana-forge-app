package com.manaforge.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                // Permitir acceso público a los endpoints de registro y login
                .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login").permitAll()
                // Permitir acceso público a la verificación de email
                .requestMatchers(HttpMethod.GET, "/api/users/verify").permitAll()
                // Permitir acceso público a los endpoints de OAuth2
                .requestMatchers("/login/oauth2/**", "/oauth2/**").permitAll()
                // Permitir acceso público a la documentación de la API (Swagger)
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // Todas las demás peticiones requieren autenticación
                .anyRequest().authenticated()
            )
            .oauth2Login(withDefaults()) // Habilitar login con OAuth2 (Google)
            .csrf(csrf -> csrf.disable()); // Deshabilitar CSRF para simplificar (se puede mejorar después)

        return http.build();
    }
}