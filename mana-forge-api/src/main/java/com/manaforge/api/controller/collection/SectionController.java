package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.model.directus.Section;
import com.manaforge.api.service.ContentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/content-service/sections")
public class SectionController {

    private final ContentService contentService;

    public SectionController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public ResponseEntity<?> getSections(@RequestParam(required = false) String locale,
                                         @RequestParam(name = "section_id") List<String> sectionIds) {
        try {
            List<Section> sections = contentService.getSections(locale, sectionIds);
            return ResponseEntity.ok(sections);
        } catch (JsonProcessingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to process sections data: " + e.getMessage() + "\"}");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
