package com.manaforge.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class FeaturedDeckDTO {
    private String id;
    private String name;
    private String formatName;
    private String ownerUsername;
    private List<String> colors;
    private String featuredScryfallId;
}
