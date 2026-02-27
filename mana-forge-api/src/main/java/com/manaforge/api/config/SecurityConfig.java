package com.manaforge.api.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Configuración de CORS explícita para Spring Security
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Deshabilitamos CSRF porque es una API REST sin estado de sesión de navegador estándar
            .csrf(AbstractHttpConfigurer::disable)
            // Gestión de sesiones: IF_REQUIRED crea sesión solo si es necesario (login), no para anónimos
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            // IMPORTANTE: Permitir que el contexto de seguridad se cargue automáticamente desde la sesión
            // incluso en rutas permitAll(). Sin esto, Spring Security 6 no carga el contexto en rutas públicas.
            .securityContext(context -> context.requireExplicitSave(false))
            // Permitimos el acceso a todas las rutas para que tu UserController maneje la lógica
            .authorizeHttpRequests(auth -> auth
                // 1. Endpoints POST y DELETE públicos específicos
                .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login", "/api/decks/analyze", "/api/decks/random").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/articles/cache", "/api/formats/cache", "/api/v1/content/cache").permitAll()
                
                // 2. Todo lo que sea lectura (GET) es público (Web anónima)
                .requestMatchers(HttpMethod.GET, "/api/**", "/content-service/**").permitAll()

                // 3. Todo lo demás (POST, PUT, DELETE en mazos, usuarios, cartas) requiere Login
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*")); // Permite cualquier origen en desarrollo
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}