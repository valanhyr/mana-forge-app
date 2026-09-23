package com.manaforge.api.model.directus;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class DirectusFormatData implements Serializable {
    private static final long serialVersionUID = 1L;

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
    private List<DirectusComponent> section;
    private DirectusSeo seo;
}
