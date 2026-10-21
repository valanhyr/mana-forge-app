package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DataMongoTest
@ActiveProfiles("test")
class AnnouncementServiceTest {
    @Autowired MongoTemplate mongo;
    @Autowired UserRepository users;
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private AnnouncementService service;

    @BeforeEach void setUp() {
        service = new AnnouncementService(mongo, encryption);
        users.deleteAll();
        when(encryption.encrypt(anyString())).thenAnswer(call -> "ENC:" + call.getArgument(0));
        when(encryption.decrypt(anyString())).thenAnswer(call -> ((String) call.getArgument(0)).substring(4));
    }

    private User account(String name) {
        User user = new User(); user.setUsername(name); user.setEmail("ENC:" + name + "@example.com"); user.setValidated(true);
        return users.save(user);
    }

    @Test void recipientsIgnoreNewsletterConsentButRequireVerifiedActiveAccounts() {
        account("no-consent");
        User subscribed = account("subscribed"); subscribed.setNewsletterSubscribed(true); users.save(subscribed);
        User unverified = account("unverified"); unverified.setValidated(false); users.save(unverified);
        User banned = account("banned"); banned.setStatus(User.AccountStatus.BANNED); users.save(banned);
        User suspended = account("suspended"); suspended.setStatus(User.AccountStatus.SUSPENDED); users.save(suspended);
        User inactive = account("inactive"); inactive.setActive(false); users.save(inactive);
        assertThat(service.recipients(null, null, 0, 25).items()).extracting(AnnouncementService.Recipient::username)
                .containsExactly("no-consent", "subscribed");
    }

    @Test void recipientsSupportSearchTierAndPaginationWithoutRegexInjection() {
        account("alice");
        User pro = account("bob"); pro.setTier(User.Tier.PRO); users.save(pro);
        User legacy = account("legacy"); legacy.setTier(null); users.save(legacy);
        assertThat(service.recipients("alice@example.com", null, 0, 25).total()).isEqualTo(1);
        assertThat(service.recipients(null, User.Tier.PRO, 0, 25).items()).extracting(AnnouncementService.Recipient::username).containsExactly("bob");
        assertThat(service.recipients(null, User.Tier.FREE, 0, 25).items()).extracting(AnnouncementService.Recipient::username)
                .containsExactly("alice", "legacy");
        assertThat(service.recipients(".*", null, 0, 25).items()).isEmpty();
        assertThat(service.recipients(null, null, 1, 1).items()).hasSize(1);
        assertThat(service.recipients(null, null, 0, 1).items().getFirst().email()).isEqualTo("alice@example.com");
    }

    @Test void recipientsRejectInvalidPaginationAndSearch() {
        assertThatThrownBy(() -> service.recipients(null, null, -1, 25)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(() -> service.recipients(null, null, 0, 101)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(() -> service.recipients("x".repeat(201), null, 0, 25)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test void eligibilityDoesNotDependOnNewsletterFields() {
        User user = new User(); user.setValidated(true);
        assertThat(AnnouncementService.eligible(user)).isTrue();
        user.setNewsletterSubscribed(false); user.setNewsletterTokenEncrypted(null);
        assertThat(AnnouncementService.eligible(user)).isTrue();
        user.setStatus(User.AccountStatus.BANNED);
        assertThat(AnnouncementService.eligible(user)).isFalse();
        user.setStatus(null); user.setValidated(false);
        assertThat(AnnouncementService.eligible(user)).isFalse();
        user.setValidated(true); user.setActive(false);
        assertThat(AnnouncementService.eligible(user)).isFalse();
        assertThat(AnnouncementService.eligible(null)).isFalse();
    }
}
