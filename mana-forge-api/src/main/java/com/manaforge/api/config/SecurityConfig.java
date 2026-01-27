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
            // Permitimos el acceso a todas las rutas para que tu UserController maneje la lógica
            .authorizeHttpRequests(auth -> auth
                // 1. Endpoints POST públicos específicos (Login, Registro, Herramientas IA)
                .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login", "/api/decks/analyze", "/api/decks/random").permitAll()
                
                // 2. Todo lo que sea lectura (GET) es público (Web anónima)
                .requestMatchers(HttpMethod.GET, "/api/**").permitAll()

                // 3. Todo lo demás (POST, PUT, DELETE en mazos, usuarios, cartas) requiere Login
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173")); // Tu frontend
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}