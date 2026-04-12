package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Message;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Requires MongoConfig to have @Profile("!test") so Flapdoodle embedded MongoDB is used.
 */
@DataMongoTest
@ActiveProfiles("test")
class MessageRepositoryTest {

    @Autowired
    private MessageRepository messageRepository;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAll();
    }

    private Message createMessage(String senderId, String receiverId, boolean read) {
        Message msg = new Message(senderId, receiverId, "Hello!");
        if (read) {
            msg.setReadAt(LocalDateTime.now());
        }
        return messageRepository.save(msg);
    }

    @Test
    void findAllByParticipant_returnsMessagesWherUserIsSenderOrReceiver() {
        createMessage("user1", "user2", false);
        createMessage("user3", "user1", false);
        createMessage("user2", "user3", false); // user1 not involved

        List<Message> result = messageRepository.findAllByParticipant("user1");

        assertThat(result).hasSize(2);
    }

    @Test
    void findAllByParticipant_excludesUnrelatedMessages() {
        createMessage("user2", "user3", false);
        createMessage("user3", "user2", false);

        List<Message> result = messageRepository.findAllByParticipant("user1");

        assertThat(result).isEmpty();
    }

    @Test
    void countByReceiverIdAndReadAtIsNull_countsOnlyUnreadMessages() {
        createMessage("user1", "user2", false); // unread
        createMessage("user1", "user2", false); // unread
        createMessage("user1", "user2", true);  // read

        long count = messageRepository.countByReceiverIdAndReadAtIsNull("user2");

        assertThat(count).isEqualTo(2);
    }

    @Test
    void countByReceiverIdAndReadAtIsNull_returnsZeroWhenAllRead() {
        createMessage("user1", "user2", true);
        createMessage("user1", "user2", true);

        long count = messageRepository.countByReceiverIdAndReadAtIsNull("user2");

        assertThat(count).isEqualTo(0);
    }

    @Test
    void findBySenderIdAndReceiverId_returnsCorrectConversationMessages() {
        createMessage("user1", "user2", false);
        createMessage("user1", "user2", false);
        createMessage("user2", "user1", false); // reverse direction — different pair

        List<Message> result = messageRepository.findBySenderIdAndReceiverId("user1", "user2");

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(m -> m.getSenderId().equals("user1") && m.getReceiverId().equals("user2"));
    }
}
