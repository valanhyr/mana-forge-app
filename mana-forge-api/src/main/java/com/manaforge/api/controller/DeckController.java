package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.model.ai.DailyDeck;
import com.manaforge.api.repository.DeckRepository;
import com.manaforge.api.repository.DailyDeckRepository;
import com.manaforge.api.service.ScryfallService;
import com.manaforge.api.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.data.domain.Example;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;

@RestController
@RequestMapping("/api/decks")
@CrossOrigin(origins = "http://localhost:5173")
public class DeckController {

    private final DeckRepository deckRepository;
    private final ScryfallService scryfallService;
    private final AiService aiService;
    private final DailyDeckRepository dailyDeckRepository;

    public DeckController(DeckRepository deckRepository, ScryfallService scryfallService, AiService aiService, DailyDeckRepository dailyDeckRepository) {
        this.deckRepository = deckRepository;
        this.scryfallService = scryfallService;
        this.aiService = aiService;
        this.dailyDeckRepository = dailyDeckRepository;
    }

    @PostMapping
    public ResponseEntity<Deck> saveDeck(@RequestBody DeckRequestDTO dto) {
        // TODO: Add validation and security checks
        // - Verify the user ID from the security context matches dto.getUserId()

        Deck deck = new Deck();
        deck.setName(dto.getName());
        deck.setFormatId(dto.getFormatId());
        deck.setUserId(dto.getUserId()); // This should come from security context later
        deck.setPrivate(dto.isPrivate());

        List<Deck.DeckCardEntry> cardEntries = dto.getCards().stream().map(cardDto -> {
            Deck.DeckCardEntry entry = new Deck.DeckCardEntry();
            entry.setScryfallId(cardDto.getId());
            entry.setQuantity(cardDto.getQuantity());
            entry.setBoard(cardDto.getBoard());
            return entry;
        }).collect(Collectors.toList());

        deck.setCards(cardEntries);
        calculateAndSetDeckColors(deck);

        Deck savedDeck = deckRepository.save(deck);
        return ResponseEntity.ok(savedDeck);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deck> updateDeck(@PathVariable String id, @RequestBody DeckRequestDTO dto) {
        return deckRepository.findById(id)
                .map(existingDeck -> {
                    existingDeck.setName(dto.getName());
                    existingDeck.setFormatId(dto.getFormatId());
                    existingDeck.setPrivate(dto.isPrivate());
                    // existingDeck.setUserId(dto.getUserId()); // User shouldn't change

                    List<Deck.DeckCardEntry> cardEntries = dto.getCards().stream().map(cardDto -> {
                        Deck.DeckCardEntry entry = new Deck.DeckCardEntry();
                        entry.setScryfallId(cardDto.getId());
                        entry.setQuantity(cardDto.getQuantity());
                        entry.setBoard(cardDto.getBoard());
                        return entry;
                    }).collect(Collectors.toList());

                    existingDeck.setCards(cardEntries);
                    calculateAndSetDeckColors(existingDeck);

                    return ResponseEntity.ok(deckRepository.save(existingDeck));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deck> getDeckById(@PathVariable String id) {
        return deckRepository.findById(id)
                .map(deck -> {
                    if (deck.getColors() == null || deck.getColors().isEmpty()) {
                        calculateAndSetDeckColors(deck);
                        return ResponseEntity.ok(deckRepository.save(deck));
                    }
                    return ResponseEntity.ok(deck);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Deck>> getDecksByUser(@PathVariable String userId) {
        List<Deck> decks = deckRepository.findByUserId(userId);

        // Lógica de "migración perezosa": si un mazo no tiene colores, los calcula y guarda.
        List<Deck> updatedDecks = decks.stream().map(deck -> {
            if (deck.getColors() == null || deck.getColors().isEmpty()) {
                calculateAndSetDeckColors(deck);
                return deckRepository.save(deck); // Guarda la versión actualizada
            }
            return deck;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(updatedDecks);
    }

    /**
     * Proxy para el análisis de mazos con IA.
     * Recibe el payload del frontend y lo reenvía al motor de Python.
     */
    @PostMapping("/analyze")
    public Map<String, Object> analyzeDeck(@RequestBody Map<String, Object> deckPayload) {
        return aiService.analyzeDeck(deckPayload);
    }

    /**
     * Endpoint para generar un mazo aleatorio utilizando la IA.
     * Puede recibir parámetros como "locale" y "format_name".
     * Ahora devuelve el mismo mazo durante todo el día (Daily Deck).
     */
    @PostMapping("/random")
    public Map<String, Object> generateRandomDeck(@RequestBody Map<String, Object> payload) {
        LocalDate today = LocalDate.now();
        
        // 1. Intentamos buscar el mazo de hoy de forma segura (manejando duplicados)
        Optional<DailyDeck> existing = getDailyDeckSafe(today);
        if (existing.isPresent()) {
            return existing.get().getDeckData();
        }

        // 2. Si no existe, generamos uno nuevo. Manejamos condiciones de carrera.
        try {
            Map<String, Object> newDeck = aiService.generateRandomDeck(payload);
            DailyDeck daily = new DailyDeck();
            daily.setDate(today);
            daily.setDeckData(newDeck);
            dailyDeckRepository.save(daily);
            return newDeck;
        } catch (DuplicateKeyException e) {
            // Si otro hilo guardó el mazo mientras generábamos este, devolvemos el existente
            return getDailyDeckSafe(today)
                    .map(DailyDeck::getDeckData)
                    .orElseThrow(() -> new RuntimeException("Error inesperado al recuperar el mazo diario."));
        }
    }

    private Optional<DailyDeck> getDailyDeckSafe(LocalDate date) {
        try {
            return dailyDeckRepository.findByDate(date);
        } catch (IncorrectResultSizeDataAccessException e) {
            // En caso de duplicados en la BD, usamos Example para recuperar la lista y tomar el primero
            DailyDeck probe = new DailyDeck();
            probe.setDate(date);
            List<DailyDeck> list = dailyDeckRepository.findAll(Example.of(probe));
            return list.stream().findFirst();
        }
    }

    private void calculateAndSetDeckColors(Deck deck) {
        Set<String> deckColors = new HashSet<>();
        if (deck.getCards() != null) {
            for (Deck.DeckCardEntry entry : deck.getCards()) {
                Map<String, Object> cardData = scryfallService.getCardById(entry.getScryfallId());
                if (cardData != null && cardData.get("colors") instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<String> cardColors = (List<String>) cardData.get("colors");
                    deckColors.addAll(cardColors);
                }
            }
        }
        deck.setColors(sortColors(deckColors));
    }

    private List<String> sortColors(Set<String> colors) {
        List<String> order = List.of("W", "U", "B", "R", "G");
        return colors.stream()
                .sorted((c1, c2) -> {
                    int i1 = order.indexOf(c1);
                    int i2 = order.indexOf(c2);
                    return Integer.compare(i1 == -1 ? 99 : i1, i2 == -1 ? 99 : i2);
                })
                .collect(Collectors.toList());
    }
}