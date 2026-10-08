package com.manaforge.api.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import com.manaforge.api.model.mongo.*;
import com.manaforge.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FrontdeskUserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final SupportTicketRepository tickets = mock(SupportTicketRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final AiQuotaService quota = mock(AiQuotaService.class);
    private final FrontdeskAuditService audit = mock(FrontdeskAuditService.class);
    private final FrontdeskUserService service = new FrontdeskUserService(users, tickets, mongo, encryption, quota, audit);
    private User user;
    private User operator;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("u1");
        user.setUsername("customer");
        user.setEmail("encrypted");
        operator = new User();
        operator.setId("op1");
        when(users.findById("u1")).thenReturn(Optional.of(user));
        when(encryption.decrypt("encrypted")).thenReturn("user@example.com");
        when(mongo.find(any(), eq(Deck.class))).thenReturn(List.of());
        when(quota.check("u1", true)).thenReturn(new AiQuotaService.QuotaResult(true, 25, 23, Instant.now()));
    }

    @Test
    void legacyUserHasUnknownDatesAndDailyNotFabricatedMonthlyStats() {
        var result = service.get("u1");
        assertThat(result.createdAt()).isNull();
        assertThat(result.lastLoginAt()).isNull();
        assertThat(result.avatarUrl()).endsWith("/images/avatars/ava1.jpg");
        assertThat(result.stats().aiQueriesToday()).isEqualTo(2);
        assertThat(result.stats().aiQuotaPeriod()).isEqualTo("DAILY");
        assertThat(result.stats().aiQueriesThisMonth()).isNull();
        assertThat(result.stats().failedImportsCount()).isNull();
    }

    @Test
    void statusUpdateIsPartialAndAudited() {
        var result = service.updateStatus("u1", User.AccountStatus.BANNED, operator);
        assertThat(result.status()).isEqualTo(User.AccountStatus.BANNED);
        verify(mongo).updateFirst(any(), any(), eq(User.class));
        verify(users, never()).save(any());
        verify(audit).record(same(operator), eq("u1"), eq("customer"), eq(AuditEvent.Action.USER_STATUS_UPDATE), anyString(), anyMap());
    }

    @Test
    void operatorsCannotDisableThemselves() {
        assertThatThrownBy(() -> service.updateStatus("op1", User.AccountStatus.SUSPENDED, operator))
                .isInstanceOf(ResponseStatusException.class);
        verify(mongo, never()).updateFirst(any(), any(), eq(User.class));
    }

    @Test
    void quotaResetDelegatesToRealDailyCounterAndAudit() {
        service.resetQuota("u1", operator);
        verify(quota).resetAuthenticatedQuota("u1");
        verify(audit).record(same(operator), eq("u1"), eq("customer"), eq(AuditEvent.Action.AI_QUOTA_RESET), anyString(), anyMap());
    }
}
