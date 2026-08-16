package com.manaforge.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(Integer.MIN_VALUE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("Incoming request: ")
              .append(request.getMethod())
              .append(" ")
              .append(request.getRequestURI());

            String query = request.getQueryString();
            if (query != null) sb.append('?').append(query);

            sb.append(" Headers={");
            Enumeration<String> names = request.getHeaderNames();
            if (names != null) {
                while (names.hasMoreElements()) {
                    String name = names.nextElement();
                    // hide cookie values for safety
                    String value = "Cookie".equalsIgnoreCase(name) ? "<cookie>" : request.getHeader(name);
                    sb.append(name).append(": ").append(value).append(", ");
                }
            }
            sb.append("}");
            log.info(sb.toString());
        } catch (Exception e) {
            log.warn("Failed to log request headers", e);
        }

        filterChain.doFilter(request, response);

        // Log response status for easier tracing
        log.info("Response for {} {} -> {}", request.getMethod(), request.getRequestURI(), response.getStatus());
    }
}
