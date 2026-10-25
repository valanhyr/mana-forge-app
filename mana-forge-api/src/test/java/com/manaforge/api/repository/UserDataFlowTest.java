package com.manaforge.api.repository;

import com.manaforge.api.frontdesk.OperatorPrincipal;

import com.manaforge.api.controller.UserController;
import com.manaforge.api.controller.FriendController;
import com.manaforge.api.config.ApiExceptionHandler;
import com.manaforge.api.service.EmailMigrationRunner;
import com.manaforge.api.service.NewsletterService;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.service.EmailEncryptionService;
import com.manaforge.api.service.EmailService;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DataMongoTest
@ActiveProfiles("test")
class UserDataFlowTest {
    @Autowired UserRepository users;
    @Autowired MongoTemplate mongo;
    @Autowired FriendRequestRepository requests;
    final EmailService emails = mock(EmailService.class);
    final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    final Instant old = Instant.parse("2020-01-01T00:00:00Z");
    User user;

    MockMvc mvc(UserRepository repository) {
        return MockMvcBuilders.standaloneSetup(new UserController(repository, emails, encryption))
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @BeforeEach void setup() {
        users.deleteAll();
        when(encryption.encrypt(anyString())).thenAnswer(call -> "ENC:" + call.getArgument(0));
        when(encryption.decrypt(anyString())).thenAnswer(call -> ((String) call.getArgument(0)).substring(4));
        user = new User(); user.setUsername("customer"); user.setEmail("ENC:customer@example.com");
        user.setPassword(new BCryptPasswordEncoder().encode("password123")); user.setValidated(true);
        user = users.save(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("customer", null, List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    Document raw() { return mongo.getCollection("users").find(new Document("_id", new ObjectId(user.getId()))).first(); }
    void set(String key, Object value) { mongo.updateFirst(Query.query(Criteria.where("_id").is(user.getId())), new Update().set(key, value), User.class); }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void legacyReadDoesNotWriteAndProfileStartsOnlyModificationDate(boolean explicitNulls) throws Exception {
        if (explicitNulls) {
            set("createdAt", null); set("updatedAt", null); set("lastLoginAt", null);
            assertThat(raw()).containsKeys("createdAt", "updatedAt", "lastLoginAt");
        }
        mvc(users).perform(get("/api/users/me")).andExpect(status().isOk());
        assertThat(raw().get("updatedAt")).isNull();
        mvc(users).perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON).content("{\"biography\":\"new bio\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updatedAt").isString());
        assertThat(raw().getDate("updatedAt")).isNotNull();
        assertThat(raw().get("createdAt")).isNull();
        assertThat(raw().get("lastLoginAt")).isNull();
    }

    @Test void profileNoOpPreservesModificationDate() throws Exception {
        set("updatedAt", old);
        mvc(users).perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON).content("{\"biography\":\"\"}"))
                .andExpect(status().isOk());
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
    }

