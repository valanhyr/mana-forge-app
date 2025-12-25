package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Card;
import com.manaforge.api.repository.CardRepository;
import com.manaforge.api.service.ScryfallService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cards")
public class CardController extends BaseMongoController<Card, String> {

    private final CardRepository cardRepository;
    private final ScryfallService scryfallService;

    public CardController(CardRepository repository, ScryfallService scryfallService) {
        super(repository);
        this.cardRepository = repository;
        this.scryfallService = scryfallService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<Card>> searchByName(@RequestParam String name) {
        return ResponseEntity.ok(cardRepository.findByNameContainingIgnoreCase(name));
    }

    @GetMapping("/scryfall")
    public ResponseEntity<Map<String, Object>> searchScryfall(@RequestParam String q) {
        return ResponseEntity.ok(scryfallService.searchCards(q));
    }
}