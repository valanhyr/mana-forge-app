package com.manaforge.api.controller;

import com.manaforge.api.dto.ArticleDto;
import com.manaforge.api.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
    public ResponseEntity<List<ArticleDto>> getLatestArticles(@RequestParam(defaultValue = "es") String locale) {
        return ResponseEntity.ok(articleService.getLast5Articles(locale));
    }

    @GetMapping("/{documentId}")
    @Operation(summary = "Get article by ID", description = "Returns a specific article by its documentId.")
    public ResponseEntity<ArticleDto> getArticle(@PathVariable String documentId, @RequestParam(defaultValue = "es") String locale) {
        ArticleDto article = articleService.getArticleByDocumentId(documentId, locale);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(article);
    }
}