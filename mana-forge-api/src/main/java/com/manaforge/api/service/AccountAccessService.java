package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AccountAccessService {
    private final FrontdeskAccessService accounts;

    public User requireAccount(Authentication authentication) {
        User user = accounts.resolve(authentication)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (user.effectiveStatus() != User.AccountStatus.ACTIVE || !Boolean.TRUE.equals(user.getValidated())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return user;
    }
}
