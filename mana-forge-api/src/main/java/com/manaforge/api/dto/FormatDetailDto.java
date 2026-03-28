package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FormatDetailDto {
    private String slug;
    private String title;
    private String subtitle;
    private String imageUrl;
    private FormatSectionDto description;
    private FormatSectionDto rules;
    private SeoDto seo;

    @Data
    @Builder
    public static class FormatRuleDto {
        private int id;
        private String text;
    }
    @Data
    @Builder
    public static class FormatSectionDto {
        private String name;
        private String title;
        private String description;
        private List<FormatRuleDto> rules;
    }
}