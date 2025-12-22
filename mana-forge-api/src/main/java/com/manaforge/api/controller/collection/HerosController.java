package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.model.strapi.Hero;
import com.manaforge.api.service.StrapiService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/content-service/heros")
public class HerosController {

    private final StrapiService strapiService;

    public HerosController(StrapiService strapiService) {
        this.strapiService = strapiService;
    }

    @GetMapping
    public ResponseEntity<?> getHeros(@RequestParam(required = false) String hero_id, @RequestParam String locale) {
        try {
            List<Hero> heros = strapiService.getHeros(locale, hero_id);

            if (hero_id != null && !hero_id.isEmpty() && !heros.isEmpty()) {
                return ResponseEntity.ok(heros.get(0));
            }

            return ResponseEntity.ok(heros);
        } catch (JsonProcessingException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"Failed to process heros data: " + e.getMessage() + "\"}");
        }
    }
}
