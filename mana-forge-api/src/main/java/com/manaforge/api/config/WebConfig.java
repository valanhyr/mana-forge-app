package com.manaforge.api.config;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.service.FrontdeskAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableAsync
public class WebConfig implements WebMvcConfigurer {

    @Autowired(required = false)
    private RateLimitingInterceptor rateLimitingInterceptor;

    @Autowired
    private ObjectProvider<FrontdeskAccessService> accountAccess;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                var access = accountAccess.getIfAvailable();
                if (access != null) {
                    access.resolve(SecurityContextHolder.getContext().getAuthentication())
                            .filter(user -> user.effectiveStatus() != User.AccountStatus.ACTIVE)
                            .ifPresent(user -> {
                                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
                            });
                }
                return true;
            }
        }).addPathPatterns("/api/**").excludePathPatterns("/api/users/logout", "/api/newsletter/unsubscribe");
        if (rateLimitingInterceptor != null) {
            registry.addInterceptor(rateLimitingInterceptor)
                    .addPathPatterns(
                        "/api/users/login",
                        "/api/users/me/password",
                        "/api/decks/analyze",
                        "/api/decks/random",
                        "/api/decks/scores",
                        "/api/contact",
                        "/api/support/**"
                    );
        }
    }
}
