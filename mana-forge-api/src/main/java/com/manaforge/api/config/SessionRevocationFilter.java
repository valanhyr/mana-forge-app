package com.manaforge.api.config;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Invalidates HTTP session if it was created before the user's password change time.
 * This provides session revocation after password reset.
 */
@Component
@ConditionalOnBean(UserRepository.class)
@RequiredArgsConstructor
public class SessionRevocationFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && request.getSession(false) != null) {
            Object principal = auth.getPrincipal();
            try {
                String username = null;
                if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                    username = ud.getUsername();
                } else if (principal != null) {
                    username = principal.toString();
                }
                if (username != null) {
                    User user = userRepository.findByUsername(username).orElse(null);
                    if (user != null && user.getPasswordChangedAt() != null) {
                        Instant changed = user.getPasswordChangedAt();
                        Instant sessionCreation = Instant.ofEpochMilli(request.getSession().getCreationTime());
                        if (sessionCreation.isBefore(changed)) {
                            request.getSession().invalidate();
                            SecurityContextHolder.clearContext();
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            return;
                        }
                    }
                }
            } catch (Exception e) {
                // ignore - don't block request on filter failure
            }
        }
        filterChain.doFilter(request, response);
    }
}
