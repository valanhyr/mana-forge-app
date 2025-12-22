package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Section {

    @JsonProperty("locale")
    private String locale;

    @JsonProperty("section_id")
    private String sectionId;

    @JsonProperty("title")
    private String title;

    @JsonProperty("subtitle")
    private String subtitle;

    @JsonProperty("description")
    private String description;

    @JsonProperty("image")
    private Image image;

    // Reusing the same Image structure as in Hero
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Image {
        @JsonProperty("name")
        private String name;
        @JsonProperty("alternativeText")
        private String alternativeText;
        @JsonProperty("caption")
        private String caption;
        @JsonProperty("mime")
        private String mime;
        @JsonProperty("url")
        private String url;
        @JsonProperty("formats")
        private Formats formats;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Formats {
        @JsonProperty("thumbnail")
        private Thumbnail thumbnail;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Thumbnail {
        @JsonProperty("name")
        private String name;
        @JsonProperty("mime")
        private String mime;
        @JsonProperty("url")
        private String url;
    }
}
