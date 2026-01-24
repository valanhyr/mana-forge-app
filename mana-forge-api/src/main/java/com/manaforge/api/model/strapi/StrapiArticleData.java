package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StrapiArticleData {
    private String documentId;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String article;
    private String publishedAt;
    private Author author;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Author {
        private String username;
    }
    
    private JsonNode cover;

    public String getCoverUrl() {
        if (cover != null && cover.has("data") && !cover.get("data").isNull()) {
            JsonNode attributes = cover.get("data").get("attributes");
            if (attributes != null && attributes.has("url")) {
                return attributes.get("url").asText();
            }
        }
        return null;
    }
}
