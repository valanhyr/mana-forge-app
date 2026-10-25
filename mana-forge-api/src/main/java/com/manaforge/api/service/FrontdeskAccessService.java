package com.manaforge.api.service;

import java.time.Instant;
import java.util.Optional;
import com.manaforge.api.frontdesk.FrontdeskOperator;
import com.manaforge.api.frontdesk.FrontdeskOperatorRepository;
import com.manaforge.api.frontdesk.OperatorAuthenticationToken;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Operators come only from the dedicated {@code frontdesk_operators} collection and are recognised
 * only through {@link OperatorAuthenticationToken}. Public users and client-supplied roles never qualify.
 */
@Service
public class FrontdeskAccessService {
    private final FrontdeskOperatorRepository operators;

    public FrontdeskAccessService(FrontdeskOperatorRepository operators) {
        this.operators = operators;
    }

    public Optional<OperatorPrincipal> resolve(Authentication authentication) {
        if (authentication instanceof OperatorAuthenticationToken token && token.isAuthenticated()) {
            return Optional.of(token.getPrincipal());
        }
        return Optional.empty();
    }

    /** The operator must still exist, be enabled and not be locked: checked on every use, not only at login. */
    public Optional<OperatorPrincipal> activeOperator(String id) {
        if (id == null) return Optional.empty();
        return operators.findById(id)
                .filter(operator -> operator.getStatus() == FrontdeskOperator.Status.ACTIVE && !operator.isLocked(Instant.now()))
                .map(operator -> new OperatorPrincipal(operator.getId(), operator.getEmail()));
    }

    public boolean isOperator(Authentication authentication) {
        return resolve(authentication).flatMap(principal -> activeOperator(principal.id())).isPresent();
    }

    public OperatorPrincipal requireOperator(Authentication authentication) {
        OperatorPrincipal principal = resolve(authentication).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return activeOperator(principal.id()).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    public OperatorPrincipal operatorById(String id) {
        if (id == null || operators.findById(id).isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return activeOperator(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid operator"));
    }
}
