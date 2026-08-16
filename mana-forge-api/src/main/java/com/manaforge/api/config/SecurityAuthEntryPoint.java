package com.manaforge.api.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Enumeration;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SecurityAuthEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        try {
            StringBuilder sb = new StringBuilder();
            sb.append("AuthenticationEntryPoint triggered for request: ")
              .append(request.getMethod())
              .append(" ")
              .append(request.getRequestURI())
              .append(" headers={");
            Enumeration<String> names = request.getHeaderNames();
            if (names != null) {
                while (names.hasMoreElements()) {
                    String name = names.nextElement();
                    String value = "cookie".equalsIgnoreCase(name) ? "<cookie>" : request.getHeader(name);
                    sb.append(name).append(": ").append(value).append(", ");
                }
            }
            sb.append("}");
            log.warn(sb.toString());
            log.warn("Authentication failure reason: {}", authException == null ? "<none>" : authException.getMessage());
        } catch (Exception e) {
            log.warn("Failed to log authentication entry point details", e);
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }
}
