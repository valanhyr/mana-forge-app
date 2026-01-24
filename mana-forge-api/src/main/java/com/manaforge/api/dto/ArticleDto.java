package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ArticleDto {
    private String documentId;
    private String title;
    private String subtitle;
    private String content;
    private String imageUrl;
    private String publishedAt;
    private String author;
}
