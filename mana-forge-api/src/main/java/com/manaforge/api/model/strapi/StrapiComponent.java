package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class StrapiComponent {
    private int id;
    private String name;
    private String title;
    private String description;
    @JsonProperty("rules")
    private List<StrapiRule> rules;

    @Data
    public static class StrapiRule {
        private int id;
        private String text;
    }
}