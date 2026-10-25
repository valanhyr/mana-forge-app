package com.manaforge.api.frontdesk;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/** Server-side operator session. {@code id} is the SHA-256 of the cookie token; the token itself is never stored. */
@Data
@Document(collection = "frontdesk_operator_sessions")
public class FrontdeskOperatorSession {
    @Id
    private String id;
    private String operatorId;
    private Instant createdAt;
    private Instant lastSeenAt;
    private Instant expiresAt;
}
