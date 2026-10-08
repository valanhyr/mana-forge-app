package com.manaforge.api.service;

import com.manaforge.api.dto.FrontdeskDtos.PageResult;
import com.manaforge.api.model.mongo.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Explicit consent only. Tokens are private, encrypted at rest and looked up by hash. */
@Service
public class NewsletterService {
    public record Subscriber(String id, String username, String email, User.Tier tier) {}
    private final MongoTemplate mongo;
    private final EmailEncryptionService encryption;
    private final String frontendUrl;

    public NewsletterService(MongoTemplate mongo, EmailEncryptionService encryption,
                             @Value("${services.frontend.url}") String frontendUrl) {
        this.mongo = mongo;
        this.encryption = encryption;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    public void setPreference(User user, boolean subscribed) {
        Update update = new Update().set("newsletterSubscribed", subscribed);
        if (subscribed && (!Boolean.TRUE.equals(user.getNewsletterSubscribed()) || user.getNewsletterTokenEncrypted() == null)) {
            String token = UUID.randomUUID().toString();
            update.set("newsletterConsentAt", Instant.now()).set("newsletterTokenHash", hash(token))
                    .set("newsletterTokenEncrypted", encryption.encrypt(token));
        }
        mongo.updateFirst(Query.query(Criteria.where("_id").is(user.getId())), update, User.class);
    }

    public void unsubscribe(String token) {
        if (token == null || !token.matches("[a-fA-F0-9-]{36}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid unsubscribe token");
        }
        // Idempotent and non-disclosing: an expired/unknown token gets the same response.
        mongo.updateFirst(Query.query(Criteria.where("newsletterTokenHash").is(hash(token))),
                new Update().set("newsletterSubscribed", false), User.class);
    }

    public static boolean eligible(User user) {
        return user != null && Boolean.TRUE.equals(user.getNewsletterSubscribed())
                && Boolean.TRUE.equals(user.getValidated()) && user.effectiveStatus() == User.AccountStatus.ACTIVE
                && user.getNewsletterTokenEncrypted() != null;
    }

    public String unsubscribeUrl(User user) {
        // Fragment keeps the bearer token out of access logs and Referer headers.
        return frontendUrl + "/newsletter/unsubscribe#" + encryption.decrypt(user.getNewsletterTokenEncrypted());
    }

    public PageResult<Subscriber> subscribers(String search, User.Tier tier, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (search != null && search.length() > 200)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination or search");
        }
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("newsletterSubscribed").is(true)
                .and("validated").is(true).and("active").ne(false)
                .and("status").nin(User.AccountStatus.SUSPENDED, User.AccountStatus.BANNED)
                .and("newsletterTokenEncrypted").ne(null));
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
        return new PageResult<>(mongo.find(query, User.class).stream().map(user -> new Subscriber(user.getId(),
                user.getUsername(), encryption.decrypt(user.getEmail()), user.getTier() == null ? User.Tier.FREE : user.getTier())).toList(), page, size, total);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
