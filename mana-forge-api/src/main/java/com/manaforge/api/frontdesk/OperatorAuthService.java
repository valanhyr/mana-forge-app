package com.manaforge.api.frontdesk;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.OptionalLong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Password + TOTP authentication for the single Frontdesk operator. Every failure raises the same
 * {@link OperatorAuthException}, so callers cannot distinguish a wrong password from an unknown,
 * disabled or locked account.
 *
 * <p>Failure counters are read-modify-write on one document, so truly parallel guesses can be
 * undercounted. Phase 4 adds a per-IP limit that bounds this.
 */
@Service
@ConditionalOnExpression("!'${frontdesk.totp.key:}'.isEmpty()")
public class OperatorAuthService {
    public enum ChallengeType { TOTP_REQUIRED, ENROLLMENT_REQUIRED }

    public record Challenge(String token, ChallengeType type) {}
    public record EnrollmentStart(String secret, String otpauthUri) {}
    public record EnrollmentResult(OperatorPrincipal principal, List<String> recoveryCodes) {}

    private static final String ISSUER = "Mana Forge Frontdesk";
    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int RECOVERY_CODES = 10;

    private final FrontdeskOperatorRepository operators;
    private final FrontdeskLoginChallengeRepository challenges;
    private final TotpService totp;
    private final TotpSecretCipher cipher;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final int maxAttempts;
    private final Duration lockDuration;
    private final Duration challengeTtl;
    private final String dummyHash;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public OperatorAuthService(FrontdeskOperatorRepository operators, FrontdeskLoginChallengeRepository challenges,
                               TotpService totp, TotpSecretCipher cipher,
                               @Value("${frontdesk.auth.max-attempts:5}") int maxAttempts,
                               @Value("${frontdesk.auth.lock-minutes:15}") long lockMinutes) {
        this(operators, challenges, totp, cipher, new BCryptPasswordEncoder(), Clock.systemUTC(),
                maxAttempts, Duration.ofMinutes(lockMinutes), Duration.ofMinutes(5));
    }

    OperatorAuthService(FrontdeskOperatorRepository operators, FrontdeskLoginChallengeRepository challenges,
                        TotpService totp, TotpSecretCipher cipher, PasswordEncoder encoder, Clock clock,
                        int maxAttempts, Duration lockDuration, Duration challengeTtl) {
        this.operators = operators;
        this.challenges = challenges;
        this.totp = totp;
        this.cipher = cipher;
        this.encoder = encoder;
        this.clock = clock;
        this.maxAttempts = maxAttempts;
        this.lockDuration = lockDuration;
        this.challengeTtl = challengeTtl;
        this.dummyHash = encoder.encode("frontdesk-dummy-password");
    }

    public Challenge login(String email, String password) {
        Instant now = clock.instant();
        Optional<FrontdeskOperator> found = email == null ? Optional.empty()
                : operators.findByEmail(email.trim().toLowerCase(Locale.ROOT));
        String hash = found.map(FrontdeskOperator::getPasswordHash).orElse(dummyHash);
        // Always run BCrypt so unknown and known emails cost the same.
        boolean passwordOk = password != null && encoder.matches(password, hash == null ? dummyHash : hash);
        FrontdeskOperator operator = found.orElse(null);
        boolean usable = operator != null && operator.isActive() && !operator.isLocked(now);
        if (!usable) throw new OperatorAuthException();
        if (!passwordOk) {
            registerFailure(operator, now);
            throw new OperatorAuthException();
        }
        boolean totpReady = operator.isTotpEnabled() && operator.getTotpSecretEncrypted() != null;
        return issueChallenge(operator, totpReady ? ChallengeType.TOTP_REQUIRED : ChallengeType.ENROLLMENT_REQUIRED, now);
    }

    public OperatorPrincipal verifyTotp(String token, String code) {
        Instant now = clock.instant();
        FrontdeskLoginChallenge challenge = requireChallenge(token, ChallengeType.TOTP_REQUIRED, now);
        FrontdeskOperator operator = requireUsableOperator(challenge, now);
        if (operator.getTotpSecretEncrypted() == null) throw new OperatorAuthException();
        OptionalLong step = totp.verify(cipher.decrypt(operator.getTotpSecretEncrypted()), code, lastStep(operator));
        if (step.isEmpty()) {
            registerFailure(operator, now);
            throw new OperatorAuthException();
        }
        operator.setLastTotpStep(step.getAsLong());
        return complete(operator, challenge, now);
    }

