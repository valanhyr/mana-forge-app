package com.manaforge.api.model.directus;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import java.io.Serializable;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class DirectusArticleData implements Serializable {
    private static final long serialVersionUID = 1L;

    private String documentId;
    private Integer id;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String content; // article body HTML
    private String article; // legacy field name

    @com.fasterxml.jackson.annotation.JsonProperty("translations")
    public void setTranslations(com.fasterxml.jackson.databind.JsonNode translations) {
        try {
            if (translations != null && translations.isArray() && translations.size() > 0) {
                com.fasterxml.jackson.databind.JsonNode tr = translations.get(0);
                if (tr.hasNonNull("title")) this.title = tr.path("title").asText(null);
                if (tr.hasNonNull("subtitle")) this.subtitle = tr.path("subtitle").asText(null);
                if (tr.hasNonNull("content")) {
                    com.fasterxml.jackson.databind.JsonNode contentNode = tr.path("content");
                    this.content = contentNode.isTextual() ? contentNode.asText() : contentNode.toString();
                }
                if (tr.hasNonNull("languages_code")) this.locale = tr.path("languages_code").asText(null);
                if (tr.hasNonNull("seo")) {
                    try {
                        this.seo = new com.fasterxml.jackson.databind.ObjectMapper()
                                .readerFor(com.manaforge.api.model.directus.DirectusSeo.class)
                                .readValue(tr.path("seo"));
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}
    }
    private String publishedAt;
    private String locale;
    private String author;
    private DirectusSeo seo;

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
