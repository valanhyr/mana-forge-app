package com.manaforge.api.service;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.model.mongo.AuditEvent;
import org.springframework.security.core.context.SecurityContextHolder;
import com.manaforge.api.repository.UserRepository;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailEncryptionService emailEncryptionService;

    @Value("${services.frontend.url}")
    private String frontendUrl;

    @Autowired(required = false)
    private FrontdeskAuditService frontdeskAudit;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String encryptedEmail = emailEncryptionService.encrypt(email);

        var existingUser = userRepository.findByEmail(encryptedEmail);
        boolean isNewUser = existingUser.isEmpty();
        User user;
        if (isNewUser) {
            String givenName = oAuth2User.getAttribute("given_name");
            String baseUsername = (givenName != null && !givenName.isBlank())
                ? givenName.strip()
                : email.split("@")[0];

            // Ensure username is unique by appending a numeric suffix when a collision exists.
            String username = baseUsername;
            int suffix = 1;
            while (userRepository.findByUsername(username).isPresent()) {
                username = baseUsername + suffix;
                suffix++;
            }

            User newUser = new User();
            newUser.setEmail(encryptedEmail);
            newUser.setUsername(username);
            newUser.setName(name);
            newUser.setActive(true);
            newUser.setPassword("");
            newUser.setValidated(true);
            newUser.setBetaAccepted(false);
            newUser.setFriends(new String[0]);
            newUser.setBiography("");
            newUser.setAvatar(User.DEFAULT_AVATAR);
            newUser.setCreatedAt(Instant.now());
            newUser.setLastLoginAt(newUser.getCreatedAt());
            userRepository.save(newUser);
            user = newUser;
        } else {
            user = existingUser.get();
            if (user.effectiveStatus() != User.AccountStatus.ACTIVE) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                response.sendError(403, "Account is not active");
                return;
            }
            user.setLastLoginAt(Instant.now());
            userRepository.updateLastLoginAt(user.getId(), user.getLastLoginAt());
        }

        if (frontdeskAudit != null) {
            frontdeskAudit.record(new AuditEvent.Actor(user.getId(), user.getUsername(), "USER"),
                    user.getId(), user.getUsername(), AuditEvent.Action.USER_LOGIN, "Google login", Map.of());
        }

        String redirect = isNewUser ? frontendUrl + "/profile?beta_welcome=true" : frontendUrl + "/";
        response.sendRedirect(redirect);
    }
}

