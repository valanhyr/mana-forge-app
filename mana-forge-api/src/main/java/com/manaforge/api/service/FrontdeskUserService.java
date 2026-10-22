package com.manaforge.api.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.dto.FrontdeskUserQuery;
import com.manaforge.api.dto.FrontdeskUserQuery.SortDir;
import com.manaforge.api.dto.FrontdeskUserQuery.UserSort;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

@Service
@RequiredArgsConstructor
public class FrontdeskUserService {
    private static final List<SupportTicket.Status> OPEN_TICKET_STATUSES = List.of(
            SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS, SupportTicket.Status.WAITING_USER);
    /** Ranking derived metrics in memory is bounded so a wide query cannot exhaust the heap. */
    private static final int MAX_RANKED_USERS = 20_000;
    private static final int RECENT_DECKS = 5;

    private final UserRepository users;
    private final SupportTicketRepository tickets;
    private final MongoTemplate mongo;
    private final EmailEncryptionService encryption;
    private final AiQuotaService quota;
    private final FrontdeskAuditService audit;

    @Value("${services.frontend.url}")
    private String frontendUrl = "";

    public User requireUser(String id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    public UserView get(String id) { return view(requireUser(id)); }

    /** Detail view: one user, one set of per-user reads. */
    public UserView view(User user) {
        long deckCount = mongo.count(Query.query(Criteria.where("userId").is(user.getId())), Deck.class);
        List<DeckSummary> recent = mongo.find(Query.query(Criteria.where("userId").is(user.getId()))
                .with(Sort.by(Sort.Direction.DESC, "updatedAt", "_id")).limit(RECENT_DECKS), Deck.class).stream()
                .map(this::summary).toList();
        AiQuotaService.QuotaResult state = quota.check(user.getId(), true);
        long open = tickets.countByUserIdAndStatusIn(user.getId(), OPEN_TICKET_STATUSES);
        return buildView(user, deckCount, recent, open, state);
    }

    /**
     * Directory page. Native document fields are sorted by Mongo; derived metrics
     * (tickets, decks, AI usage) are ranked in memory over the filtered set.
     */
    public PageResult<UserView> list(FrontdeskUserQuery filters, int page, int size) {
        if (usesNativePaging(filters)) return nativePage(filters, page, size);
        return rankedPage(filters, page, size);
    }

    public UserView updateStatus(String id, User.AccountStatus status, User operator) {
        if (id.equals(operator.getId()) && status != User.AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Operators cannot disable their own account");
        }
        User user = requireUser(id);
        User.AccountStatus previous = user.effectiveStatus();
        // Partial update: do not overwrite a concurrent password/email/profile change.
        User saved = users.patchUser(id, Map.of("status", status, "active", status == User.AccountStatus.ACTIVE), Map.of());
        audit.record(operator, id, user.getUsername(), AuditEvent.Action.USER_STATUS_UPDATE,
                previous + " -> " + status, Map.of());
        return view(saved);
    }

    public UserView resetQuota(String id, User operator) {
        User user = requireUser(id);
        quota.resetAuthenticatedQuota(id);
        audit.record(operator, id, user.getUsername(), AuditEvent.Action.AI_QUOTA_RESET,
                "Daily AI quota reset", Map.of("period", "DAILY"));
        return view(user);
    }

    // ── Paging strategies ──────────────────────────────────────────────────

    private boolean usesNativePaging(FrontdeskUserQuery filters) {
        if (filters.quotaExhausted()) return false;
        return switch (filters.sort()) {
            case USERNAME, CREATED_AT, LAST_LOGIN -> true;
            case OPEN_TICKETS, AI_USAGE_TODAY, TOTAL_DECKS -> false;
        };
    }

    private PageResult<UserView> nativePage(FrontdeskUserQuery filters, int page, int size) {
        Query query = userQuery(filters);
        long total = mongo.count(query, User.class);
        query.with(nativeSort(filters));
        query.skip((long) page * size).limit(size);
        List<User> pageUsers = mongo.find(query, User.class);
        return new PageResult<>(viewPage(pageUsers, PageMetrics.empty()), page, size, total);
    }

    private Sort nativeSort(FrontdeskUserQuery filters) {
        String field = switch (filters.sort()) {
            case CREATED_AT -> "createdAt";
            case LAST_LOGIN -> "lastLoginAt";
            default -> "username";
        };
        Sort.Direction direction = filters.dir() == SortDir.DESC ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(direction, field).and(Sort.by(Sort.Direction.ASC, "_id"));
    }

    private PageResult<UserView> rankedPage(FrontdeskUserQuery filters, int page, int size) {
        long total = mongo.count(userQuery(filters), User.class);
        ensureRankable(total);

        Query candidatesQuery = userQuery(filters);
        candidatesQuery.fields().include("username", "createdAt", "lastLoginAt", "tier", "status", "active");
        List<User> candidates = new ArrayList<>(mongo.find(candidatesQuery, User.class));
        List<String> candidateIds = candidates.stream().map(User::getId).toList();

        boolean rankByTickets = filters.sort() == UserSort.OPEN_TICKETS;
        boolean rankByDecks = filters.sort() == UserSort.TOTAL_DECKS;
        boolean rankByQuota = filters.sort() == UserSort.AI_USAGE_TODAY || filters.quotaExhausted();

        Map<String, Long> ticketCounts = rankByTickets ? openTicketCounts(candidateIds) : null;
        Map<String, Long> deckCounts = rankByDecks ? deckCounts(candidateIds) : null;
        Map<String, AiQuotaService.QuotaResult> quotaStates = rankByQuota
                ? quota.checkAuthenticated(candidateIds) : null;

        if (filters.quotaExhausted()) {
            candidates.removeIf(candidate -> !hasExhaustedQuota(quotaStates, candidate.getId()));
            total = candidates.size();
            ensureRankable(total);
        }

        candidates.sort(comparator(filters, ticketCounts, deckCounts, quotaStates));

        long from = (long) page * size;
        int start = (int) Math.min(from, candidates.size());
        int end = (int) Math.min(from + size, candidates.size());
        List<String> pageIds = candidates.subList(start, end).stream().map(User::getId).toList();

        return new PageResult<>(viewPage(usersInOrder(pageIds),
                new PageMetrics(ticketCounts, null, quotaStates)), page, size, total);
    }

    private void ensureRankable(long total) {
        if (total > MAX_RANKED_USERS) {
            throw new FrontdeskBadRequestException("USER_SET_TOO_LARGE",
                    "Too many users match these filters; narrow the search to " + MAX_RANKED_USERS + " or fewer");
        }
    }

    private Comparator<User> comparator(FrontdeskUserQuery filters, Map<String, Long> ticketCounts,
                                        Map<String, Long> deckCounts,
                                        Map<String, AiQuotaService.QuotaResult> quotaStates) {
        Comparator<User> primary = switch (filters.sort()) {
            case OPEN_TICKETS -> Comparator.<User>comparingLong(user -> count(ticketCounts, user.getId()));
            case AI_USAGE_TODAY -> Comparator.<User>comparingLong(
                    user -> usedToday(quotaStates == null ? null : quotaStates.get(user.getId())));
            case TOTAL_DECKS -> Comparator.<User>comparingLong(user -> count(deckCounts, user.getId()));
            case USERNAME -> Comparator.comparing(User::getUsername,
                    Comparator.nullsFirst(Comparator.<String>naturalOrder()));
            case CREATED_AT -> Comparator.comparing(User::getCreatedAt,
                    Comparator.nullsFirst(Comparator.<Instant>naturalOrder()));
            case LAST_LOGIN -> Comparator.comparing(User::getLastLoginAt,
                    Comparator.nullsFirst(Comparator.<Instant>naturalOrder()));
        };
        if (filters.dir() == SortDir.DESC) primary = primary.reversed();
        if (filters.sort() == UserSort.OPEN_TICKETS && filters.dir() == SortDir.DESC) {
            primary = primary.thenComparing(User::getLastLoginAt,
                    Comparator.nullsLast(Comparator.<Instant>reverseOrder()));
        }
        return primary.thenComparing(User::getId, Comparator.nullsLast(Comparator.<String>naturalOrder()));
    }

    // ── Filtering ──────────────────────────────────────────────────────────

    private Query userQuery(FrontdeskUserQuery filters) {
        List<Criteria> criteria = new ArrayList<>();
        if (filters.tier() != null) criteria.add(Criteria.where("tier").is(filters.tier().name()));
        if (filters.status() != null) criteria.add(statusCriteria(filters.status()));
        if (filters.query() != null && !filters.query().isBlank()) {
            Pattern pattern = searchPattern(filters.query());
            criteria.add(new Criteria().orOperator(Criteria.where("username").regex(pattern),
                    Criteria.where("name").regex(pattern), Criteria.where("_id").is(filters.query()),
                    Criteria.where("email").is(encryption.encrypt(filters.query().trim()))));
        }
        if (criteria.isEmpty()) return new Query();
        if (criteria.size() == 1) return Query.query(criteria.getFirst());
        return Query.query(new Criteria().andOperator(criteria));
    }

    /**
     * Mirrors {@link User#effectiveStatus()}: legacy accounts only carry {@code active},
     * newer ones carry {@code status}.
     */
    private Criteria statusCriteria(User.AccountStatus status) {
        Criteria active = Criteria.where("active");
        Criteria notActive = Criteria.where("active").ne(false);
        Criteria statusActiveOrMissing = new Criteria().orOperator(
                Criteria.where("status").is(null), Criteria.where("status").is(User.AccountStatus.ACTIVE.name()));
        return switch (status) {
            case BANNED -> Criteria.where("status").is(User.AccountStatus.BANNED.name());
            case SUSPENDED -> new Criteria().orOperator(
                    Criteria.where("status").is(User.AccountStatus.SUSPENDED.name()),
                    new Criteria().andOperator(statusActiveOrMissing, active.is(false)));
            case ACTIVE -> new Criteria().andOperator(statusActiveOrMissing, notActive);
        };
    }

    private Pattern searchPattern(String search) {
        if (search.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search too long");
        return Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
    }

    // ── Batched page enrichment ────────────────────────────────────────────

    private List<UserView> viewPage(List<User> pageUsers, PageMetrics metrics) {
        if (pageUsers.isEmpty()) return List.of();
        List<String> ids = pageUsers.stream().map(User::getId).toList();
        Map<String, Long> openTickets = metrics.openTickets() != null
                ? metrics.openTickets() : openTicketCounts(ids);
        Map<String, DeckRollup> decks = metrics.decks() != null
                ? metrics.decks() : deckRollups(ids);
        Map<String, AiQuotaService.QuotaResult> quotaStates = metrics.quota() != null
                ? metrics.quota() : quota.checkAuthenticated(ids);

        return pageUsers.stream().map(user -> {
            DeckRollup rollup = decks.getOrDefault(user.getId(), new DeckRollup(0, List.of()));
            return buildView(user, rollup.total(), rollup.recent(),
                    openTickets.getOrDefault(user.getId(), 0L), quotaStates.get(user.getId()));
        }).toList();
    }

    private List<User> usersInOrder(List<String> ids) {
        if (ids.isEmpty()) return List.of();
        Map<String, User> byId = new HashMap<>();
        for (User found : mongo.find(Query.query(Criteria.where("_id").in(ids)), User.class)) {
            byId.put(found.getId(), found);
        }
        return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    private Map<String, Long> openTicketCounts(List<String> userIds) {
        if (userIds.isEmpty()) return Map.of();
        Aggregation aggregation = newAggregation(
                match(Criteria.where("userId").in(userIds).and("status").in(OPEN_TICKET_STATUSES)),
                group("userId").count().as("total"));
        return aggregateCounts(aggregation, SupportTicket.class);
    }

    private Map<String, Long> deckCounts(List<String> userIds) {
        if (userIds.isEmpty()) return Map.of();
        Aggregation aggregation = newAggregation(
                match(Criteria.where("userId").in(userIds)),
                group("userId").count().as("total"));
        return aggregateCounts(aggregation, Deck.class);
    }

    private Map<String, Long> aggregateCounts(Aggregation aggregation, Class<?> source) {
        Map<String, Long> counts = new HashMap<>();
        for (Document row : mongo.aggregate(aggregation, source, Document.class).getMappedResults()) {
            Object id = row.get("_id");
            if (id != null) counts.put(String.valueOf(id), number(row.get("total")));
        }
        return counts;
    }

    private Map<String, DeckRollup> deckRollups(List<String> userIds) {
        if (userIds.isEmpty()) return Map.of();
        Document cardCount = new Document("$sum", "$cards.quantity");
        Document deck = new Document("id", "$_id")
                .append("name", "$name")
                .append("format", "$formatId")
                .append("cardCount", cardCount)
                .append("updatedAt", "$updatedAt");
        Aggregation aggregation = newAggregation(
                match(Criteria.where("userId").in(userIds)),
                sort(Sort.Direction.DESC, "updatedAt", "_id"),
                group("userId").count().as("totalDecks").push(deck).as("decks"));

        Map<String, DeckRollup> rollups = new HashMap<>();
        for (Document row : mongo.aggregate(aggregation, Deck.class, Document.class).getMappedResults()) {
            String userId = String.valueOf(row.get("_id"));
            List<DeckSummary> recent = new ArrayList<>();
            if (row.get("decks") instanceof List<?> decks) {
                for (Object item : decks) {
                    if (recent.size() >= RECENT_DECKS) break;
                    if (item instanceof Document summary) {
                        recent.add(new DeckSummary(text(summary.get("id")), text(summary.get("name")),
                                text(summary.get("format")), (int) number(summary.get("cardCount")),
                                instant(summary.get("updatedAt"))));
                    }
                }
            }
            rollups.put(userId, new DeckRollup(number(row.get("totalDecks")), List.copyOf(recent)));
        }
        return rollups;
    }

    // ── Shared view assembly ───────────────────────────────────────────────

    private UserView buildView(User user, long deckCount, List<DeckSummary> recent, long openTickets,
                               AiQuotaService.QuotaResult state) {
        String avatar = user.getAvatar();
        if (avatar == null || !avatar.matches("ava(?:[1-9]|[1-9][0-9]|10[0-5])\\.jpg")) avatar = User.DEFAULT_AVATAR;
        String avatarUrl = frontendUrl.replaceAll("/$", "") + "/images/avatars/" + avatar;
        return new UserView(user.getId(), encryption.decrypt(user.getEmail()), user.getUsername(), avatarUrl,
                user.getTier() == null ? User.Tier.FREE : user.getTier(), user.getCreatedAt(), user.getLastLoginAt(),
                user.effectiveStatus(), stats(deckCount, state), recent, openTickets, user.getUpdatedAt());
    }

    private static UserStats stats(long deckCount, AiQuotaService.QuotaResult state) {
        boolean limited = state != null && state.limited();
        return new UserStats(deckCount, limited ? state.limit() - state.remaining() : null,
                limited ? state.limit() : null, "DAILY", state == null ? null : state.resetsAt(), null, null);
    }

    private DeckSummary summary(Deck deck) {
        int cards = deck.getCards() == null ? 0
                : deck.getCards().stream().mapToInt(Deck.DeckCardEntry::getQuantity).sum();
        return new DeckSummary(deck.getId(), deck.getName(), deck.getFormatId(), cards, deck.getUpdatedAt());
    }

    private static long count(Map<String, Long> counts, String id) {
        return counts == null ? 0L : counts.getOrDefault(id, 0L);
    }

    private static long usedToday(AiQuotaService.QuotaResult state) {
        if (state == null || !state.limited()) return 0L;
        return Math.max(0L, (long) state.limit() - state.remaining());
    }

    private static boolean hasExhaustedQuota(Map<String, AiQuotaService.QuotaResult> states, String userId) {
        AiQuotaService.QuotaResult state = states == null ? null : states.get(userId);
        return state != null && state.limited() && state.remaining() <= 0;
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Instant instant(Object value) {
        if (value instanceof Instant instant) return instant;
        if (value instanceof Date date) return date.toInstant();
        return null;
    }

    private record DeckRollup(long total, List<DeckSummary> recent) {}

    private record PageMetrics(Map<String, Long> openTickets, Map<String, DeckRollup> decks,
                               Map<String, AiQuotaService.QuotaResult> quota) {
        static PageMetrics empty() { return new PageMetrics(null, null, null); }
    }
}
