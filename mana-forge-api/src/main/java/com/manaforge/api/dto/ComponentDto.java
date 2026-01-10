package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComponentDto {
    private String title;
    private String description;
}