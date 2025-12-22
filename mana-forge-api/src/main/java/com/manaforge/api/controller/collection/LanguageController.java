package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.model.strapi.Language;
import com.manaforge.api.service.StrapiService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/content-service/languages")
public class LanguageController {

    private final StrapiService strapiService;

    public LanguageController(StrapiService strapiService) {
        this.strapiService = strapiService;
    }

    @GetMapping
    public ResponseEntity<?> getLanguages(@RequestParam(defaultValue = "es") String locale) {
        try {
            List<Language> languages = strapiService.getLanguages(locale);
            return ResponseEntity.ok(languages);
        } catch (JsonProcessingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to process languages data: " + e.getMessage() + "\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
