package com.manaforge.api.frontdesk;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

/**
 * Opaque, revocable operator sessions with an idle and an absolute limit. The operator is reloaded
 * on every request, so disabling or locking the account ends the session immediately.
 */
@Service
@ConditionalOnExpression("!'${frontdesk.totp.key:}'.isEmpty()")
public class OperatorSessionService {
    public record Issued(String token, Instant expiresAt) {}

    private static final Duration TOUCH_INTERVAL = Duration.ofSeconds(30);

    private final FrontdeskOperatorSessionRepository sessions;
    private final FrontdeskOperatorRepository operators;
    private final Clock clock;
    private final Duration idleTimeout;
    private final Duration absoluteTimeout;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public OperatorSessionService(FrontdeskOperatorSessionRepository sessions, FrontdeskOperatorRepository operators,
                                  @Value("${frontdesk.session.idle-minutes:30}") long idleMinutes,
                                  @Value("${frontdesk.session.max-hours:8}") long maxHours) {
        this(sessions, operators, Clock.systemUTC(), Duration.ofMinutes(idleMinutes), Duration.ofHours(maxHours));
    }

    OperatorSessionService(FrontdeskOperatorSessionRepository sessions, FrontdeskOperatorRepository operators,
                           Clock clock, Duration idleTimeout, Duration absoluteTimeout) {
        this.sessions = sessions;
        this.operators = operators;
        this.clock = clock;
        this.idleTimeout = idleTimeout;
        this.absoluteTimeout = absoluteTimeout;
    }

    public Issued create(String operatorId) {
        Instant now = clock.instant();
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        FrontdeskOperatorSession session = new FrontdeskOperatorSession();
        session.setId(hash(token));
        session.setOperatorId(operatorId);
        session.setCreatedAt(now);
        session.setLastSeenAt(now);
        session.setExpiresAt(now.plus(absoluteTimeout));
        sessions.save(session);
        return new Issued(token, session.getExpiresAt());
    }

    public Optional<OperatorPrincipal> authenticate(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        Instant now = clock.instant();
        String id = hash(token);
        FrontdeskOperatorSession session = sessions.findById(id).orElse(null);
        if (session == null) return Optional.empty();
        boolean expired = !session.getExpiresAt().isAfter(now) || !session.getLastSeenAt().plus(idleTimeout).isAfter(now);
        FrontdeskOperator operator = expired ? null : operators.findById(session.getOperatorId()).orElse(null);
        if (operator == null || !operator.isActive() || operator.isLocked(now)) {
            sessions.deleteById(id);
            return Optional.empty();
        }
        if (session.getLastSeenAt().plus(TOUCH_INTERVAL).isBefore(now)) {
            session.setLastSeenAt(now);
            sessions.save(session);
        }
        return Optional.of(new OperatorPrincipal(operator.getId(), operator.getEmail()));
    }

    public void revoke(String token) {
        if (token == null || token.isBlank()) return;
        sessions.deleteById(hash(token));
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
