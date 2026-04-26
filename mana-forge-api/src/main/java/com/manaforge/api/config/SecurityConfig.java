package com.manaforge.api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.manaforge.api.service.OAuth2LoginSuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    /** Production frontend URL (e.g. https://mana-forge.com). Injected from FRONTEND_URL env var. */
    @Value("${services.frontend.url}")
    private String frontendUrl;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .securityContext(context -> context.securityContextRepository(securityContextRepository()))
            .authorizeHttpRequests(auth -> auth
                // Públicos POST
                .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login", "/api/users/logout", "/api/decks/analyze", "/api/decks/scores", "/api/decks/random", "/api/contact").permitAll()
                // Públicos GET (Contenido)
                .requestMatchers(HttpMethod.GET, "/api/decks/**", "/api/articles/**", "/api/formats/**", "/api/cards/**", "/api/legal/**").permitAll()
                .requestMatchers("/actuator/health", "/content-service/**").permitAll()
                // El resto (incluyendo /api/users/me y listados de usuarios) requiere AUTH
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .oauth2Login(oauth -> oauth
                .authorizationEndpoint(auth -> auth
                    .baseUri("/api/oauth2/authorization")
                )
                .redirectionEndpoint(redirect -> redirect
                    .baseUri("/api/login/oauth2/code/*")
                )
                .successHandler(oAuth2LoginSuccessHandler)
            )
            .logout(logout -> logout
                .logoutUrl("/api/users/logout")
                .logoutSuccessHandler((req, res, auth) -> res.setStatus(200))
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Explicit origin allowlist — never use wildcard with credentials.
        // The dev origin (localhost:5173), Docker local (localhost) and production URL are included.
        List<String> allowedOrigins = List.of("http://localhost:5173", "http://localhost", frontendUrl);
        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "Accept-Language", "Authorization"));
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}