package com.manaforge.api.frontdesk;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Internal operator identity, deliberately separate from the public {@code users} collection. */
@Data
@Document(collection = "frontdesk_operators")
public class FrontdeskOperator {
    public enum Status { ACTIVE, DISABLED }

    @Id
    private String id;
    private String email;
    private String passwordHash;
    private String totpSecretEncrypted;
    private boolean totpEnabled;
    private Long lastTotpStep;
    private List<String> recoveryCodeHashes = new ArrayList<>();
    private Status status;
    private int failedAttempts;
    private Instant lockedUntil;
    private Instant lastLoginAt;
    private Instant createdAt;

    public boolean isActive() {
        return status == Status.ACTIVE;
    }

    public boolean isLocked(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }
}
