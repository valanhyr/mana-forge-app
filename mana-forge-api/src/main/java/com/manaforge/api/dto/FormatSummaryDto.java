package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormatSummaryDto {
    private String mongoId;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String slug;
}