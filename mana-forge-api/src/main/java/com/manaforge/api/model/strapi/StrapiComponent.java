package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class StrapiComponent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int id;
    private String name;
    private String title;
    private String description;
    @JsonProperty("rules")
    private List<StrapiRule> rules;

    @Data
    public static class StrapiRule implements Serializable {
        private static final long serialVersionUID = 1L;
        private int id;
        private String text;
    }
}