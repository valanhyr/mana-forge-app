package com.manaforge.api.service;

import java.util.List;
import java.util.Map;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FrontdeskUserService {
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

    public UserView view(User user) {
        Query deckQuery = Query.query(Criteria.where("userId").is(user.getId()));
        long deckCount = mongo.count(deckQuery, Deck.class);
        List<DeckSummary> recent = mongo.find(Query.query(Criteria.where("userId").is(user.getId()))
                .with(Sort.by(Sort.Direction.DESC, "updatedAt", "_id")).limit(5), Deck.class).stream()
                .map(deck -> new DeckSummary(deck.getId(), deck.getName(), deck.getFormatId(),
                        deck.getCards() == null ? 0 : deck.getCards().stream().mapToInt(Deck.DeckCardEntry::getQuantity).sum(),
                        deck.getUpdatedAt())).toList();
        AiQuotaService.QuotaResult state = quota.check(user.getId(), true);
        UserStats stats = new UserStats(deckCount, state.limited() ? state.limit() - state.remaining() : null,
                state.limited() ? state.limit() : null, "DAILY", state.resetsAt(), null, null);
        long open = tickets.countByUserIdAndStatusIn(user.getId(), List.of(SupportTicket.Status.OPEN,
                SupportTicket.Status.IN_PROGRESS, SupportTicket.Status.WAITING_USER));
        String avatar = user.getAvatar();
        if (avatar == null || !avatar.matches("ava(?:[1-9]|[1-9][0-9]|10[0-5])\\.jpg")) avatar = User.DEFAULT_AVATAR;
        String avatarUrl = frontendUrl.replaceAll("/$", "") + "/images/avatars/" + avatar;
        return new UserView(user.getId(), encryption.decrypt(user.getEmail()), user.getUsername(), avatarUrl,
                user.getTier() == null ? User.Tier.FREE : user.getTier(), user.getCreatedAt(), user.getLastLoginAt(),
                user.effectiveStatus(), stats, recent, open);
    }

    public UserView updateStatus(String id, User.AccountStatus status, User operator) {
        if (id.equals(operator.getId()) && status != User.AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Operators cannot disable their own account");
        }
        User user = requireUser(id);
        User.AccountStatus previous = user.effectiveStatus();
        // Partial update: do not overwrite a concurrent password/email/profile change.
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id)),
                new Update().set("status", status).set("active", status == User.AccountStatus.ACTIVE), User.class);
        user.setStatus(status);
        user.setActive(status == User.AccountStatus.ACTIVE);
        audit.record(operator, id, user.getUsername(), AuditEvent.Action.USER_STATUS_UPDATE,
                previous + " -> " + status, Map.of());
        return view(user);
    }

    public UserView resetQuota(String id, User operator) {
        User user = requireUser(id);
        quota.resetAuthenticatedQuota(id);
        audit.record(operator, id, user.getUsername(), AuditEvent.Action.AI_QUOTA_RESET,
                "Daily AI quota reset", Map.of("period", "DAILY"));
        return view(user);
    }
}
