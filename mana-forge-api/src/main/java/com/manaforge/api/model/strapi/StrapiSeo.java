package com.manaforge.api.model.strapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.io.Serializable;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StrapiSeo implements Serializable {
    private static final long serialVersionUID = 1L;

    private String title;
    private String description;
    private String keywords;
    private String canonical;
}
