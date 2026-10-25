package com.manaforge.api.service;

import java.time.Instant;
import java.util.Optional;
import com.manaforge.api.frontdesk.FrontdeskOperator;
import com.manaforge.api.frontdesk.FrontdeskOperatorRepository;
import com.manaforge.api.frontdesk.OperatorAuthenticationToken;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class FrontdeskAccessServiceTest {
    private final FrontdeskOperatorRepository operators = mock(FrontdeskOperatorRepository.class);
    private final FrontdeskAccessService service = new FrontdeskAccessService(operators);
    private FrontdeskOperator operator;

    @BeforeEach
    void setUp() {
        operator = new FrontdeskOperator();
        operator.setId("op-1");
        operator.setEmail("op@example.com");
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        when(operators.findById("op-1")).thenReturn(Optional.of(operator));
    }

    private OperatorAuthenticationToken token() {
        return new OperatorAuthenticationToken(new OperatorPrincipal("op-1", "op@example.com"));
    }

    @Test
    void anActiveOperatorSessionIsAnOperator() {
        assertThat(service.isOperator(token())).isTrue();
        assertThat(service.requireOperator(token())).isEqualTo(new OperatorPrincipal("op-1", "op@example.com"));
    }

    @Test
    void aPublicUserIsNeverAnOperatorEvenWithTheRoleAndAMatchingName() {
        var spoofed = new UsernamePasswordAuthenticationToken("op-1", null, AuthorityUtils.createAuthorityList("ROLE_FRONTDESK_OPERATOR"));
        assertThat(service.isOperator(spoofed)).isFalse();
        assertThat(service.isOperator(null)).isFalse();
        assertThatThrownBy(() -> service.requireOperator(spoofed)).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void disabledLockedOrMissingOperatorsAreRevokedImmediately() {
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        assertThat(service.isOperator(token())).isFalse();
        assertThatThrownBy(() -> service.requireOperator(token())).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        operator.setLockedUntil(Instant.now().plusSeconds(60));
        assertThat(service.isOperator(token())).isFalse();
        when(operators.findById("op-1")).thenReturn(Optional.empty());
        assertThat(service.isOperator(token())).isFalse();
    }

    @Test
    void activeOperatorLooksUpByIdAndRejectsNull() {
        assertThat(service.activeOperator("op-1")).contains(new OperatorPrincipal("op-1", "op@example.com"));
        assertThat(service.activeOperator(null)).isEmpty();
        assertThat(service.activeOperator("other")).isEmpty();
    }

    @Test
    void operatorByIdDistinguishesUnknownFromInactive() {
        assertThat(service.operatorById("op-1").id()).isEqualTo("op-1");
        assertThatThrownBy(() -> service.operatorById("ghost")).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        assertThatThrownBy(() -> service.operatorById("op-1")).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
