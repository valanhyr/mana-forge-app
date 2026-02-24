package com.manaforge.api.model.mongo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Document(collection = "formats")
public class Format {

    @Id
    private String id;

    private Map<String, String> name;

    @Indexed(unique = true)
    private String slug;

    private String scryfallKey;

    private boolean isActive = true;

    private FormatConfig config;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Map<String, String> getName() { return name; }
    public void setName(Map<String, String> name) { this.name = name; }

    public String getLocalizedName(String locale) {
        if (name == null) return "";
        return name.getOrDefault(locale, name.getOrDefault("en", ""));
    }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getScryfallKey() { return scryfallKey; }
    public void setScryfallKey(String scryfallKey) { this.scryfallKey = scryfallKey; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public FormatConfig getConfig() { return config; }
    public void setConfig(FormatConfig config) { this.config = config; }

    // Inner class para la configuración
    public static class FormatConfig {
        private int minMainDeck;
        private Integer maxDeckSize; // Null si no hay límite superior (ej. Modern), valor si es fijo (ej. Commander = 100)
        private int maxCopies;
        private int maxSideboard;

        // Getters and Setters
        public int getMinDeckSize() { return minMainDeck; }
        public void setMinDeckSize(int minMainDeck) { this.minMainDeck = minMainDeck; }

        public Integer getMaxDeckSize() { return maxDeckSize; }
        public void setMaxDeckSize(Integer maxDeckSize) { this.maxDeckSize = maxDeckSize; }

        public int getMaxCopies() { return maxCopies; }
        public void setMaxCopies(int maxCopies) { this.maxCopies = maxCopies; }

        public int getMaxSideboard() { return maxSideboard; }
        public void setMaxSideboard(int maxSideboard) { this.maxSideboard = maxSideboard; }
    }
}
