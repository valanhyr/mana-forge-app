package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import com.mongodb.client.result.UpdateResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Profile;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Backfills missing (non-nullable-in-practice) user fields created by older signup flows.
 *
 * MongoDB documents may legitimately omit fields; however parts of the app assume these fields exist
 * and some frontend models expect them to be present. This runs once at startup to normalize old data.
 */
@Service
@Profile("!test")
public class UserDocumentBackfillService {

    private static final Logger log = LoggerFactory.getLogger(UserDocumentBackfillService.class);

    private final MongoTemplate mongoTemplate;

    public UserDocumentBackfillService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backfillOnStartup() {
        Thread.ofVirtual().name("user-backfill").start(() -> {
            try {
                UpdateResult friends = backfillIfMissingOrNull("friends", new String[0]);
                UpdateResult biography = backfillIfMissingOrNull("biography", "");
                UpdateResult betaAccepted = backfillIfMissingOrNull("betaAccepted", false);
                UpdateResult active = backfillIfMissingOrNull("active", true);
                UpdateResult avatar = backfillIfMissingOrNull("avatar", User.DEFAULT_AVATAR);

                long modified = friends.getModifiedCount()
                        + biography.getModifiedCount()
                        + betaAccepted.getModifiedCount()
                        + active.getModifiedCount()
                        + avatar.getModifiedCount();

                if (modified > 0) {
                    log.info("User backfill complete — modified {} fields across documents.", modified);
                }
            } catch (Exception e) {
                log.warn("User backfill failed: {}", e.getMessage(), e);
            }
        });
    }

    private UpdateResult backfillIfMissingOrNull(String field, Object defaultValue) {
        Query q = new Query(new Criteria().orOperator(
                Criteria.where(field).exists(false),
                Criteria.where(field).is(null)
        ));
        Update u = new Update().set(field, defaultValue);
        return mongoTemplate.updateMulti(q, u, User.class);
    }
}
