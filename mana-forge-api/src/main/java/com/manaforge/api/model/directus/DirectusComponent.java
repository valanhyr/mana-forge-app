package com.manaforge.api.model.directus;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class DirectusComponent implements Serializable {
    private static final long serialVersionUID = 1L;

    private int id;
    private String name;
    private String title;
    private String description;
    @JsonProperty("rules")
    private List<DirectusRule> rules;

    @Data
    public static class DirectusRule implements Serializable {
        private static final long serialVersionUID = 1L;
        private int id;
        private String text;
    }
}
