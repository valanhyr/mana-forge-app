package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Footer {
    @JsonProperty("title")
    private String title;
    @JsonProperty("subtitle")
    private String subtitle;
    @JsonProperty("footer_sections")
    private List<FooterSection> footerSections;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FooterSection {
        @JsonProperty("title")
        private String title;
        @JsonProperty("footer_links")
        private List<FooterLink> footerLinks;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FooterLink {
        @JsonProperty("title")
        private String title;
        @JsonProperty("link")
        private String link;
        @JsonProperty("target")
        private String target;
    }
}
