package com.manaforge.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.manaforge.api.model.mongo.Deck;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Public shape of a deck. Mirrors the {@link Deck} entity JSON, minus {@code likedBy}
 * and, for anyone who is not the owner, {@code userId}.
 */
public record DeckResponseDTO(
        String id,
        String name,
        String formatId,
        @JsonInclude(JsonInclude.Include.NON_NULL) String userId,
        @JsonProperty("private") boolean isPrivate,
        @JsonProperty("pinned") boolean isPinned,
        List<String> colors,
        List<CardEntry> cards,
        Map<String, Object> analysisScores,
        Instant createdAt,
        Instant updatedAt,
        int likesCount) {

    public record CardEntry(
            String scryfallId,
            String oracleId,
            int quantity,
            String board,
            @JsonProperty("gameChanger") boolean isGameChanger,
            String chosenPrintId,
            String chosenImageUrl) {

        static CardEntry from(Deck.DeckCardEntry entry) {
            return new CardEntry(
                    entry.getScryfallId(),
                    entry.getOracleId(),
                    entry.getQuantity(),
                    entry.getBoard(),
                    entry.isGameChanger(),
                    entry.getChosenPrintId(),
                    entry.getChosenImageUrl());
        }
    }

    public static DeckResponseDTO from(Deck deck, String requesterId) {
        boolean owner = requesterId != null && requesterId.equals(deck.getUserId());
        return new DeckResponseDTO(
                deck.getId(),
                deck.getName(),
                deck.getFormatId(),
                owner ? deck.getUserId() : null,
                deck.isPrivate(),
                deck.isPinned(),
                deck.getColors(),
                deck.getCards() == null ? null : deck.getCards().stream().map(CardEntry::from).toList(),
                deck.getAnalysisScores(),
                deck.getCreatedAt(),
                deck.getUpdatedAt(),
                deck.getLikesCount());
    }
}
