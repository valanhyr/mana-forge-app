package com.manaforge.api.model.mongo;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "decks")
public class Deck {
    @Id
    private String id;

    private String name;
    private String formatId;
    private String userId;
    private boolean isPrivate;
    private List<String> colors;
    private List<DeckCardEntry> cards;

    @Data
    public static class DeckCardEntry {
        private String scryfallId;
        private int quantity;
        private String board; // "main" or "side"
    }
}