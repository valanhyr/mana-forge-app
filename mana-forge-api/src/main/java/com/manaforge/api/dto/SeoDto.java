package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SeoDto {
    private String title;
    private String description;
    private String keywords;
    private String ogImage;
    private String canonical;
}
