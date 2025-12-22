package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FooterLegal {
    @JsonProperty("copyright")
    private String copyright;
    @JsonProperty("legal_links")
    private List<LegalLink> legalLinks;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LegalLink {
        @JsonProperty("id")
        private int id;
        @JsonProperty("title")
        private String title;
        @JsonProperty("link")
        private String link;
    }
}
