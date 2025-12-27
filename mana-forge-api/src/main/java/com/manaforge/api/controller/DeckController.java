package com.manaforge.api.controller;

import com.manaforge.api.dtos.DeckRequestDTO;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.repository.DeckRepository;
import com.manaforge.api.service.ScryfallService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    private final DeckRepository deckRepository;
    private final ScryfallService scryfallService;

    public DeckController(DeckRepository deckRepository, ScryfallService scryfallService) {
        this.deckRepository = deckRepository;
        this.scryfallService = scryfallService;
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