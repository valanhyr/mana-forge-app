package com.manaforge.api.controller;

import com.manaforge.api.dto.ArticleDto;
import com.manaforge.api.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Articles", description = "Endpoints for retrieving articles from Strapi")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/latest")
    @Operation(summary = "Get latest articles", description = "Returns the last 5 articles published.")
    public ResponseEntity<List<ArticleDto>> getLatestArticles(
            @RequestHeader(value = "Accept-Language", defaultValue = "es") String locale) {
        // Normalize locale (e.g. "en-US" → "en")
        String normalizedLocale = locale.split("[,;-]")[0].trim();
        return ResponseEntity.ok(articleService.getLast5Articles(normalizedLocale));
    }

    @DeleteMapping("/cache")
    @CacheEvict(value = {"articles-latest", "article-detail"}, allEntries = true)
    @Operation(summary = "Evict articles cache", description = "Clears the Redis cache for articles.")
    public ResponseEntity<Void> evictArticlesCache() {
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}")
    @Operation(summary = "Get article by ID", description = "Returns a specific article by its documentId.")
    public ResponseEntity<ArticleDto> getArticle(
            @PathVariable String documentId,
            @RequestHeader(value = "Accept-Language", defaultValue = "es") String locale) {
        String normalizedLocale = locale.split("[,;-]")[0].trim();
        ArticleDto article = articleService.getArticleByDocumentId(documentId, normalizedLocale);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(article);
    }
}