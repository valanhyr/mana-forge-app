package com.manaforge.api.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class DeckViewDTO {
    private String id;
    private String name;
    private String formatName;
    private String ownerUsername;
    private List<String> colors;
    private List<CardEntryDTO> mainDeck;
    private List<CardEntryDTO> sideboard;
    private List<CardEntryDTO> maybeboard;
    private int likesCount;
    private boolean likedByMe;

    @Data
    public static class CardEntryDTO {
        private String scryfallId;
        private String name;
        private String manaCost;
        private Double cmc;
        private String typeLine;
        private Map<String, String> imageUris;
        private int quantity;
        @com.fasterxml.jackson.annotation.JsonProperty("isGameChanger")
        private boolean isGameChanger;
        private String category;
        private Map<String, String> prices;
    }
}
