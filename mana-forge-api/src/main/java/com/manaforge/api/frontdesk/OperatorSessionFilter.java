package com.manaforge.api.frontdesk;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates backoffice requests from the operator cookie alone. Deliberately not a Spring bean:
 * it is created by the Frontdesk security chain so it can never run on public endpoints.
 */
public class OperatorSessionFilter extends OncePerRequestFilter {
    private final OperatorSessionService sessions;

    public OperatorSessionFilter(OperatorSessionService sessions) {
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        String token = cookie(request);
        if (token != null) {
            sessions.authenticate(token).ifPresent(principal -> context.setAuthentication(new OperatorAuthenticationToken(principal)));
        }
        SecurityContextHolder.setContext(context);
        chain.doFilter(request, response);
    }

    private static String cookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (OperatorSessionCookie.NAME.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
