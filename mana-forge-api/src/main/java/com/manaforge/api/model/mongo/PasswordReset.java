package com.manaforge.api.model.mongo;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "password_resets")
@Data
public class PasswordReset {
    @Id
    private String id;

    @Indexed
    private String userId;

    // store SHA-256 hex of token
    private String tokenHash;

    private Instant expiresAt;

    private boolean used = false;

    private Instant createdAt = Instant.now();
}
