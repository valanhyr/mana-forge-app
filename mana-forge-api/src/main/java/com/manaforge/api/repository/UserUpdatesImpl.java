package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.User;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Dates are explicit: auditing callbacks do not run for direct Mongo updates. */
public class UserUpdatesImpl implements UserUpdates {
    private static final Set<String> FIELDS = Set.of("biography", "avatar", "betaAccepted", "username",
            "password", "email", "pendingEmail", "verificationToken", "validated", "status", "active",
            "newsletterSubscribed", "newsletterConsentAt", "newsletterTokenHash", "newsletterTokenEncrypted");
    private final MongoTemplate mongo;
    private final Clock clock;

    @Autowired
    public UserUpdatesImpl(MongoTemplate mongo) { this(mongo, Clock.systemUTC()); }

    public UserUpdatesImpl(MongoTemplate mongo, Clock clock) { this.mongo = mongo; this.clock = clock; }

    private Instant now() { return clock.instant().truncatedTo(ChronoUnit.MILLIS); }
    private Query byId(String id) { return Query.query(Criteria.where("_id").is(id)); }
    private Query expected(String id, Map<String, Object> expected) {
        Query query = byId(id);
        expected.forEach((field, value) -> query.addCriteria(
                // Missing/null legacy preference means not subscribed, just like the model default.
                "newsletterSubscribed".equals(field) && !Boolean.TRUE.equals(value)
                        ? Criteria.where(field).ne(true) : Criteria.where(field).is(value)));
        return query;
    }

    @Override
    public User patchUser(String id, Map<String, Object> changes, Map<String, Object> expected) {
        if (!FIELDS.containsAll(changes.keySet()) || !FIELDS.containsAll(expected.keySet())) {
            throw new IllegalArgumentException("Unsupported user update field");
        }
        Query query = expected(id, expected);
        if (!changes.isEmpty()) {
            Criteria[] differences = changes.entrySet().stream()
                    .map(entry -> Criteria.where(entry.getKey()).ne(entry.getValue())).toArray(Criteria[]::new);
            query.addCriteria(new Criteria().orOperator(differences));
            Update update = new Update().max("updatedAt", now());
            changes.forEach(update::set);
            User saved = mongo.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), User.class);
            if (saved != null) return saved;
        }
        // A no-op is a read, not a date write. Recheck preconditions after any race.
        User current = mongo.findOne(expected(id, expected), User.class);
        if (current != null) return current;
        if (!mongo.exists(byId(id), User.class)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        throw new ResponseStatusException(HttpStatus.CONFLICT, "CONCURRENT_UPDATE");
    }

    @Override
    public User updateLastLoginAt(String id, Instant timestamp) {
        Instant date = timestamp.truncatedTo(ChronoUnit.MILLIS);
        Query query = byId(id);
        query.addCriteria(new Criteria().orOperator(Criteria.where("lastLoginAt").is(null),
                Criteria.where("lastLoginAt").lt(date)));
        User saved = mongo.findAndModify(query, new Update().max("lastLoginAt", date).max("updatedAt", date),
                FindAndModifyOptions.options().returnNew(true), User.class);
        if (saved != null) return saved;
        User current = mongo.findById(id, User.class);
        if (current == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return current;
    }

    @Override
    public void addFriend(String id, String friendId) {
        // Legacy null arrays cannot be targeted by $addToSet; normalize only this field.
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("friends").is(null)),
                new Update().set("friends", new String[0]).max("updatedAt", now()), User.class);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("friends").ne(friendId)),
                new Update().addToSet("friends", friendId).max("updatedAt", now()), User.class);
    }

    @Override
    public void removeFriend(String id, String friendId) {
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("friends").is(friendId)),
                new Update().pull("friends", friendId).max("updatedAt", now()), User.class);
    }

    @Override
    public boolean encryptLegacyEmail(String id, String originalEmail, String encryptedEmail) {
        if (originalEmail.equals(encryptedEmail)) return false;
        return mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("email").is(originalEmail)),
                new Update().set("email", encryptedEmail).max("updatedAt", now()), User.class).getModifiedCount() > 0;
    }
}
