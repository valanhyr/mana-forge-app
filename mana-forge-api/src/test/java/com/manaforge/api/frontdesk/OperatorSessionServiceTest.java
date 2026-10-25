package com.manaforge.api.frontdesk;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OperatorSessionServiceTest {
    private final FrontdeskOperatorSessionRepository sessions = mock(FrontdeskOperatorSessionRepository.class);
    private final FrontdeskOperatorRepository operators = mock(FrontdeskOperatorRepository.class);
    private final Map<String, FrontdeskOperatorSession> store = new HashMap<>();
    private FrontdeskOperator operator;
    private Instant now;
    private OperatorSessionService service;

    @BeforeEach
    void setUp() {
        now = Instant.parse("2026-10-25T10:00:00Z");
        operator = new FrontdeskOperator();
        operator.setId("op-1");
        operator.setEmail("op@example.com");
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        when(operators.findById("op-1")).thenReturn(Optional.of(operator));
        when(sessions.save(any())).thenAnswer(call -> {
            FrontdeskOperatorSession saved = call.getArgument(0);
            store.put(saved.getId(), saved);
            return saved;
        });
        when(sessions.findById(anyString())).thenAnswer(call -> Optional.ofNullable(store.get(call.<String>getArgument(0))));
        doAnswer(call -> { store.remove(call.<String>getArgument(0)); return null; }).when(sessions).deleteById(anyString());
        Clock clock = new Clock() {
            @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { return now; }
        };
        service = new OperatorSessionService(sessions, operators, clock, Duration.ofMinutes(30), Duration.ofHours(8));
    }

    @Test
    void createdSessionAuthenticatesTheOperator() {
        OperatorSessionService.Issued issued = service.create("op-1");
        assertThat(service.authenticate(issued.token())).contains(new OperatorPrincipal("op-1", "op@example.com"));
        assertThat(issued.expiresAt()).isEqualTo(now.plus(Duration.ofHours(8)));
    }

    @Test
    void theRawTokenIsNeverStored() {
        OperatorSessionService.Issued issued = service.create("op-1");
        assertThat(store).doesNotContainKey(issued.token()).hasSize(1);
    }

    @Test
    void unknownBlankOrNullTokensAreRejected() {
        assertThat(service.authenticate("nope")).isEmpty();
        assertThat(service.authenticate("")).isEmpty();
        assertThat(service.authenticate(null)).isEmpty();
    }

    @Test
    void expiresAfterThirtyMinutesOfInactivityAndIsDeleted() {
        String token = service.create("op-1").token();
        now = now.plus(Duration.ofMinutes(31));
        assertThat(service.authenticate(token)).isEmpty();
        assertThat(store).isEmpty();
    }

    @Test
    void activityExtendsTheIdleWindowButNeverPastTheAbsoluteLimit() {
        String token = service.create("op-1").token();
        for (int i = 0; i < 4; i++) {
            now = now.plus(Duration.ofMinutes(20));
            assertThat(service.authenticate(token)).as("after %d min", (i + 1) * 20).isPresent();
        }
        // 80 minutes in and still active; jump close to 8h in steps and then past it.
        while (now.isBefore(Instant.parse("2026-10-25T17:45:00Z"))) {
            now = now.plus(Duration.ofMinutes(20));
            service.authenticate(token);
        }
        now = Instant.parse("2026-10-25T18:00:01Z");
        assertThat(service.authenticate(token)).isEmpty();
    }

    @Test
    void aDisabledOperatorLosesTheSessionOnTheNextRequest() {
        String token = service.create("op-1").token();
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        assertThat(service.authenticate(token)).isEmpty();
        assertThat(store).isEmpty();
    }

    @Test
    void aLockedOperatorLosesTheSession() {
        String token = service.create("op-1").token();
        operator.setLockedUntil(now.plusSeconds(60));
        assertThat(service.authenticate(token)).isEmpty();
    }

    @Test
    void aMissingOperatorLosesTheSession() {
        String token = service.create("op-1").token();
        when(operators.findById("op-1")).thenReturn(Optional.empty());
        assertThat(service.authenticate(token)).isEmpty();
    }

    @Test
    void revokeInvalidatesTheSession() {
        String token = service.create("op-1").token();
        service.revoke(token);
        assertThat(service.authenticate(token)).isEmpty();
        service.revoke(null);
        service.revoke("unknown");
    }

    @Test
    void everySessionGetsADistinctToken() {
        assertThat(service.create("op-1").token()).isNotEqualTo(service.create("op-1").token());
        assertThat(store).hasSize(2);
    }
}
