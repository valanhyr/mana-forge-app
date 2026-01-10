package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FormatDetailDto {
    private String mongoId;
    private String title;
    private String subtitle;
    private List<ComponentDto> description;
    private List<ComponentDto> rules;
}