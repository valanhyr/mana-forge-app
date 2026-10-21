package com.manaforge.api.service;

import com.manaforge.api.dto.FrontdeskDtos.PageResult;
import com.manaforge.api.model.mongo.User;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Service notices: verified, active accounts only. Newsletter consent is deliberately not consulted. */
@Service
public class AnnouncementService {
    public record Recipient(String id, String username, String email, User.Tier tier) {}
    private final MongoTemplate mongo;
    private final EmailEncryptionService encryption;

    public AnnouncementService(MongoTemplate mongo, EmailEncryptionService encryption) {
        this.mongo = mongo;
        this.encryption = encryption;
    }

    public static boolean eligible(User user) {
        return user != null && Boolean.TRUE.equals(user.getValidated())
                && user.effectiveStatus() == User.AccountStatus.ACTIVE;
    }

    public PageResult<Recipient> recipients(String search, User.Tier tier, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (search != null && search.length() > 200)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination or search");
        }
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("validated").is(true).and("active").ne(false)
                .and("status").nin(User.AccountStatus.SUSPENDED, User.AccountStatus.BANNED));
        if (tier == User.Tier.FREE) {
            filters.add(new Criteria().orOperator(Criteria.where("tier").is(User.Tier.FREE), Criteria.where("tier").is(null)));
        } else if (tier != null) filters.add(Criteria.where("tier").is(tier));
        if (search != null && !search.isBlank()) {
            Pattern pattern = Pattern.compile(Pattern.quote(search.trim()), Pattern.CASE_INSENSITIVE);
            filters.add(new Criteria().orOperator(Criteria.where("username").regex(pattern),
                    Criteria.where("email").is(encryption.encrypt(search.trim()))));
        }
        Query query = Query.query(new Criteria().andOperator(filters));
        long total = mongo.count(query, User.class);
        query.with(Sort.by("username", "_id")).skip((long) page * size).limit(size);
        return new PageResult<>(mongo.find(query, User.class).stream().map(user -> new Recipient(user.getId(),
                user.getUsername(), encryption.decrypt(user.getEmail()), user.getTier() == null ? User.Tier.FREE : user.getTier())).toList(), page, size, total);
    }
}
