package com.manaforge.api.dtos;

import lombok.Data;
import java.util.List;

@Data
public class DeckRequestDTO {
    private String name;
    private String formatId;
    private String userId;
    private boolean isPrivate;
    private List<CardEntry> cards;

    @Data
    public static class CardEntry {
        private String id; // scryfallId from frontend
        private int quantity;
        private String board;
    }
}