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
        private String oracleId; // optional oracle id
        private int quantity;
        private String board;
        private String chosenPrintId; // optional selected print
        private String chosenImageUrl; // optional selected image url
    }
}