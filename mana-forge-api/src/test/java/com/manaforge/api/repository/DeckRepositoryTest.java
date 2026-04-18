package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Deck;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Requires MongoConfig to have @Profile("!test") so Flapdoodle embedded MongoDB is used.
 */
@DataMongoTest
@ActiveProfiles("test")
class DeckRepositoryTest {

    @Autowired
    private DeckRepository deckRepository;

    @BeforeEach
    void setUp() {
        deckRepository.deleteAll();
    }

    private Deck createDeck(String name, String userId, boolean isPrivate, String formatId) {
        Deck deck = new Deck();
        deck.setName(name);
        deck.setUserId(userId);
        deck.setPrivate(isPrivate);
        deck.setFormatId(formatId);
        deck.setCards(List.of());
        return deckRepository.save(deck);
    }

    @Test
    void findByUserId_returnsOnlyDecksForThatUser() {
        createDeck("Deck A", "user1", false, "fmt1");
        createDeck("Deck B", "user1", false, "fmt1");
        createDeck("Deck C", "user2", false, "fmt1");

        List<Deck> result = deckRepository.findByUserId("user1");

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(d -> d.getUserId().equals("user1"));
    }

    @Test
    void findByIsPrivateFalse_excludesPrivateDecks() {
        createDeck("Public", "user1", false, "fmt1");
        createDeck("Private", "user2", true, "fmt1");

        List<Deck> result = deckRepository.findByIsPrivateFalse();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Public");
    }

    @Test
    void findByIsPrivateFalseAndNameContainingIgnoreCase_matchesCaseInsensitive() {
        createDeck("Lightning Storm", "user1", false, "fmt1");
        createDeck("Burn Deck", "user1", false, "fmt1");
        createDeck("Secret Lightning", "user1", true, "fmt1");

        List<Deck> result = deckRepository.findByIsPrivateFalseAndNameContainingIgnoreCase("lightning");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Lightning Storm");
    }

    @Test
    void findByIsPrivateFalseAndFormatId_filtersByFormat() {
        createDeck("Deck One", "user1", false, "premodern");
        createDeck("Deck Two", "user1", false, "modern");
        createDeck("Deck Three", "user1", false, "premodern");

        List<Deck> result = deckRepository.findByIsPrivateFalseAndFormatId("premodern");

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(d -> d.getFormatId().equals("premodern"));
    }

    @Test
    void findByIsPrivateFalseAndNameContainingIgnoreCaseAndFormatId_combinesFilters() {
        createDeck("Red Burn", "user1", false, "premodern");
        createDeck("Red Rush", "user1", false, "modern");
        createDeck("Blue Control", "user1", false, "premodern");

        List<Deck> result = deckRepository.findByIsPrivateFalseAndNameContainingIgnoreCaseAndFormatId(
                "red", "premodern");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Red Burn");
    }
}
