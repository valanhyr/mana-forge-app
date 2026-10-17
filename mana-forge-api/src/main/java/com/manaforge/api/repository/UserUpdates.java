package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.User;
import java.time.Instant;
import java.util.Map;

/** Internal write operations: no replacement of previously read user documents. */
public interface UserUpdates {
    User patchUser(String id, Map<String, Object> changes, Map<String, Object> expected);
    User updateLastLoginAt(String id, Instant timestamp);
    void addFriend(String id, String friendId);
    void removeFriend(String id, String friendId);
    boolean encryptLegacyEmail(String id, String originalEmail, String encryptedEmail);
}
