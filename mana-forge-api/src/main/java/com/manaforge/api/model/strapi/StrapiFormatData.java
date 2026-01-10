package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;
import java.util.List;

@Data
public class StrapiFormatData {
    private int id;
    private String documentId;
    
    @JsonProperty("mongo_id")
    private String mongoId;
    
    private String title;
    private String subtitle;
    private List<StrapiComponent> description;
    private List<StrapiComponent> rules;
}