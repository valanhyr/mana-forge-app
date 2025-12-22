package com.manaforge.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;

// DTO moderno usando Records de Java
record CardDTO(String name, int quantity, boolean isSideboard) {}
record DeckAnalysisResponse(String status, String message, int cardCount, String engine) {}

@RestController
@RequestMapping("/api/v1/decks")
@Tag(name = "Decks", description = "API para gestión y análisis de mazos")
public class DeckController {

    @PostMapping("/analyze")
    @Operation(summary = "Analizar Mazo", description = "Procesa una lista de cartas y devuelve métricas del mazo.")
    public DeckAnalysisResponse analyzeDeck(@RequestBody List<CardDTO> cards) {
        // Calculamos algo rápido para probar
        int totalCards = cards.stream().mapToInt(CardDTO::quantity).sum();
        
        System.out.println("Analizando mazo con " + totalCards + " cartas en Java 25...");

        return new DeckAnalysisResponse(
            "received",
            "Análisis de Premodern en curso",
            totalCards,
            "Spring Boot 4 + Java 25"
        );
    }
}