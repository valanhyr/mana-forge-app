package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Follow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends MongoRepository<Follow, String> {

    List<Follow> findByFollowerId(String followerId);
    List<Follow> findByFollowingId(String followingId);
    Optional<Follow> findByFollowerIdAndFollowingId(String followerId, String followingId);
    long countByFollowingId(String followingId);
    long countByFollowerId(String followerId);
}
