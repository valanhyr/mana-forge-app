package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findBySenderIdAndReceiverId(String senderId, String receiverId);

    List<Message> findBySenderId(String senderId);

    List<Message> findByReceiverId(String receiverId);

    /** Todos los mensajes donde el usuario participa (sender O receiver) — 1 sola query */
    @Query("{ '$or': [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    List<Message> findAllByParticipant(String userId);

    List<Message> findByReceiverIdAndReadAtIsNull(String receiverId);

    long countByReceiverIdAndReadAtIsNull(String receiverId);
}
