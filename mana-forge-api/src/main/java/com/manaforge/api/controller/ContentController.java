package com.manaforge.api.controller;

import com.manaforge.api.service.StrapiService;
import com.manaforge.api.model.strapi.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor // Genera el constructor automáticamente (Lombok)
@CrossOrigin(origins = "http://localhost:5173") // Para que React pueda conectar
public class ContentController {

    private final StrapiService strapiService;

    // Endpoint para el Footer
    @GetMapping("/footer/{locale}")
    public Footer getFooter(@PathVariable String locale) throws Exception {
        return strapiService.getFooter(locale);
    }

    // Endpoint para los Heroes
    @GetMapping("/heros")
    public List<Hero> getHeros(
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) String hero_id) throws Exception {
        return strapiService.getHeros(locale, hero_id);
    }

    // Endpoint para las Secciones
    @GetMapping("/sections")
    public List<Section> getSections(
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) List<String> sectionIds) throws Exception {
        return strapiService.getSections(locale, sectionIds);
    }
}
