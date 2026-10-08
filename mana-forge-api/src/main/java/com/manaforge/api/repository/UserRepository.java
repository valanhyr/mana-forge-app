package com.manaforge.api.repository;

import java.util.Optional;
import java.time.Instant;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;

import com.manaforge.api.model.mongo.User;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByVerificationToken(String verificationToken);

    @Query("{ '_id': ?0 }")
    @Update("{ '$set': { 'lastLoginAt': ?1 } }")
    void updateLastLoginAt(String id, Instant timestamp);
}
