package com.manaforge.api.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class DeckRequestDTO {
    private String name;
    private String formatId;
    private String userId;
    private boolean isPrivate;
    private List<CardEntry> cards;
    private Map<String, Object> analysisScores;

    @Data
    public static class CardEntry {
        private String id; // scryfallId from frontend
        private int quantity;
        private String board;
    }
}