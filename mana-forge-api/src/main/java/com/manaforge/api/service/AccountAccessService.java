package com.manaforge.api.service;

import java.util.Optional;
import com.manaforge.api.frontdesk.OperatorAuthenticationToken;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Resolves the public customer account behind a session. Operator sessions are never customers. */
@Service
@RequiredArgsConstructor
public class AccountAccessService {
    private final UserRepository users;
    private final EmailEncryptionService encryption;

    public Optional<User> resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication instanceof OperatorAuthenticationToken) return Optional.empty();
        if (authentication.getPrincipal() instanceof OAuth2User oauth) {
            String email = oauth.getAttribute("email");
            return email == null ? Optional.empty() : users.findByEmail(encryption.encrypt(email));
        }
        return users.findByUsername(authentication.getName());
    }

    public User requireAccount(Authentication authentication) {
        User user = resolve(authentication)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.effectiveStatus() != User.AccountStatus.ACTIVE || !Boolean.TRUE.equals(user.getValidated())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
