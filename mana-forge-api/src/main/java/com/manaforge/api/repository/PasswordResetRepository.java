package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.PasswordReset;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface PasswordResetRepository extends MongoRepository<PasswordReset, String> {
    Optional<PasswordReset> findByTokenHash(String tokenHash);
    void deleteAllByExpiresAtBefore(Instant cutoff);
}
