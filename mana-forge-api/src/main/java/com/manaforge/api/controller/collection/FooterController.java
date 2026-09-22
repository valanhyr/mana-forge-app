package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.model.directus.Footer;
import com.manaforge.api.service.ContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/content-service/footer")
public class FooterController {

    private final ContentService contentService;

    public FooterController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public ResponseEntity<?> getFooter(@RequestParam String locale) {
        try {
            Footer footer = contentService.getFooter(locale);
            return ResponseEntity.ok(footer);
        } catch (JsonProcessingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to process footer data: " + e.getMessage() + "\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            // Generic fallback for checked exceptions from ContentService
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
