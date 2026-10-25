package com.manaforge.api.frontdesk;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OperatorAuthServiceTest {
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    private static final String PASSWORD = "correct horse battery staple";

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final FrontdeskOperatorRepository operators = mock(FrontdeskOperatorRepository.class);
    private final FrontdeskLoginChallengeRepository challenges = mock(FrontdeskLoginChallengeRepository.class);
    private final Map<String, FrontdeskLoginChallenge> challengeStore = new HashMap<>();
    private final TotpSecretCipher cipher = new TotpSecretCipher(java.util.Base64.getEncoder().encodeToString(new byte[32]));
    private MutableClock clock;
    private FrontdeskOperator operator;
    private OperatorAuthService service;

    /** Fixed to T=59 so the RFC 6238 code 287082 is valid; tests move it to expire things. */
    private static final class MutableClock extends Clock {
        Instant now = Instant.ofEpochSecond(59);
        @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        operator = new FrontdeskOperator();
        operator.setId("op-1");
        operator.setEmail("op@example.com");
        operator.setPasswordHash(encoder.encode(PASSWORD));
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        operator.setTotpEnabled(true);
        operator.setTotpSecretEncrypted(cipher.encrypt(RFC_SECRET));
        when(operators.findByEmail("op@example.com")).thenReturn(Optional.of(operator));
        when(operators.findById("op-1")).thenReturn(Optional.of(operator));
        when(operators.save(any())).thenAnswer(call -> call.getArgument(0));
        when(challenges.save(any())).thenAnswer(call -> {
            FrontdeskLoginChallenge saved = call.getArgument(0);
            challengeStore.put(saved.getId(), saved);
            return saved;
        });
        when(challenges.findById(anyString())).thenAnswer(call -> Optional.ofNullable(challengeStore.get(call.<String>getArgument(0))));
        doAnswer(call -> { challengeStore.remove(call.<String>getArgument(0)); return null; }).when(challenges).deleteById(anyString());
        service = new OperatorAuthService(operators, challenges, new TotpService(clock), cipher, encoder, clock, 5, Duration.ofMinutes(15), Duration.ofMinutes(5));
    }

    private OperatorAuthService.Challenge passwordStep() {
        return service.login("op@example.com", PASSWORD);
    }

    @Test
    void correctPasswordWithTotpReturnsAChallengeNotASession() {
        OperatorAuthService.Challenge challenge = passwordStep();
        assertThat(challenge.type()).isEqualTo(OperatorAuthService.ChallengeType.TOTP_REQUIRED);
        assertThat(challenge.token()).isNotBlank();
    }

    @Test
    void challengeIsStoredOnlyAsAHashNeverTheRawToken() {
        OperatorAuthService.Challenge challenge = passwordStep();
        assertThat(challengeStore).doesNotContainKey(challenge.token());
        assertThat(challengeStore).hasSize(1);
    }

    @Test
    void unknownEmailWrongPasswordAndDisabledAreIndistinguishable() {
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        assertThatThrownBy(() -> service.login("op@example.com", PASSWORD)).isInstanceOf(OperatorAuthException.class);
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        assertThatThrownBy(() -> service.login("op@example.com", "wrong")).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.login("nobody@example.com", PASSWORD)).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.login(null, PASSWORD)).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.login("op@example.com", null)).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void emailLookupIsCaseAndWhitespaceInsensitive() {
        assertThat(service.login("  OP@Example.com ", PASSWORD).type()).isEqualTo(OperatorAuthService.ChallengeType.TOTP_REQUIRED);
    }

    @Test
    void validTotpCodeAuthenticatesAndConsumesTheChallenge() {
        OperatorAuthService.Challenge challenge = passwordStep();
        OperatorPrincipal principal = service.verifyTotp(challenge.token(), "287082");
        assertThat(principal.id()).isEqualTo("op-1");
        assertThat(operator.getLastLoginAt()).isEqualTo(clock.now);
        assertThat(operator.getFailedAttempts()).isZero();
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void aTotpStepCanNeverBeReusedEvenWithAFreshChallenge() {
        service.verifyTotp(passwordStep().token(), "287082");
        assertThatThrownBy(() -> service.verifyTotp(passwordStep().token(), "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void wrongTotpCodeFailsGenericallyAndCountsTowardsTheLock() {
        OperatorAuthService.Challenge challenge = passwordStep();
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "000000")).isInstanceOf(OperatorAuthException.class);
        assertThat(operator.getFailedAttempts()).isEqualTo(1);
    }

    @Test
    void expiredOrUnknownChallengesAreRejected() {
        OperatorAuthService.Challenge challenge = passwordStep();
        clock.now = clock.now.plus(Duration.ofMinutes(6));
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "287082")).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.verifyTotp("not-a-token", "287082")).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.verifyTotp(null, "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void fiveFailuresLockTheAccountEvenForCorrectCredentialsUntilItExpires() {
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.login("op@example.com", "wrong")).isInstanceOf(OperatorAuthException.class);
        }
        assertThat(operator.getLockedUntil()).isEqualTo(clock.now.plus(Duration.ofMinutes(15)));
        assertThatThrownBy(() -> service.login("op@example.com", PASSWORD)).isInstanceOf(OperatorAuthException.class);
        clock.now = clock.now.plus(Duration.ofMinutes(16));
        assertThat(service.login("op@example.com", PASSWORD).type()).isEqualTo(OperatorAuthService.ChallengeType.TOTP_REQUIRED);
    }

    @Test
    void anAccountLockedAfterThePasswordStepRejectsTheSecondStep() {
        OperatorAuthService.Challenge challenge = passwordStep();
        operator.setLockedUntil(clock.now.plusSeconds(60));
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void aDisabledOperatorCannotFinishTheSecondStep() {
        OperatorAuthService.Challenge challenge = passwordStep();
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void withoutTotpOnlyEnrollmentIsOffered() {
        operator.setTotpEnabled(false);
        operator.setTotpSecretEncrypted(null);
        OperatorAuthService.Challenge challenge = passwordStep();
        assertThat(challenge.type()).isEqualTo(OperatorAuthService.ChallengeType.ENROLLMENT_REQUIRED);
        assertThatThrownBy(() -> service.verifyTotp(challenge.token(), "287082")).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void enrollmentStoresTheSecretEncryptedOnlyAfterAValidCodeAndIssuesRecoveryCodes() {
        operator.setTotpEnabled(false);
        operator.setTotpSecretEncrypted(null);
        OperatorAuthService.Challenge challenge = passwordStep();

        OperatorAuthService.EnrollmentStart start = service.startEnrollment(challenge.token());
        assertThat(start.secret()).matches("[A-Z2-7]{32}");
        assertThat(start.otpauthUri()).startsWith("otpauth://totp/").contains("secret=" + start.secret());
        assertThat(operator.isTotpEnabled()).isFalse();
        assertThat(operator.getTotpSecretEncrypted()).isNull();

        // The generated secret is random, so confirm using the real current code for it.
        String code = new TotpService(clock).codeAt(start.secret(), clock.now);
        OperatorAuthService.EnrollmentResult result = service.confirmEnrollment(challenge.token(), code);

        assertThat(operator.isTotpEnabled()).isTrue();
        assertThat(cipher.decrypt(operator.getTotpSecretEncrypted())).isEqualTo(start.secret());
        assertThat(result.principal().id()).isEqualTo("op-1");
        assertThat(result.recoveryCodes()).hasSize(10).doesNotHaveDuplicates();
        assertThat(operator.getRecoveryCodeHashes()).hasSize(10).doesNotContainAnyElementsOf(result.recoveryCodes());
    }

    @Test
    void enrollmentCannotBeRestartedOnceTotpIsEnabled() {
        OperatorAuthService.Challenge challenge = passwordStep();
        assertThatThrownBy(() -> service.startEnrollment(challenge.token())).isInstanceOf(OperatorAuthException.class);
    }

    @Test
    void aWrongEnrollmentCodeDoesNotEnableTotp() {
        operator.setTotpEnabled(false);
        operator.setTotpSecretEncrypted(null);
        OperatorAuthService.Challenge challenge = passwordStep();
        service.startEnrollment(challenge.token());
        assertThatThrownBy(() -> service.confirmEnrollment(challenge.token(), "000000")).isInstanceOf(OperatorAuthException.class);
        assertThat(operator.isTotpEnabled()).isFalse();
    }

    @Test
    void aRecoveryCodeWorksExactlyOnce() {
        operator.setTotpEnabled(false);
        operator.setTotpSecretEncrypted(null);
        OperatorAuthService.Challenge enrol = passwordStep();
        String secret = service.startEnrollment(enrol.token()).secret();
        List<String> codes = service.confirmEnrollment(enrol.token(), new TotpService(clock).codeAt(secret, clock.now)).recoveryCodes();

        OperatorPrincipal principal = service.verifyRecovery(passwordStep().token(), codes.get(0));
        assertThat(principal.id()).isEqualTo("op-1");
        assertThat(operator.getRecoveryCodeHashes()).hasSize(9);
        assertThatThrownBy(() -> service.verifyRecovery(passwordStep().token(), codes.get(0))).isInstanceOf(OperatorAuthException.class);
        assertThatThrownBy(() -> service.verifyRecovery(passwordStep().token(), "AAAA-AAAA-AAAA-AAAA")).isInstanceOf(OperatorAuthException.class);
    }
}