    @Test void staleProfileCannotUndoLoginModerationOrConsent() throws Exception {
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(Optional.of(user)).when(stale).findByUsername("customer");
        Instant login = Instant.now();
        set("lastLoginAt", login); set("status", User.AccountStatus.BANNED); set("newsletterSubscribed", true);
        mvc(stale).perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON).content("{\"biography\":\"new\"}"))
                .andExpect(status().isOk());
        User saved = users.findById(user.getId()).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(User.AccountStatus.BANNED);
        assertThat(saved.getNewsletterSubscribed()).isTrue();
        assertThat(saved.getLastLoginAt()).isEqualTo(Instant.ofEpochMilli(login.toEpochMilli()));
    }

    @Test void loginDatesNeverGoBackwardsAndKeepCreationUnknown() {
        Instant future = Instant.parse("2099-01-01T00:00:00Z");
        users.updateLastLoginAt(user.getId(), future);
        users.updateLastLoginAt(user.getId(), old);
        assertThat(users.findById(user.getId()).orElseThrow().getLastLoginAt()).isEqualTo(future);
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(future));
        assertThat(raw().get("createdAt")).isNull();
    }

    @Test void localRegistrationStoresServerDatesAndNoLogin() throws Exception {
        mvc(users).perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"new\",\"email\":\"new@example.com\",\"password\":\"password123\",\"updatedAt\":\"2000-01-01T00:00:00Z\"}"))
                .andExpect(status().isCreated());
        user = users.findByUsername("new").orElseThrow();
        assertThat(raw().getDate("createdAt")).isEqualTo(raw().getDate("updatedAt")).isNotNull();
        assertThat(user.getLastLoginAt()).isNull();
    }

    @Test void stalePasswordCannotOverwriteNewPasswordOrNotifySuccess() throws Exception {
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(Optional.of(user)).when(stale).findByUsername("customer");
        set("password", "new-concurrent-hash"); set("updatedAt", old);
        mvc(stale).perform(patch("/api/users/me/password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"password123\",\"newPassword\":\"different123\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONCURRENT_UPDATE"));
        assertThat(raw().getString("password")).isEqualTo("new-concurrent-hash");
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        verify(emails, never()).sendPasswordChangedNotificationEmail(any());
    }

    @Test void verificationPromotesEmailAndRevokesOnlyItsConsentFields() throws Exception {
        set("verificationToken", "verify"); set("pendingEmail", "ENC:new@example.com");
        set("newsletterSubscribed", true); set("newsletterTokenHash", "old-hash");
        set("lastLoginAt", old);
        mvc(users).perform(get("/api/users/verify?token=verify")).andExpect(status().isOk());
        assertThat(raw().getString("email")).isEqualTo("ENC:new@example.com");
        assertThat(raw().get("newsletterTokenHash")).isNull();
        assertThat(raw().getBoolean("newsletterSubscribed")).isFalse();
        assertThat(raw().getDate("lastLoginAt")).isEqualTo(Date.from(old));
        assertThat(raw().getDate("updatedAt")).isNotNull();
        assertThat(raw().get("createdAt")).isNull();
    }

    @Test void rejectedLoginAndSessionRestoreDoNotChangeDates() throws Exception {
        set("updatedAt", old);
        mvc(users).perform(post("/api/users/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"customer\",\"password\":\"bad\"}")).andExpect(status().isUnauthorized());
        mvc(users).perform(get("/api/users/me")).andExpect(status().isOk());
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        assertThat(raw().get("lastLoginAt")).isNull();
    }

    @Test void staleFriendRemovalCannotUndoModeration() throws Exception {
        User other = new User(); other.setUsername("friend"); other = users.save(other);
        user.setFriends(new String[]{other.getId()}); user = users.save(user);
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(Optional.of(user)).when(stale).findByUsername("customer");
        set("status", User.AccountStatus.BANNED);
        var mvc = MockMvcBuilders.standaloneSetup(new FriendController(stale, requests, encryption)).build();
        mvc.perform(delete("/api/friends/" + other.getId())).andExpect(status().isNoContent());
        assertThat(users.findById(user.getId()).orElseThrow().getStatus()).isEqualTo(User.AccountStatus.BANNED);
        assertThat(raw().getDate("updatedAt")).isNotNull();
    }

    @Test void runnerCannotOverwriteAnEmailChangedAfterItsRead() {
        set("email", "old@example.com");
        User snapshot = users.findById(user.getId()).orElseThrow();
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(List.of(snapshot)).when(stale).findAll();
        set("email", "ENC:replacement@example.com"); set("status", User.AccountStatus.BANNED);
        new EmailMigrationRunner(stale, encryption).run(null);
        assertThat(raw().getString("email")).isEqualTo("ENC:replacement@example.com");
        assertThat(raw().getString("status")).isEqualTo("BANNED");
    }

    @Test void newsletterWritesHaveDatesAndRepeatedPreferenceIsANoOp() {
        NewsletterService service = new NewsletterService(mongo, users, encryption, "http://localhost:5173");
        service.setPreference(user, true);
        assertThat(raw().getDate("updatedAt")).isNotNull();
        user = users.findById(user.getId()).orElseThrow();
        set("updatedAt", old);
        service.setPreference(user, true);
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        String token = encryption.decrypt(user.getNewsletterTokenEncrypted());
        service.unsubscribe(token);
        assertThat(raw().getDate("updatedAt")).isAfter(Date.from(old));
        set("updatedAt", old); service.unsubscribe(token);
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
    }

    @Test void moderationUpdatesDateOnlyWhenStoredStateChanges() {
        var quota = mock(com.manaforge.api.service.AiQuotaService.class);
        when(quota.check(anyString(), eq(true))).thenReturn(new com.manaforge.api.service.AiQuotaService.QuotaResult(true, 25, 25, Instant.now()));
        var service = new com.manaforge.api.service.FrontdeskUserService(users, mock(SupportTicketRepository.class),
                mongo, encryption, quota, mock(com.manaforge.api.service.FrontdeskAuditService.class));
        OperatorPrincipal operator = new OperatorPrincipal("operator", "operator@example.com");
        var result = service.updateStatus(user.getId(), User.AccountStatus.BANNED, operator);
        assertThat(raw().getDate("updatedAt")).isNotNull();
        assertThat(result.updatedAt()).isEqualTo(raw().getDate("updatedAt").toInstant());
        set("updatedAt", old);
        service.updateStatus(user.getId(), User.AccountStatus.BANNED, operator);
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
    }

    @Test void friendsAreAtomicForLegacyNullArraysAndRepeatedOperationsAreNoOps() {
        set("friends", null);
        users.addFriend(user.getId(), "a"); users.addFriend(user.getId(), "b");
        assertThat(users.findById(user.getId()).orElseThrow().getFriends()).containsExactlyInAnyOrder("a", "b");
        set("status", User.AccountStatus.BANNED); set("updatedAt", old);
        users.addFriend(user.getId(), "a"); users.removeFriend(user.getId(), "not-a-friend");
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        users.removeFriend(user.getId(), "a");
        assertThat(users.findById(user.getId()).orElseThrow().getFriends()).containsExactly("b");
        assertThat(raw().getString("status")).isEqualTo("BANNED");
        assertThat(raw().getDate("updatedAt")).isAfter(Date.from(old));
    }

    @Test void obsoleteVerificationTokenCannotVerifyOrClearANewerRequest() throws Exception {
        set("verificationToken", "old-token"); set("validated", false);
        User snapshot = users.findById(user.getId()).orElseThrow();
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(Optional.of(snapshot)).when(stale).findByVerificationToken("old-token");
        set("verificationToken", "new-token"); set("updatedAt", old);
        mvc(stale).perform(get("/api/users/verify?token=old-token")).andExpect(status().isConflict());
        assertThat(raw().getString("verificationToken")).isEqualTo("new-token");
        assertThat(raw().getBoolean("validated")).isFalse();
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
    }

    @Test void failedProfileValidationDoesNotChangeIdentitySessionOrSendEmail() throws Exception {
        mvc(users).perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"new-name\",\"email\":\"new@example.com\"}"))
                .andExpect(status().isBadRequest());
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("customer");
        assertThat(users.findById(user.getId()).orElseThrow().getUsername()).isEqualTo("customer");
        assertThat(raw().get("updatedAt")).isNull();
        verify(emails, never()).sendEmailChangeVerificationEmail(any(), any());
    }

    @Test void runnerSuccessfulWritePreservesUnmappedFieldsAndStartsOnlyModification() {
        set("email", "old@example.com");
        set("externalMetadata", "must-survive"); set("status", User.AccountStatus.BANNED);
        new EmailMigrationRunner(users, encryption).run(null);
        assertThat(raw().getString("email")).isEqualTo("ENC:old@example.com");
        assertThat(raw().getString("externalMetadata")).isEqualTo("must-survive");
        assertThat(raw().getString("status")).isEqualTo("BANNED");
        assertThat(raw().getDate("updatedAt")).isNotNull();
        assertThat(raw().get("createdAt")).isNull();
    }

    @Test void acceptedLocalLoginReturnsPersistedDatesWithoutChangingCreation() throws Exception {
        set("createdAt", old);
        mvc(users).perform(post("/api/users/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"customer\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.createdAt").value(old.toString()))
                .andExpect(jsonPath("$.lastLoginAt").isString()).andExpect(jsonPath("$.updatedAt").isString());
        assertThat(raw().getDate("lastLoginAt")).isEqualTo(raw().getDate("updatedAt"));
        assertThat(raw().getDate("createdAt")).isEqualTo(Date.from(old));
    }

    @Test void clockIsControlledAndModificationCannotGoBackwards() {
        var writes = new UserUpdatesImpl(mongo, java.time.Clock.fixed(old, java.time.ZoneOffset.UTC));
        writes.patchUser(user.getId(), java.util.Map.of("biography", "one"), java.util.Map.of());
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        Instant future = old.plusSeconds(60); set("updatedAt", future);
        writes.patchUser(user.getId(), java.util.Map.of("biography", "two"), java.util.Map.of());
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(future));
    }

    @Test void persistenceConflictCannotChangeSessionIdentityOrSendVerificationMail() throws Exception {
        UserRepository stale = mock(UserRepository.class, org.mockito.AdditionalAnswers.delegatesTo(users));
        doReturn(Optional.of(user)).when(stale).findByUsername("customer");
        set("username", "concurrent-name"); set("updatedAt", old);
        mvc(stale).perform(patch("/api/users/me").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"new-name\",\"email\":\"new@example.com\",\"currentPassword\":\"password123\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONCURRENT_UPDATE"));
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("customer");
        assertThat(raw().getString("username")).isEqualTo("concurrent-name");
        assertThat(raw().get("pendingEmail")).isNull();
        assertThat(raw().getDate("updatedAt")).isEqualTo(Date.from(old));
        verify(emails, never()).sendEmailChangeVerificationEmail(any(), any());
    }
}
