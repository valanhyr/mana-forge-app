package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.model.strapi.FooterLegal;
import com.manaforge.api.service.StrapiService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/content-service/footer-legal")
public class FooterLegalController {

    private final StrapiService strapiService;

    public FooterLegalController(StrapiService strapiService) {
        this.strapiService = strapiService;
    }

    @GetMapping
    public ResponseEntity<?> getFooterLegal(@RequestParam String locale) {
        try {
            FooterLegal footerLegal = strapiService.getFooterLegal(locale);
            return ResponseEntity.ok(footerLegal);
        } catch (JsonProcessingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to process footer-legal data: " + e.getMessage() + "\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
