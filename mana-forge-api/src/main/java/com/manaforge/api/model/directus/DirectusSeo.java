package com.manaforge.api.model.directus;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class DirectusSeo implements Serializable {
    private static final long serialVersionUID = 1L;
    private String title;
    private String description;
    private String keywords;
    private String canonical;
}
