package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Requires MongoConfig to have @Profile("!test") so Flapdoodle embedded MongoDB is used.
 */
@DataMongoTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    private User createUser(String username, String email, String token) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setVerificationToken(token);
        user.setName("Test User");
        user.setPassword("hash");
        return userRepository.save(user);
    }

    @Test
    void findByUsername_returnsCorrectUser() {
        createUser("jdoe", "jdoe@example.com", "tok1");

        Optional<User> result = userRepository.findByUsername("jdoe");

        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("jdoe");
    }

    @Test
    void findByUsername_returnsEmptyWhenNotFound() {
        Optional<User> result = userRepository.findByUsername("nonexistent");

        assertThat(result).isEmpty();
    }

    @Test
    void findByEmail_returnsCorrectUser() {
        createUser("alice", "alice@example.com", "tok2");

        Optional<User> result = userRepository.findByEmail("alice@example.com");

        assertThat(result).isPresent();
        assertThat(result.get().getEmail()).isEqualTo("alice@example.com");
    }

    @Test
    void findByVerificationToken_returnsUserWithMatchingToken() {
        createUser("bob", "bob@example.com", "unique-token-123");

        Optional<User> result = userRepository.findByVerificationToken("unique-token-123");

        assertThat(result).isPresent();
        assertThat(result.get().getUsername()).isEqualTo("bob");
    }

    @Test
    void findByVerificationToken_returnsEmptyWhenTokenNotFound() {
        Optional<User> result = userRepository.findByVerificationToken("nonexistent-token");

        assertThat(result).isEmpty();
    }
}
