package com.manaforge.api.controller;

import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.dto.DeckSearchResultDTO;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.dto.FeaturedDeckDTO;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.AiQuotaService;
import com.manaforge.api.service.DeckService;
import com.manaforge.api.service.EmailEncryptionService;
import com.manaforge.api.service.TurnstileService;
import com.manaforge.api.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    private static final Logger logger = LoggerFactory.getLogger(DeckController.class);

    private final DeckService deckService;
    private final UserRepository userRepository;
    private final EmailEncryptionService emailEncryptionService;
    private final AiQuotaService aiQuotaService;
    private final TurnstileService turnstileService;

    public DeckController(DeckService deckService, UserRepository userRepository,
                          EmailEncryptionService emailEncryptionService,
                          AiQuotaService aiQuotaService,
                          TurnstileService turnstileService) {
        this.deckService = deckService;
        this.userRepository = userRepository;
        this.emailEncryptionService = emailEncryptionService;
        this.aiQuotaService = aiQuotaService;
        this.turnstileService = turnstileService;
    }

    // ── Auth helper ───────────────────────────────────────────────────────────

    /** Devuelve el userId del usuario autenticado, o null si es anónimo */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) return null;
        String identifier = auth.getPrincipal() instanceof OAuth2User oAuth2User
                ? emailEncryptionService.encrypt(oAuth2User.getAttribute("email"))
                : auth.getPrincipal().toString();
        return userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .map(u -> u.getId())
                .orElse(null);
    }

    // ── AI analysis gating ────────────────────────────────────────────────────

    /**
     * Runs the AI analysis for the public endpoint, applying the abuse controls
     * that protect the provider budget: Turnstile proof, daily quota and a result
     * cache so identical decks are never paid for twice.
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeDeck(
            @RequestBody Map<String, Object> deckPayload,
            HttpServletRequest request) {
        String userId = getCurrentUserId();
        boolean authenticated = userId != null;
        String identity = authenticated ? userId : ClientIpResolver.resolve(request);

        // 1. Cached answers are free: serve them before any quota or challenge work.
        String cacheKey = aiQuotaService.buildCacheKey(deckPayload);
        Map<String, Object> cached = aiQuotaService.getCached(cacheKey);
        if (cached != null && !cached.isEmpty()) {
            cached.put("cached", true);
            return withQuotaHeaders(cached, aiQuotaService.check(identity, authenticated), true, HttpStatus.OK);
        }

        // 2. Anonymous callers must prove they are not a bot.
        AiQuotaService.QuotaResult quota = aiQuotaService.check(identity, authenticated);
        if (!authenticated && turnstileService.isEnabled()) {
            String token = asString(deckPayload.remove("turnstile_token"));
            if (!turnstileService.verify(token, identity)) {
                Map<String, Object> body = new HashMap<>();
                body.put("error", "Human verification required. Please reload and try again.");
                body.put("code", "TURNSTILE_FAILED");
                return withQuotaHeaders(body, quota, false, HttpStatus.FORBIDDEN);
            }
        } else {
            // Strip the token even when verification is off so it never reaches the engine.
            deckPayload.remove("turnstile_token");
        }

        // 3. Daily allowance.
        if (!quota.allowed()) {
            Map<String, Object> body = new HashMap<>();
            body.put("error", "Daily analysis limit reached. Sign in to raise it, or try again tomorrow.");
            body.put("code", "AI_QUOTA_EXCEEDED");
            return withQuotaHeaders(body, quota, authenticated, HttpStatus.TOO_MANY_REQUESTS);
        }

        // 4. Spend quota and call the engine.
        aiQuotaService.consume(identity, authenticated);
        Map<String, Object> analysis = deckService.analyzeDeck(deckPayload);

        cacheIfSuccessful(cacheKey, analysis);
        return withQuotaHeaders(analysis, aiQuotaService.check(identity, authenticated), authenticated, HttpStatus.OK);
    }

    /**
     * Lets the homepage show "N analyses left" before the user types a decklists,
     * so the limit is never a surprise.
     */
    @GetMapping("/analyze/quota")
    public ResponseEntity<Map<String, Object>> getAnalysisQuota(HttpServletRequest request) {
        String userId = getCurrentUserId();
        boolean authenticated = userId != null;
        AiQuotaService.QuotaResult quota =
                aiQuotaService.check(authenticated ? userId : ClientIpResolver.resolve(request), authenticated);

        Map<String, Object> body = new HashMap<>();
        body.put("authenticated", authenticated);
        body.put("limit", quota.limited() ? quota.limit() : null);
        body.put("remaining", quota.limited() ? quota.remaining() : null);
        body.put("resetsAt", quota.resetsAt() == null ? null : quota.resetsAt().toString());
        return withQuotaHeaders(body, quota, authenticated, HttpStatus.OK);
    }

    /**
     * Builds the response, attaching the quota state as headers so the client can
     * update its counter without parsing the body.
     */
    private ResponseEntity<Map<String, Object>> withQuotaHeaders(
            Map<String, Object> body, AiQuotaService.QuotaResult quota, boolean authenticated, HttpStatus status) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Analysis-Authenticated", Boolean.toString(authenticated));
        if (quota.limited()) {
            headers.set("X-Analysis-Quota-Limit", String.valueOf(quota.limit()));
            headers.set("X-Analysis-Quota-Remaining", String.valueOf(quota.remaining()));
        }
        if (quota.resetsAt() != null) {
            headers.set("X-Analysis-Quota-Resets-At", quota.resetsAt().toString());
        }
        return new ResponseEntity<>(body, headers, status);
    }

    /**
     * Caches successful analyses only. A fallback or an engine error must not be
     * pinned into the cache for 24h, or a transient outage would poison every
     * visitor for a day.
     */
    private void cacheIfSuccessful(String cacheKey, Map<String, Object> analysis) {
        if (analysis == null || analysis.isEmpty() || analysis.containsKey("error")) return;
        aiQuotaService.putCached(cacheKey, analysis);
    }

    private static String asString(Object value) {
        return value instanceof String s ? s : "";
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
            return ResponseEntity.ok(deckService.getDeckById(id, getCurrentUserId()));
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
        return ResponseEntity.ok(deckService.getDecksByUser(userId, getCurrentUserId()));
    }

    @PostMapping("/scores")
    public Map<String, Object> getDeckScores(@RequestBody Map<String, Object> deckPayload) {
        return deckService.getDeckScores(deckPayload);
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

    @PostMapping("/random/rate")
    public ResponseEntity<Map<String, Object>> rateDailyDeck(@RequestBody Map<String, Object> payload) {
        String userId = getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String dateStr = (String) payload.get("date");
            int stars = (Integer) payload.get("stars");
            LocalDate date = LocalDate.parse(dateStr);
            
            return ResponseEntity.ok(deckService.rateDailyDeck(date, userId, stars));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
