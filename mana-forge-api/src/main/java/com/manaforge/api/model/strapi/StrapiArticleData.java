package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import java.io.Serializable;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StrapiArticleData implements Serializable {
    private static final long serialVersionUID = 1L;

    private String documentId;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String article;
    private String publishedAt;
    private Author author;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Author implements Serializable {
        private static final long serialVersionUID = 1L;
        private String username;
    }

    // Stored as a pre-resolved URL to avoid JsonNode serialization issues in cache
    @JsonIgnore
    private String coverUrl;

    @com.fasterxml.jackson.annotation.JsonProperty("cover")
    public void setCoverFromJson(JsonNode cover) {
        if (cover != null && cover.has("data") && !cover.get("data").isNull()) {
            JsonNode attributes = cover.get("data").get("attributes");
            if (attributes != null && attributes.has("url")) {
                this.coverUrl = attributes.get("url").asText();
            }
        }
    }
}
