package com.manaforge.api.controller;

import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.dto.DeckSearchResultDTO;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.dto.FeaturedDeckDTO;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.DeckService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decks")
@CrossOrigin(origins = "http://localhost:5173")
public class DeckController {

    private final DeckService deckService;
    private final UserRepository userRepository;

    public DeckController(DeckService deckService, UserRepository userRepository) {
        this.deckService = deckService;
        this.userRepository = userRepository;
    }

    // ── Auth helper ───────────────────────────────────────────────────────────

    /** Devuelve el userId del usuario autenticado, o null si es anónimo */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        String identifier = auth.getPrincipal() instanceof OAuth2User oAuth2User
                ? oAuth2User.getAttribute("email")
                : auth.getPrincipal().toString();
        return userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .map(u -> u.getId())
                .orElse(null);
    }

    @PostMapping
    public ResponseEntity<Deck> saveDeck(@RequestBody DeckRequestDTO dto) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(deckService.saveDeck(dto, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deck> updateDeck(@PathVariable String id, @RequestBody DeckRequestDTO dto) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.updateDeck(id, dto, userId));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Forbidden")) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deck> getDeckById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(deckService.getDeckById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/view")
    public ResponseEntity<DeckViewDTO> getDeckView(
            @PathVariable String id,
            @RequestHeader(value = "Accept-Language", defaultValue = "en") String locale) {
        try {
            return ResponseEntity.ok(deckService.getDeckView(id, locale, getCurrentUserId()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Deck>> getDecksByUser(@PathVariable String userId) {
        return ResponseEntity.ok(deckService.getDecksByUser(userId));
    }

    @PostMapping("/analyze")
    public Map<String, Object> analyzeDeck(@RequestBody Map<String, Object> deckPayload) {
        return deckService.analyzeDeck(deckPayload);
    }

    @GetMapping("/search")
    public ResponseEntity<List<DeckSearchResultDTO>> searchDecks(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String formatId,
            @RequestHeader(value = "Accept-Language", defaultValue = "en") String locale) {
        return ResponseEntity.ok(deckService.searchDecks(name, formatId, locale));
    }

    @GetMapping("/featured")
    public ResponseEntity<FeaturedDeckDTO> getFeaturedDeck(
            @RequestHeader(value = "Accept-Language", defaultValue = "en") String locale) {
        FeaturedDeckDTO dto = deckService.getFeaturedDeck(locale);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> likeDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.likeDeck(id, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> unlikeDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.unlikeDeck(id, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/clone")
    public ResponseEntity<Deck> cloneDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.cloneDeck(id, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            deckService.deleteDeck(id, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Forbidden")) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/random")
    public Map<String, Object> generateRandomDeck(@RequestBody Map<String, Object> payload) {
        return deckService.generateRandomDeck(payload);
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<Deck> pinDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.pinDeck(id, userId));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Forbidden")) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}/pin")
    public ResponseEntity<Deck> unpinDeck(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok(deckService.unpinDeck(id, userId));
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Forbidden")) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            return ResponseEntity.notFound().build();
        }
    }
}
