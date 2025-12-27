package com.manaforge.api.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.Map;

@Data
@Document(collection = "formats")
public class Format {
    @Id
    private String id;
    
    private Map<String, String> name; // Soporte i18n
    private String scryfallKey;
    private Config config;
    private boolean isActive;

    @Data
    public static class Config {
        private Integer minMainDeck;
        private Integer maxSideboard;
        private Integer maxCopies;
    }
}