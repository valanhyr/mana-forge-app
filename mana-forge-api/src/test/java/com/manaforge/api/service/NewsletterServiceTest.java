package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.data.mongodb.core.MongoTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DataMongoTest
@ActiveProfiles("test")
class NewsletterServiceTest {
    @Autowired MongoTemplate mongo;
    @Autowired UserRepository users;
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private NewsletterService service;

    @BeforeEach void setUp() {
        // Reuse the repository-test context instead of starting another memory-heavy mongod.
        service = new NewsletterService(mongo, encryption, "http://localhost:5173");
        users.deleteAll();
        when(encryption.encrypt(anyString())).thenAnswer(call -> "ENC:" + call.getArgument(0));
        when(encryption.decrypt(anyString())).thenAnswer(call -> ((String) call.getArgument(0)).substring(4));
    }

    private User account(String name) {
        User user = new User(); user.setUsername(name); user.setEmail("ENC:" + name + "@example.com"); user.setValidated(true);
        return users.save(user);
    }

    @Test void noExistingAccountIsAutomaticallySubscribed() {
        User user = account("old");
        assertThat(user.getNewsletterSubscribed()).isFalse();
        assertThat(service.subscribers(null, null, 0, 25).items()).isEmpty();
    }

    @Test void consentPersistsOnlyPreferenceFieldsAndUnsubscribeIsIdempotent() {
        User user = account("customer");
        User moderated = users.findById(user.getId()).orElseThrow(); moderated.setStatus(User.AccountStatus.SUSPENDED); users.save(moderated);
        service.setPreference(user, true);
        User saved = users.findById(user.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(User.AccountStatus.SUSPENDED);
        assertThat(saved.getNewsletterConsentAt()).isNotNull();
        assertThat(saved.getNewsletterTokenHash()).hasSize(64);
        String token = encryption.decrypt(saved.getNewsletterTokenEncrypted());
        assertThat(saved.getNewsletterTokenHash()).doesNotContain(token);
        assertThat(service.unsubscribeUrl(saved)).isEqualTo("http://localhost:5173/newsletter/unsubscribe#" + token);
        service.unsubscribe(token); service.unsubscribe(token);
        assertThat(users.findById(user.getId()).orElseThrow().getNewsletterSubscribed()).isFalse();
    }

    @Test void subscribersMustRemainVerifiedActiveAndOptedInWithSearchAndPagination() {
        User allowed = account("eligible"); service.setPreference(allowed, true);
        User unverified = account("unverified"); service.setPreference(unverified, true);
        unverified = users.findById(unverified.getId()).orElseThrow(); unverified.setValidated(false); users.save(unverified);
        User banned = account("banned"); service.setPreference(banned, true);
        banned = users.findById(banned.getId()).orElseThrow(); banned.setStatus(User.AccountStatus.BANNED); users.save(banned);
        account("no-consent");
        assertThat(service.subscribers(null, null, 0, 25).items()).extracting(NewsletterService.Subscriber::username).containsExactly("eligible");
        assertThat(service.subscribers("eligible@example.com", User.Tier.FREE, 0, 25).total()).isEqualTo(1);
        assertThat(service.subscribers(".*", null, 0, 25).items()).isEmpty();
        assertThat(service.subscribers(null, null, 1, 1).items()).isEmpty();
    }

    @Test void newConsentInvalidatesTheOldUnsubscribeToken() {
        User user = account("customer"); service.setPreference(user, true);
        user = users.findById(user.getId()).orElseThrow(); String oldToken = encryption.decrypt(user.getNewsletterTokenEncrypted());
        service.unsubscribe(oldToken);
        user = users.findById(user.getId()).orElseThrow(); service.setPreference(user, true);
        service.unsubscribe(oldToken);
        assertThat(users.findById(user.getId()).orElseThrow().getNewsletterSubscribed()).isTrue();
    }

    @Test void freeFilterIncludesConsentingLegacyAccountsWithNoStoredTier() {
        User legacy = account("legacy"); legacy.setTier(null); legacy = users.save(legacy); service.setPreference(legacy, true);
        var result = service.subscribers("legacy", User.Tier.FREE, 0, 25);
        assertThat(result.total()).isEqualTo(1);
        assertThat(result.items().getFirst().tier()).isEqualTo(User.Tier.FREE);
    }
}
