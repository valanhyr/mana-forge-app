package com.manaforge.api.controller;

import com.manaforge.api.service.PremodernService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/premodern")
@CrossOrigin(origins = "http://localhost:5173") // Mantenemos la política de CORS de tus otros controladores
public class PremodernController {

    private final PremodernService premodernService;

    public PremodernController(PremodernService premodernService) {
        this.premodernService = premodernService;
    }

    @GetMapping("/banned-cards")
    public List<Map<String, Object>> getBannedCards() {
        return premodernService.getBannedCards();
    }
}