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
    private String slug;
    private String title;
    private String subtitle;
    private String locale;
    private String imageUrl;
    @JsonProperty("section")
    private List<StrapiComponent> section;
}