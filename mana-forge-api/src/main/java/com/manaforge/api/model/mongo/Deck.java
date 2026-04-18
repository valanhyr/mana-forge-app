package com.manaforge.api.model.mongo;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@Document(collection = "decks")
public class Deck {
    @Id
    private String id;

    private String name;
    private String formatId;
    private String userId;
    private boolean isPrivate;
    private boolean isPinned;
    private List<String> colors;
    private List<DeckCardEntry> cards;
    private Map<String, Object> analysisScores;

    private Set<String> likedBy = new HashSet<>();
    private int likesCount = 0;

    @Data
    public static class DeckCardEntry {
        private String scryfallId;
        private int quantity;
        private String board; // "main" or "side"
        private boolean isGameChanger;
    }
}