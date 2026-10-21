package com.manaforge.api.service;

import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Operators are explicitly allowlisted by immutable Mongo IDs, never by client-supplied roles. */
@Service
public class FrontdeskAccessService {
    private final UserRepository users;
    private final EmailEncryptionService encryption;
    private final Set<String> operatorIds;

    public FrontdeskAccessService(UserRepository users, EmailEncryptionService encryption,
                                 @Value("${frontdesk.operator-ids:}") String operatorIds) {
        this.users = users;
        this.encryption = encryption;
        this.operatorIds = Arrays.stream(operatorIds.split(","))
                .map(String::trim).filter(id -> !id.isEmpty()).collect(Collectors.toUnmodifiableSet());
    }

    public Optional<User> resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) return Optional.empty();
        if (authentication.getPrincipal() instanceof OAuth2User oauth) {
            String email = oauth.getAttribute("email");
            return email == null ? Optional.empty() : users.findByEmail(encryption.encrypt(email));
        }
        return users.findByUsername(authentication.getName());
    }

    public boolean isOperator(User user) {
        return user != null && user.getId() != null && operatorIds.contains(user.getId())
                && user.effectiveStatus() == User.AccountStatus.ACTIVE
                && Boolean.TRUE.equals(user.getValidated());
    }

    public boolean isOperator(Authentication authentication) {
        return resolve(authentication).map(this::isOperator).orElse(false);
    }

    public User requireOperator(Authentication authentication) {
        User user = resolve(authentication).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!isOperator(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }

    public User operatorById(String id) {
        User user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!isOperator(user)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid operator");
        return user;
    }
}