    public OperatorPrincipal verifyRecovery(String token, String recoveryCode) {
        Instant now = clock.instant();
        FrontdeskLoginChallenge challenge = requireChallenge(token, ChallengeType.TOTP_REQUIRED, now);
        FrontdeskOperator operator = requireUsableOperator(challenge, now);
        String candidate = recoveryCode == null ? "" : sha256(normalize(recoveryCode));
        String match = null;
        for (String stored : operator.getRecoveryCodeHashes()) {
            if (MessageDigest.isEqual(stored.getBytes(StandardCharsets.US_ASCII), candidate.getBytes(StandardCharsets.US_ASCII))) match = stored;
        }
        if (match == null) {
            registerFailure(operator, now);
            throw new OperatorAuthException();
        }
        operator.getRecoveryCodeHashes().remove(match);
        return complete(operator, challenge, now);
    }

    public EnrollmentStart startEnrollment(String token) {
        Instant now = clock.instant();
        FrontdeskLoginChallenge challenge = requireChallenge(token, ChallengeType.ENROLLMENT_REQUIRED, now);
        FrontdeskOperator operator = requireUsableOperator(challenge, now);
        if (operator.isTotpEnabled()) throw new OperatorAuthException();
        String secret = totp.generateSecret();
        challenge.setPendingSecretEncrypted(cipher.encrypt(secret));
        challenges.save(challenge);
        return new EnrollmentStart(secret, totp.otpauthUri(ISSUER, operator.getEmail(), secret));
    }

    public EnrollmentResult confirmEnrollment(String token, String code) {
        Instant now = clock.instant();
        FrontdeskLoginChallenge challenge = requireChallenge(token, ChallengeType.ENROLLMENT_REQUIRED, now);
        FrontdeskOperator operator = requireUsableOperator(challenge, now);
        if (operator.isTotpEnabled() || challenge.getPendingSecretEncrypted() == null) throw new OperatorAuthException();
        String secret = cipher.decrypt(challenge.getPendingSecretEncrypted());
        OptionalLong step = totp.verify(secret, code, -1);
        if (step.isEmpty()) {
            registerFailure(operator, now);
            throw new OperatorAuthException();
        }
        List<String> codes = new ArrayList<>();
        List<String> hashes = new ArrayList<>();
        for (int i = 0; i < RECOVERY_CODES; i++) {
            String recovery = newRecoveryCode();
            codes.add(recovery);
            hashes.add(sha256(normalize(recovery)));
        }
        operator.setTotpSecretEncrypted(cipher.encrypt(secret));
        operator.setTotpEnabled(true);
        operator.setLastTotpStep(step.getAsLong());
        operator.setRecoveryCodeHashes(hashes);
        return new EnrollmentResult(complete(operator, challenge, now), codes);
    }

    private Challenge issueChallenge(FrontdeskOperator operator, ChallengeType type, Instant now) {
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        FrontdeskLoginChallenge challenge = new FrontdeskLoginChallenge();
        challenge.setId(sha256(token));
        challenge.setOperatorId(operator.getId());
        challenge.setType(type);
        challenge.setExpiresAt(now.plus(challengeTtl));
        challenges.save(challenge);
        return new Challenge(token, type);
    }

    private FrontdeskLoginChallenge requireChallenge(String token, ChallengeType type, Instant now) {
        if (token == null || token.isBlank()) throw new OperatorAuthException();
        FrontdeskLoginChallenge challenge = challenges.findById(sha256(token)).orElseThrow(OperatorAuthException::new);
        if (!challenge.getExpiresAt().isAfter(now)) {
            challenges.deleteById(challenge.getId());
            throw new OperatorAuthException();
        }
        if (challenge.getType() != type) throw new OperatorAuthException();
        return challenge;
    }

    private FrontdeskOperator requireUsableOperator(FrontdeskLoginChallenge challenge, Instant now) {
        FrontdeskOperator operator = operators.findById(challenge.getOperatorId()).orElseThrow(OperatorAuthException::new);
        if (!operator.isActive() || operator.isLocked(now)) throw new OperatorAuthException();
        return operator;
    }

    private OperatorPrincipal complete(FrontdeskOperator operator, FrontdeskLoginChallenge challenge, Instant now) {
        operator.setFailedAttempts(0);
        operator.setLockedUntil(null);
        operator.setLastLoginAt(now);
        operators.save(operator);
        challenges.deleteById(challenge.getId());
        return new OperatorPrincipal(operator.getId(), operator.getEmail());
    }

    private void registerFailure(FrontdeskOperator operator, Instant now) {
        int failures = operator.getFailedAttempts() + 1;
        if (failures >= maxAttempts) {
            operator.setLockedUntil(now.plus(lockDuration));
            failures = 0;
        }
        operator.setFailedAttempts(failures);
        operators.save(operator);
    }

    private static long lastStep(FrontdeskOperator operator) {
        return operator.getLastTotpStep() == null ? -1 : operator.getLastTotpStep();
    }

    private String newRecoveryCode() {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            if (i > 0 && i % 4 == 0) out.append('-');
            out.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return out.toString();
    }

    private static String normalize(String code) {
        return code.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
