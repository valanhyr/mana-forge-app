package com.manaforge.api.service;

import com.manaforge.api.frontdesk.OperatorPrincipal;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.manaforge.api.dto.FrontdeskDtos.DeckSummary;
import com.manaforge.api.dto.FrontdeskUserQuery;
import com.manaforge.api.dto.FrontdeskUserQuery.SortDir;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.SupportTicketRepository;
import com.manaforge.api.repository.UserRepository;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Query;
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
    private OperatorPrincipal operator;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("u1");
        user.setUsername("customer");
        user.setEmail("encrypted");
        operator = new OperatorPrincipal("op1", "op1@example.com");
        when(users.findById("u1")).thenReturn(Optional.of(user));
        when(encryption.decrypt("encrypted")).thenReturn("user@example.com");
        when(encryption.encrypt(anyString())).thenAnswer(call -> "enc:" + call.getArgument(0));
        when(mongo.find(any(), eq(Deck.class))).thenReturn(List.of());
        when(quota.check("u1", true)).thenReturn(new AiQuotaService.QuotaResult(true, 25, 23, Instant.now()));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of());
        when(mongo.aggregate(any(Aggregation.class), eq(SupportTicket.class), eq(Document.class)))
                .thenReturn(results());
        when(mongo.aggregate(any(Aggregation.class), eq(Deck.class), eq(Document.class)))
                .thenReturn(results());
    }

    // ── Detail view (unchanged behaviour) ──────────────────────────────────

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
        when(users.patchUser(eq("u1"), anyMap(), anyMap())).thenAnswer(call -> {
            user.setStatus(User.AccountStatus.BANNED); user.setActive(false); return user;
        });
        var result = service.updateStatus("u1", User.AccountStatus.BANNED, operator);
        assertThat(result.status()).isEqualTo(User.AccountStatus.BANNED);
        verify(users).patchUser(eq("u1"), eq(Map.of("status", User.AccountStatus.BANNED, "active", false)), eq(Map.of()));
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

    // ── List: native path ───────────────────────────────────────────────────

    @Test
    void nativeOrderStaysInMongoAndKeepsTheFilteredTotal() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(80L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(user));
        when(quota.checkAuthenticated(anyCollection()))
                .thenReturn(Map.of("u1", new AiQuotaService.QuotaResult(true, 25, 25, Instant.now())));

        var page = service.list(FrontdeskUserQuery.defaults(null), 2, 25);

        assertThat(page.total()).isEqualTo(80);
        assertThat(page.items()).hasSize(1);
        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(captor.capture(), eq(User.class));
        assertThat(captor.getValue().getSkip()).isEqualTo(50);
        assertThat(captor.getValue().getLimit()).isEqualTo(25);
        assertThat(captor.getValue().getSortObject()).containsEntry("username", 1).containsEntry("_id", 1);
    }

    @Test
    void pageEnrichmentBatchesMetricsInsteadOfQueryingPerUser() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(1L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(user));

        service.list(FrontdeskUserQuery.defaults(null), 0, 25);

        verify(tickets, never()).countByUserIdAndStatusIn(anyString(), any());
        verify(quota, never()).check(anyString(), anyBoolean());
        verify(quota).checkAuthenticated(List.of("u1"));
        verify(mongo, times(1)).aggregate(any(Aggregation.class), eq(SupportTicket.class), eq(Document.class));
        verify(mongo, times(1)).aggregate(any(Aggregation.class), eq(Deck.class), eq(Document.class));
        verify(mongo, never()).count(any(Query.class), eq(Deck.class));
    }

    @Test
    void searchUsesQuotedLiteralAndEncryptedEmailEquality() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(0L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());

        service.list(FrontdeskUserQuery.defaults(".*"), 0, 25);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(captor.capture(), eq(User.class));
        @SuppressWarnings("unchecked")
        var clauses = (List<org.bson.Document>) captor.getValue().getQueryObject().get("$or");
        var pattern = (java.util.regex.Pattern) clauses.getFirst().get("username");
        assertThat(pattern.matcher("ordinary").find()).isFalse();
        assertThat(pattern.matcher("literal .* username").find()).isTrue();
        assertThat(clauses.getLast()).containsEntry("email", "enc:.*");
    }

    @Test
    void suspendedFilterHonoursTheLegacyActiveFlag() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(0L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());

        service.list(FrontdeskUserQuery.parse(null, null, null, null, "SUSPENDED", null), 0, 25);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(captor.capture(), eq(User.class));
        String json = captor.getValue().getQueryObject().toJson();
        assertThat(json).contains("SUSPENDED").contains("active").contains("false");
    }

    // ── List: ranked path ───────────────────────────────────────────────────

    @Test
    void openTicketsSortOrdersTheWholeFilteredSetBeforePaginating() {
        var first = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var second = account("u2", "beta", "2026-10-03T10:00:00Z");
        var third = account("u3", "gamma", "2026-10-02T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(3L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call ->
                candidateQuery(call.getArgument(0)) ? List.of(first, second, third) : List.of(second, third));
        when(mongo.aggregate(any(Aggregation.class), eq(SupportTicket.class), eq(Document.class)))
                .thenReturn(results(ticketCount("u1", 0), ticketCount("u2", 3), ticketCount("u3", 1)));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of());

        var page = service.list(FrontdeskUserQuery.parse(null, "openTickets", "desc", null, null, null), 0, 2);

        assertThat(page.total()).isEqualTo(3);
        assertThat(page.items()).extracting(view -> view.id()).containsExactly("u2", "u3");
    }

    @Test
    void openTicketsTiesBreakByMostRecentLoginThenId() {
        var older = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var newer = account("u2", "beta", "2026-10-05T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(2L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call ->
                candidateQuery(call.getArgument(0)) ? List.of(older, newer) : List.of(newer, older));
        when(mongo.aggregate(any(Aggregation.class), eq(SupportTicket.class), eq(Document.class)))
                .thenReturn(results(ticketCount("u1", 1), ticketCount("u2", 1)));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of());

        var page = service.list(FrontdeskUserQuery.parse(null, "openTickets", "desc", null, null, null), 0, 10);

        assertThat(page.items()).extracting(view -> view.id()).containsExactly("u2", "u1");
    }

    @Test
    void aiUsageSortUsesTodaysAuthenticatedCounter() {
        var low = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var high = account("u2", "beta", "2026-10-01T10:00:00Z");
        var idle = account("u3", "gamma", "2026-10-01T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(3L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call ->
                candidateQuery(call.getArgument(0)) ? List.of(low, high, idle) : List.of(high, low, idle));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of(
                "u1", new AiQuotaService.QuotaResult(true, 25, 20, Instant.now()),
                "u2", new AiQuotaService.QuotaResult(true, 25, 15, Instant.now()),
                "u3", new AiQuotaService.QuotaResult(true, 25, 25, Instant.now())));

        var page = service.list(FrontdeskUserQuery.parse(null, "aiUsageToday", "desc", null, null, null), 0, 10);

        assertThat(page.items()).extracting(view -> view.id()).containsExactly("u2", "u1", "u3");
    }

    @Test
    void consecutiveRankedPagesDoNotRepeatOrSkipUsers() {
        var oldest = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var second = account("u2", "beta", "2026-10-02T10:00:00Z");
        var third = account("u3", "gamma", "2026-10-03T10:00:00Z");
        var newest = account("u4", "delta", "2026-10-04T10:00:00Z");
        var all = List.of(oldest, second, third, newest);
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(4L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call -> all);
        when(mongo.aggregate(any(Aggregation.class), eq(SupportTicket.class), eq(Document.class)))
                .thenReturn(results(ticketCount("u1", 1), ticketCount("u2", 1),
                        ticketCount("u3", 1), ticketCount("u4", 1)));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of());

        var filters = FrontdeskUserQuery.parse(null, "openTickets", "desc", null, null, null);
        var firstPage = service.list(filters, 0, 2).items().stream().map(view -> view.id()).toList();
        var secondPage = service.list(filters, 1, 2).items().stream().map(view -> view.id()).toList();

        assertThat(firstPage).containsExactly("u4", "u3");
        assertThat(secondPage).containsExactly("u2", "u1");
        assertThat(firstPage).doesNotContainAnyElementsOf(secondPage);
        assertThat(List.of(firstPage, secondPage).stream().flatMap(List::stream).toList())
                .containsExactlyInAnyOrderElementsOf(all.stream().map(User::getId).toList());
    }

    @Test
    void deckSortOrdersByTotalDecksAcrossTheFilteredSet() {
        var small = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var large = account("u2", "beta", "2026-10-01T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(2L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call ->
                candidateQuery(call.getArgument(0)) ? List.of(small, large) : List.of(large, small));
        when(mongo.aggregate(any(Aggregation.class), eq(Deck.class), eq(Document.class)))
                .thenAnswer(call -> isRollup(call.getArgument(0))
                        ? results(deckRollup("u1", 3), deckRollup("u2", 25))
                        : results(deckCount("u1", 3), deckCount("u2", 25)));

        var page = service.list(FrontdeskUserQuery.parse(null, "totalDecks", "desc", null, null, null), 0, 10);

        assertThat(page.items()).extracting(view -> view.id()).containsExactly("u2", "u1");
        assertThat(page.items().getFirst().stats().totalDecks()).isEqualTo(25);
    }

    @Test
    void exhaustedQuotaFilterNarrowsItemsAndTotal() {
        var exhausted = account("u1", "alpha", "2026-10-01T10:00:00Z");
        var available = account("u2", "beta", "2026-10-01T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(2L);
        when(mongo.find(any(Query.class), eq(User.class))).thenAnswer(call ->
                candidateQuery(call.getArgument(0)) ? List.of(exhausted, available) : List.of(exhausted));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of(
                "u1", new AiQuotaService.QuotaResult(false, 25, 0, Instant.now()),
                "u2", new AiQuotaService.QuotaResult(true, 25, 4, Instant.now())));

        var page = service.list(FrontdeskUserQuery.parse(null, null, null, null, null, "exhausted"), 0, 25);

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.items()).extracting(view -> view.id()).containsExactly("u1");
        verify(quota, times(1)).checkAuthenticated(List.of("u1", "u2"));
    }

    @Test
    void unlimitedQuotaIsNeverExhausted() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(1L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(user));
        when(quota.checkAuthenticated(anyCollection())).thenReturn(Map.of(
                "u1", new AiQuotaService.QuotaResult(true, -1, -1, null)));

        var page = service.list(FrontdeskUserQuery.parse(null, null, null, null, null, "exhausted"), 0, 25);

        assertThat(page.total()).isZero();
        assertThat(page.items()).isEmpty();
    }

    @Test
    void unreasonablyLargeRankedSetsFailInsteadOfTruncating() {
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(20_001L);

        assertThatThrownBy(() -> service.list(FrontdeskUserQuery.parse(null, "openTickets", "desc", null, null, null), 0, 25))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("USER_SET_TOO_LARGE"));
        verify(mongo, never()).find(any(Query.class), eq(User.class));
        verify(mongo, never()).aggregate(any(Aggregation.class), any(Class.class), eq(Document.class));
    }

    @Test
    void recentDecksAreCappedAtFivePerUser() {
        var other = account("u2", "beta", "2026-10-01T10:00:00Z");
        when(mongo.count(any(Query.class), eq(User.class))).thenReturn(2L);
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of(user, other));
        var rollup = new Document("_id", "u1")
                .append("totalDecks", 6L)
                .append("decks", List.of(
                        deckSummary("d1", 1), deckSummary("d2", 2), deckSummary("d3", 3),
                        deckSummary("d4", 4), deckSummary("d5", 5), deckSummary("d6", 6)));
        when(mongo.aggregate(any(Aggregation.class), eq(Deck.class), eq(Document.class)))
                .thenReturn(results(rollup));

        var page = service.list(FrontdeskUserQuery.defaults(null), 0, 25);

        DeckSummary first = page.items().getFirst().recentDecks().getFirst();
        assertThat(first.id()).isEqualTo("d1");
        assertThat(page.items().getFirst().recentDecks()).hasSize(5);
        assertThat(page.items().getFirst().stats().totalDecks()).isEqualTo(6);
        assertThat(page.items().getFirst().recentDecks()).noneMatch(deck -> deck.id().equals("d6"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static User account(String id, String username, String lastLogin) {
        var account = new User();
        account.setId(id);
        account.setUsername(username);
        account.setEmail("enc:" + id);
        account.setTier(User.Tier.FREE);
        account.setStatus(User.AccountStatus.ACTIVE);
        account.setActive(true);
        account.setLastLoginAt(Instant.parse(lastLogin));
        return account;
    }

    private static boolean candidateQuery(Query query) {
        return !query.getFieldsObject().isEmpty();
    }

    private static boolean isRollup(Aggregation aggregation) {
        return aggregation.toString().contains("$push");
    }

    @SafeVarargs
    private static AggregationResults<Document> results(Document... documents) {
        return new AggregationResults<>(List.of(documents), new Document());
    }

    private static Document ticketCount(String userId, long total) {
        return new Document("_id", userId).append("total", total);
    }

    private static Document deckCount(String userId, long total) {
        return new Document("_id", userId).append("total", total);
    }

    private static Document deckRollup(String userId, long total) {
        return new Document("_id", userId).append("totalDecks", total).append("decks", List.of());
    }

    private static Document deckSummary(String id, int quantity) {
        return new Document("id", id).append("name", "Deck " + id).append("format", "Premodern")
                .append("cardCount", quantity * 60)
                .append("updatedAt", Date.from(Instant.parse("2026-10-0" + quantity + "T10:00:00Z")));
    }
}
