package com.manaforge.api.service;

import com.manaforge.api.dto.ArticleDto;
import com.manaforge.api.dto.SeoDto;
import com.manaforge.api.model.strapi.StrapiArticleData;
import com.manaforge.api.model.strapi.StrapiSeo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ArticleService {

    private static final Logger logger = LoggerFactory.getLogger(ArticleService.class);
    private final DirectusService directusService;

    public ArticleService(DirectusService directusService) {
        this.directusService = directusService;
    }

    public List<ArticleDto> getLast5Articles(String locale) {
        try {
            List<StrapiArticleData> articles = directusService.getLatestArticles(locale, 5);
            return articles.stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error fetching articles: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public ArticleDto getArticleByDocumentId(String documentId, String locale) {
        try {
            StrapiArticleData article = directusService.getArticleByDocumentId(documentId, locale);
            if (article == null) return null;
            return mapToDto(article);
        } catch (Exception e) {
            logger.error("Error fetching article by documentId {}: {}", documentId, e.getMessage());
            return null;
        }
    }

    private ArticleDto mapToDto(StrapiArticleData data) {
        return ArticleDto.builder()
                .documentId(data.getDocumentId())
                .title(data.getTitle())
                .subtitle(data.getSubtitle())
                .imageUrl(data.getCoverUrl() != null ? data.getCoverUrl() : data.getImageUrl())
                .content(data.getArticle())
                .publishedAt(data.getPublishedAt())
                .author(data.getAuthor())
                .seo(mapSeo(data.getSeo()))
                .build();
    }

    private SeoDto mapSeo(StrapiSeo seo) {
        if (seo == null) return null;
        return SeoDto.builder()
                .title(seo.getTitle())
                .description(seo.getDescription())
                .keywords(seo.getKeywords())
                .canonical(seo.getCanonical())
                .build();
    }
}
