package com.manaforge.api.controller;

import com.manaforge.api.service.DirectusService;
import com.manaforge.api.model.directus.*;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
public class ContentController {

    private final DirectusService directusService;

    @GetMapping("/faqs")
    public ResponseEntity<?> getFaqs(
            @RequestParam(required = false) String locale,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage) {
        String language = faqLanguage(locale, acceptLanguage);
        try {
            return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore())
                    .body(directusService.getFaqs(language));
        } catch (Exception e) {
            return ResponseEntity.status(502).cacheControl(org.springframework.http.CacheControl.noStore())
                    .body(Map.of("error", "FAQ content unavailable"));
        }
    }

    private String faqLanguage(String locale, String acceptLanguage) {
        if (locale != null && !locale.isBlank()) {
            return "en".equalsIgnoreCase(locale.trim()) ? "en" : "es";
        }
        if (acceptLanguage != null && !acceptLanguage.isBlank()) {
            try {
                Locale resolved = Locale.lookup(Locale.LanguageRange.parse(acceptLanguage),
                        List.of(Locale.forLanguageTag("es"), Locale.forLanguageTag("en")));
                if (resolved != null) return resolved.getLanguage();
            } catch (IllegalArgumentException ignored) {
                // Malformed headers fall back to Spanish.
            }
        }
        return "es";
    }

    // Endpoint para el Footer
    @GetMapping("/footer/{locale}")
    public Footer getFooter(@PathVariable String locale) throws Exception {
        return directusService.getFooter(locale);
    }

    // Endpoint para los Heroes
    @GetMapping("/heros")
    public List<Hero> getHeros(
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String hero_id) throws Exception {
        return directusService.getHeros(locale, hero_id);
    }

    // Endpoint para las Secciones
    @GetMapping("/sections")
    public List<Section> getSections(
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) List<String> sectionIds) throws Exception {
        return directusService.getSections(locale, sectionIds);
    }

    // New endpoint: formats proxy
    @GetMapping("/formats")
    public ResponseEntity<?> getFormats(
            @RequestParam(required = false) String locale,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage) {
        try {
            List<com.manaforge.api.model.directus.DirectusFormatData> formats = directusService.getFormats(locale, acceptLanguage);
            return ResponseEntity.ok(formats);
        } catch (Exception e) {
            // Log full stacktrace to console for debugging
            e.printStackTrace();
            // Include stacktrace in response for debugging
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            String stackTrace = sw.toString();
            // Return error info including stacktrace to client (debug only)
            return ResponseEntity.status(500).body(java.util.Map.of(
                    "error", "Failed to fetch formats from CMS",
                    "message", e.getMessage(),
                    "trace", stackTrace
            ));
        }
    }

    // New endpoint: latest articles
    @GetMapping("/articles/latest")
    public List<com.manaforge.api.model.directus.DirectusArticleData> getLatestArticles(
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "10") int limit,
            @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage) throws Exception {
        return directusService.getLatestArticles(locale, limit, acceptLanguage);
    }

    // New endpoint: article detail
    @GetMapping("/articles/{documentId}")
    public com.manaforge.api.model.directus.DirectusArticleData getArticleByDocumentId(@PathVariable String documentId,
                                                                                  @RequestParam(required = false) String locale,
                                                                                  @RequestHeader(value = "Accept-Language", required = false) String acceptLanguage) throws Exception {
        return directusService.getArticleByDocumentId(documentId, locale, acceptLanguage);
    }

    @DeleteMapping("/cache")
    @CacheEvict(value = {"footer", "footer-legal", "heros", "sections", "languages", "formats", "articles-latest", "article-detail"}, allEntries = true)
    @Operation(summary = "Evict content cache", description = "Clears the Redis cache for general content (footer, heros, sections, languages).")
    public ResponseEntity<Void> evictContentCache() {
        return ResponseEntity.noContent().build();
    }
}
