package com.manaforge.api.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.model.mongo.Deck;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DeckResponseDTOTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    private Deck deck() {
        Deck.DeckCardEntry entry = new Deck.DeckCardEntry();
        entry.setScryfallId("s1");
        entry.setOracleId("o1");
        entry.setQuantity(4);
        entry.setBoard("main");
        entry.setGameChanger(true);
        entry.setChosenPrintId("p1");
        entry.setChosenImageUrl("img");

        Deck deck = new Deck();
        deck.setId("deck1");
        deck.setName("Mono Red");
        deck.setFormatId("fmt1");
        deck.setUserId("owner");
        deck.setPrivate(true);
        deck.setPinned(true);
        deck.setColors(List.of("R"));
        deck.setCards(List.of(entry));
        deck.setAnalysisScores(Map.of("speed", 5));
        deck.setLikedBy(Set.of("u2", "u3"));
        deck.setLikesCount(2);
        return deck;
    }

    private JsonNode json(Deck deck, String requesterId) throws Exception {
        return mapper.readTree(mapper.writeValueAsString(DeckResponseDTO.from(deck, requesterId)));
    }

    @Test
    void neverExposesLikedBy() throws Exception {
        assertThat(json(deck(), "owner").has("likedBy")).isFalse();
        assertThat(json(deck(), "someoneElse").has("likedBy")).isFalse();
        assertThat(json(deck(), null).has("likedBy")).isFalse();
    }

    @Test
    void ownerSeesUserId() throws Exception {
        assertThat(json(deck(), "owner").get("userId").asText()).isEqualTo("owner");
    }

    @Test
    void otherUsersAndAnonymousDoNotSeeUserId() throws Exception {
        assertThat(json(deck(), "someoneElse").has("userId")).isFalse();
        assertThat(json(deck(), null).has("userId")).isFalse();
    }

    @Test
    void keepsTheCurrentJsonFieldNames() throws Exception {
        JsonNode node = json(deck(), "owner");
        assertThat(node.get("id").asText()).isEqualTo("deck1");
        assertThat(node.get("name").asText()).isEqualTo("Mono Red");
        assertThat(node.get("formatId").asText()).isEqualTo("fmt1");
        assertThat(node.get("private").asBoolean()).isTrue();
        assertThat(node.get("pinned").asBoolean()).isTrue();
        assertThat(node.get("colors").get(0).asText()).isEqualTo("R");
        assertThat(node.get("analysisScores").get("speed").asInt()).isEqualTo(5);
        assertThat(node.get("likesCount").asInt()).isEqualTo(2);
        assertThat(node.has("isPrivate")).isFalse();
        assertThat(node.has("isPinned")).isFalse();
    }

    @Test
    void keepsTheCardEntryShape() throws Exception {
        JsonNode card = json(deck(), "owner").get("cards").get(0);
        assertThat(card.get("scryfallId").asText()).isEqualTo("s1");
        assertThat(card.get("oracleId").asText()).isEqualTo("o1");
        assertThat(card.get("quantity").asInt()).isEqualTo(4);
        assertThat(card.get("board").asText()).isEqualTo("main");
        assertThat(card.get("gameChanger").asBoolean()).isTrue();
        assertThat(card.get("chosenPrintId").asText()).isEqualTo("p1");
        assertThat(card.get("chosenImageUrl").asText()).isEqualTo("img");
    }

    @Test
    void keepsNullFieldsAsBefore() throws Exception {
        Deck bare = new Deck();
        bare.setId("d");
        bare.setUserId("owner");
        JsonNode node = json(bare, "someoneElse");
        assertThat(node.has("colors")).isTrue();
        assertThat(node.get("colors").isNull()).isTrue();
        assertThat(node.get("cards").isNull()).isTrue();
    }
}
