package com.manaforge.api.frontdesk;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Short-lived bridge between the password step and the second factor. {@code id} is the SHA-256 of the token. */
@Data
@Document(collection = "frontdesk_login_challenges")
public class FrontdeskLoginChallenge {
    @Id
    private String id;
    private String operatorId;
    private OperatorAuthService.ChallengeType type;
    private String pendingSecretEncrypted;
    private Instant expiresAt;
}
