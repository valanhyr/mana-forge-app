package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.FriendRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends MongoRepository<FriendRequest, String> {

    List<FriendRequest> findByReceiverIdAndStatus(String receiverId, String status);
    List<FriendRequest> findBySenderIdAndStatus(String senderId, String status);
    Optional<FriendRequest> findBySenderIdAndReceiverId(String senderId, String receiverId);
}
