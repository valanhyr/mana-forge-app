package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Card;
import com.manaforge.api.repository.CardRepository;
import com.manaforge.api.service.ScryfallService;
import io.swagger.v3.oas.annotations.Parameter;
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
    public ResponseEntity<Map<String, Object>> searchScryfall(
            @Parameter(description = "Search query (e.g. 'c:red pow=3')") @RequestParam(required = false) String q,
            @Parameter(description = "Sort order (e.g. 'cmc', 'name')") @RequestParam(required = false) String order,
            @Parameter(description = "Page number") @RequestParam(required = false) Integer page,
            @Parameter(hidden = true) @RequestParam Map<String, String> allParams) {
        return ResponseEntity.ok(scryfallService.searchCards(allParams));
    }

    @GetMapping("/scryfall/{id}")
    public ResponseEntity<Map<String, Object>> getScryfallCardById(@PathVariable String id) {
        return ResponseEntity.ok(scryfallService.getCardById(id));
    }

    @GetMapping("/symbology")
    public ResponseEntity<Map<String, Object>> getScryfallSymbology() {
        return ResponseEntity.ok(scryfallService.getSymbology());
    }

    @GetMapping("/named")
    public ResponseEntity<Map<String, Object>> getCardNamed(
            @Parameter(description = "Exact card name") @RequestParam(required = false) String exact,
            @Parameter(description = "Fuzzy card name") @RequestParam(required = false) String fuzzy,
            @Parameter(description = "Set code") @RequestParam(required = false) String set) {
        return ResponseEntity.ok(scryfallService.getCardNamed(exact, fuzzy, set));
    }

    @GetMapping("/autocomplete")
    public ResponseEntity<Map<String, Object>> getAutocomplete(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(Map.of("data", List.of()));
        }
        return ResponseEntity.ok(scryfallService.getAutocomplete(q));
    }
}