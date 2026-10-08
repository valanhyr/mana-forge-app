package com.manaforge.api.model.mongo;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document(collection = "users")
public class User {

    public static final String DEFAULT_AVATAR = "ava1.jpg";

    @Id
    private String id;
    private String name;
    private String username;
    private String password;
    private String email;
    private String biography = "";
    private Boolean active = true;
    private Boolean validated;
    private String[] friends = new String[0];
    private String avatar = DEFAULT_AVATAR;
    private String verificationToken;
    private Boolean betaAccepted = false;
    private String pendingEmail;
    private Tier tier = Tier.FREE;
    private AccountStatus status;
    private Instant createdAt;
    private Instant lastLoginAt;
    private Boolean newsletterSubscribed = false;
    private Instant newsletterConsentAt;
    private String newsletterTokenHash;
    private String newsletterTokenEncrypted;

    public enum Tier { FREE, PRO, PATREON }
    public enum AccountStatus { ACTIVE, SUSPENDED, BANNED }

    public AccountStatus effectiveStatus() {
        if (status != null && status != AccountStatus.ACTIVE) return status;
        return Boolean.FALSE.equals(active) ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE;
    }

    public User(
        String name,
        String username,
        String password,
        String email,
        String biography,
        Boolean active,
        Boolean validated,
        String[] friends
    ) {
        this.name = name;
        this.username = username;
        this.password = password;
        this.email = email;
        this.biography = biography;
        this.active = active;
        this.validated = validated;
        this.friends = friends;
        this.avatar = DEFAULT_AVATAR;
    }
}
