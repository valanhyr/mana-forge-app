package com.manaforge.api.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FrontdeskQueryService {
    private final MongoTemplate mongo;
    private final SupportTicketService tickets;
    private final FrontdeskUserService users;
    private final EmailEncryptionService encryption;

    public PageResult<TicketView> tickets(SupportTicket.Status status, SupportTicket.Priority priority,
                                          String userId, String search, int page, int size) {
        return tickets(status, priority, null, userId, search, page, size);
    }

    public PageResult<TicketView> tickets(SupportTicket.Status status, SupportTicket.Priority priority,
                                          SupportTicket.Category category, String userId, String search, int page, int size) {
        validatePagination(page, size);
        List<Criteria> filters = new ArrayList<>();
        if (status != null) filters.add(Criteria.where("status").is(status));
        if (priority != null) filters.add(Criteria.where("priority").is(priority));
        if (category != null) filters.add(Criteria.where("category").is(category));
        if (userId != null && !userId.isBlank()) filters.add(Criteria.where("userId").is(userId));
        if (search != null && !search.isBlank()) {
            Pattern pattern = searchPattern(search);
            filters.add(new Criteria().orOperator(Criteria.where("subject").regex(pattern),
                    Criteria.where("userName").regex(pattern), Criteria.where("_id").is(search),
                    Criteria.where("userEmail").is(encryption.encrypt(search.trim()))));
        }
        Query query = query(filters);
        long total = mongo.count(query, SupportTicket.class);
        query.with(Sort.by(Sort.Direction.DESC, "updatedAt", "_id"));
        query.fields().exclude("messages"); // List summaries; full conversation is available on GET /{id}.
        paginate(query, page, size);
        return new PageResult<>(mongo.find(query, SupportTicket.class).stream().map(tickets::view).toList(), page, size, total);
    }

    public PageResult<UserView> users(String search, int page, int size) {
        validatePagination(page, size);
        Query query = new Query();
        if (search != null && !search.isBlank()) {
            Pattern pattern = searchPattern(search);
            query.addCriteria(new Criteria().orOperator(Criteria.where("username").regex(pattern),
                    Criteria.where("name").regex(pattern), Criteria.where("_id").is(search),
                    Criteria.where("email").is(encryption.encrypt(search.trim()))));
        }
        long total = mongo.count(query, User.class);
        query.with(Sort.by(Sort.Direction.ASC, "username", "_id"));
        paginate(query, page, size);
        return new PageResult<>(mongo.find(query, User.class).stream().map(users::view).toList(), page, size, total);
    }

    public PageResult<AuditEvent> audit(String userId, AuditEvent.Action action, int page, int size) {
        List<Criteria> filters = new ArrayList<>();
        if (userId != null && !userId.isBlank()) filters.add(Criteria.where("targetUserId").is(userId));
        if (action != null) filters.add(Criteria.where("action").is(action));
        return list(query(filters), AuditEvent.class, "timestamp", page, size);
    }

    public PageResult<EmailDelivery> deliveries(String ticketId, int page, int size) {
        Query query = ticketId == null ? new Query() : Query.query(Criteria.where("ticketId").is(ticketId));
        return list(query, EmailDelivery.class, "createdAt", page, size);
    }

    private <T> PageResult<T> list(Query query, Class<T> type, String dateField, int page, int size) {
        validatePagination(page, size);
        long total = mongo.count(query, type);
        query.with(Sort.by(Sort.Direction.DESC, dateField, "_id"));
        paginate(query, page, size);
        return new PageResult<>(mongo.find(query, type), page, size, total);
    }

    private Query query(List<Criteria> filters) {
        return filters.isEmpty() ? new Query() : Query.query(new Criteria().andOperator(filters));
    }

    private Pattern searchPattern(String search) {
        if (search.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search too long");
        return Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
    }

    private void paginate(Query query, int page, int size) {
        query.skip((long) page * size).limit(size);
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be >= 0 and size between 1 and 100");
        }
    }
}
