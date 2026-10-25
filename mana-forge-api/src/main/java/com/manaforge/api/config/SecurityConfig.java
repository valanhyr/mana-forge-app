package com.manaforge.api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authorization.AuthorizationDecision;
import com.manaforge.api.frontdesk.OperatorCsrfTokenRepository;
import com.manaforge.api.frontdesk.OperatorSessionFilter;
import com.manaforge.api.frontdesk.OperatorSessionService;
import com.manaforge.api.service.FrontdeskAccessService;
import org.springframework.core.annotation.Order;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.manaforge.api.service.OAuth2LoginSuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Autowired(required = false)
    private SecurityAuthEntryPoint securityAuthEntryPoint;

    /** Production frontend URL (e.g. https://mana-forge.com). Injected from FRONTEND_URL env var. */
    @Value("${services.frontend.url}")
    private String frontendUrl;

    @Value("${frontdesk.url:}")
    private String frontdeskUrl;

    @Autowired
    private ObjectProvider<FrontdeskAccessService> frontdeskAccess;

    @Autowired
    private ObjectProvider<OperatorSessionService> operatorSessions;

    /**
     * Backoffice chain: stateless, authenticated only by the operator cookie, with its own CSRF token.
     * Public logins, Google and the shared servlet session can never authenticate here, and
     * operator sessions are never visible to the public chain below.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain frontdeskSecurityFilterChain(HttpSecurity http) throws Exception {
        String[] preAuth = {"/api/frontdesk/auth/login", "/api/frontdesk/auth/totp", "/api/frontdesk/auth/recovery",
                "/api/frontdesk/auth/enroll/start", "/api/frontdesk/auth/enroll/confirm"};
        http
            .securityMatcher("/api/frontdesk", "/api/frontdesk/**")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                    .csrfTokenRepository(new OperatorCsrfTokenRepository())
                    .ignoringRequestMatchers(preAuth))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, preAuth).permitAll()
                .anyRequest().access((authentication, context) -> {
                    FrontdeskAccessService access = frontdeskAccess.getIfAvailable();
                    return new AuthorizationDecision(access != null && access.isOperator(authentication.get()));
                })
            )
            .exceptionHandling(e -> e
                    .authenticationEntryPoint(securityAuthEntryPoint != null ? securityAuthEntryPoint : new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            );
        OperatorSessionService sessions = operatorSessions.getIfAvailable();
        if (sessions != null) {
            http.addFilterBefore(new OperatorSessionFilter(sessions), AuthorizationFilter.class);
        }
        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
             // Preserve existing public API behaviour; support and consent writes require CSRF.
            .csrf(csrf -> csrf.requireCsrfProtectionMatcher(new AndRequestMatcher(
                    CsrfFilter.DEFAULT_CSRF_MATCHER,
                     new OrRequestMatcher(PathPatternRequestMatcher.withDefaults().matcher("/api/support/**"),
                             PathPatternRequestMatcher.withDefaults().matcher("/api/newsletter/preference")))))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .securityContext(context -> context.requireExplicitSave(false))
            .authorizeHttpRequests(auth -> auth
                 .requestMatchers(HttpMethod.POST, "/api/newsletter/unsubscribe").permitAll()
                 .requestMatchers("/api/support", "/api/support/**", "/api/newsletter/csrf", "/api/newsletter/preference").authenticated()
                 .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/login", "/api/decks/analyze", "/api/decks/scores", "/api/decks/random", "/api/contact", "/api/feedback", "/api/cards/*/images").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // GET /api/** covers /api/decks/analyze/quota: the homepage reads the
                // remaining AI allowance before the user submits anything, so the
                // quota is never a surprise.
                .requestMatchers(HttpMethod.GET, "/api/**", "/content-service/**", "/decks/**", "/articles/**", "/formats").permitAll()
                .requestMatchers("/error", "/error/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                            .authenticationEntryPoint(securityAuthEntryPoint != null ? securityAuthEntryPoint : new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
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
            .logout(logout -> logout.logoutSuccessHandler((req, res, auth) -> res.setStatus(200)));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Explicit origin allowlist — never use wildcard with credentials.
        // The dev origin (localhost:5173) is always included; the production URL is read from env.
        List<String> allowedOrigins = new java.util.ArrayList<>(List.of("http://localhost:5173", "http://127.0.0.1", frontendUrl));
        if (frontdeskUrl != null && !frontdeskUrl.isBlank()) allowedOrigins.add(frontdeskUrl);
        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Accept", "Accept-Language", "Authorization", "X-CSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
