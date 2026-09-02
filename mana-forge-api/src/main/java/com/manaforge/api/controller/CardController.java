package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.Card;
import com.manaforge.api.repository.CardRepository;
import com.manaforge.api.service.ScryfallService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    @Operation(summary = "Get banned cards by format", description = "Returns a list of banned cards for a specific format from Scryfall.")
    @GetMapping("/banned/{format}")
    public ResponseEntity<Map<String, Object>> getBannedCardsByFormat(@Parameter(description = "Format name (e.g. 'modern', 'pauper')") @PathVariable String format) {
        return ResponseEntity.ok(scryfallService.getBannedCardsByFormat(format));
    }

    @GetMapping("/autocomplete")
    public ResponseEntity<Map<String, Object>> getAutocomplete(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(Map.of("data", List.of()));
        }
        return ResponseEntity.ok(scryfallService.getAutocomplete(q));
    }

    @PostMapping("/scryfall/batch")
    public ResponseEntity<Map<String, Object>> batchScryfall(@RequestBody List<String> queries) {
        if (queries == null || queries.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "queries required"));

        // Keep original order and lines
        List<String> original = queries.stream().map(q -> q == null ? "" : q.trim()).toList();
        List<String> dedup = original.stream().distinct().toList();

        // Map to hold temporary aggregated responses by key (may be name or id)
        Map<String, Map<String, Object>> aggregated = new java.util.LinkedHashMap<>();
        List<String> missing = new java.util.ArrayList<>();

        // Try resolve from DB first
        for (String q : dedup) {
            String normalized = q == null ? "" : q.replaceAll("^!+", "").replaceAll("^[\"]|[\"]$", "").trim();
            boolean matched = false;

            if (normalized.toLowerCase().startsWith("oracle_id:")) {
                String oid = normalized.substring("oracle_id:".length()).trim();
                var byOid = cardRepository.findByOracleId(oid);
                if (byOid.isPresent()) {
                    aggregated.put(q, Map.of(
                            "object", "list",
                            "data", java.util.List.of(cardToMap(byOid.get()))
                    ));
                    matched = true;
                }
            }

            if (!matched && normalized.matches("[0-9a-fA-F\\-]{36}")) {
                var bySId = cardRepository.findByScryfallId(normalized);
                if (bySId.isPresent()) {
                    aggregated.put(q, Map.of(
                            "object", "list",
                            "data", java.util.List.of(cardToMap(bySId.get()))
                    ));
                    matched = true;
                }
            }

            if (!matched) {
                String nameOnly = normalized.replaceAll("^[0-9]+\\s+", "").trim();
                var exact = cardRepository.findFirstByNameIgnoreCase(nameOnly);
                if (exact.isPresent()) {
                    aggregated.put(q, Map.of(
                            "object", "list",
                            "data", java.util.List.of(cardToMap(exact.get()))
                    ));
                    matched = true;
                }
                else {
                    List<Card> found = cardRepository.findByNameContainingIgnoreCase(nameOnly);
                    if (found != null && !found.isEmpty()) {
                        aggregated.put(q, Map.of(
                                "object", "list",
                                "data", java.util.List.of(cardToMap(found.get(0)))
                        ));
                        matched = true;
                    }
                }
            }

            if (!matched) missing.add(q);
        }

        int fromDb = aggregated.size();
        int fromScryfall = 0;

        // For missing, try identifiers collection then batch search
        if (!missing.isEmpty()) {
            List<Map<String,String>> identifiers = new java.util.ArrayList<>();
            List<String> remainingNames = new java.util.ArrayList<>();
            for (String m : missing) {
                String norm = m == null ? "" : m.trim();
                if (norm.matches("[0-9a-fA-F\\-]{36}")) identifiers.add(Map.of("id", norm));
                else remainingNames.add(norm.replaceAll("^[0-9]+\\s+", "").trim());
            }

            if (!identifiers.isEmpty()) {
                Map<String,Object> coll = scryfallService.collectionByIdentifiers(identifiers);
                if (coll != null && coll.containsKey("data")) {
                    List<Map<String,Object>> data = (List<Map<String,Object>>) coll.getOrDefault("data", List.of());
                // prefer non-token print when possible
                Map<String,Object> chosen = pickBestPrint(data);
                if (chosen != null) {
                    String name = (String) chosen.getOrDefault("name", "");
                    String key = name != null && !name.isBlank() ? name : (String) chosen.getOrDefault("id", "");
                    aggregated.put(key, Map.of(
                                "object", "list",
                                "data", java.util.List.of(chosen)
                        ));
                    fromScryfall++;
                    try { persistCardFromItem(chosen); } catch (Exception ex) {}
                }
                }
            }

            List<String> toQuery = remainingNames.stream().distinct().toList();
            if (!toQuery.isEmpty()) {
                Map<String, Map<String, Object>> remote = scryfallService.batchSearch(toQuery);
                if (remote != null) {
                    for (Map.Entry<String, Map<String, Object>> e : remote.entrySet()) {
                        // normalize stored data to prefer non-token
                        Map<String,Object> value = e.getValue();
                        List<Map<String,Object>> d = (List<Map<String,Object>>) value.getOrDefault("data", List.of());
                        Map<String,Object> chosen = pickBestPrint(d);
                        if (chosen != null) {
                            aggregated.put(e.getKey(), Map.of("object", "list", "data", java.util.List.of(chosen)));
                            fromScryfall++;
                            try { persistCardFromItem(chosen); } catch (Exception ex) {}
                        } else {
                            aggregated.put(e.getKey(), value);
                            fromScryfall++;
                        }
                    }
                }
            }
        }

        // Build structured results preserving original lines and quantities
        List<Map<String,Object>> resultsList = new java.util.ArrayList<>();
        for (String line : original) {
            String qtyStr = "1";
            String namePart = line;
            var m = java.util.regex.Pattern.compile("^(\\d+)\\s+(.*)$").matcher(line);
            if (m.find()) { qtyStr = m.group(1); namePart = m.group(2); }
            String normalized = line.trim();

            Map<String,Object> entry = new java.util.LinkedHashMap<>();
            entry.put("line", line);
            entry.put("quantity", Integer.parseInt(qtyStr));
            entry.put("name", namePart);

            // Try to find aggregated match by original line, by namePart, or by normalized
            Map<String,Object> match = null;
            if (aggregated.containsKey(line)) match = aggregated.get(line);
            else if (aggregated.containsKey(namePart)) match = aggregated.get(namePart);
            else if (aggregated.containsKey(normalized)) match = aggregated.get(normalized);
            else {
                // fallback: try contains key matching
                for (String k : aggregated.keySet()) {
                    if (k != null && namePart.toLowerCase().contains(k.toLowerCase())) { match = aggregated.get(k); break; }
                }
            }

            if (match != null) {
                // extract first data item
                List<Map<String,Object>> data = (List<Map<String,Object>>) match.getOrDefault("data", List.of());
                Map<String,Object> cardObj = data != null && !data.isEmpty() ? data.get(0) : Map.of();
                entry.put("origin", "found");
                {
                                Map<String,Object> cardMap = new java.util.LinkedHashMap<>();
                                Object idVal = cardObj.get("id");
                                Object oracleVal = cardObj.get("oracle_id");
                                Object imgs = cardObj.get("image_uris");

                                // Enrich with common Scryfall fields frontend expects
                                String name = (String) cardObj.getOrDefault("name", "");
                                String typeLine = (String) cardObj.getOrDefault("type_line", "");
                                String manaCost = (String) cardObj.getOrDefault("mana_cost", "");
                                Object cmcVal = cardObj.getOrDefault("cmc", 0);
                                Map<String,Object> prices = (Map<String,Object>) cardObj.getOrDefault("prices", Map.of());
                                Map<String,Object> legalities = (Map<String,Object>) cardObj.getOrDefault("legalities", Map.of());

                                // Fallback: if image_uris missing, try card_faces[0].image_uris
                                if ((imgs == null || ((Map)imgs).isEmpty()) && cardObj.containsKey("card_faces")) {
                                    try {
                                        List<Map<String,Object>> faces = (List<Map<String,Object>>) cardObj.get("card_faces");
                                        if (faces != null && !faces.isEmpty()) {
                                            imgs = faces.get(0).getOrDefault("image_uris", Map.of());
                                        }
                                    } catch (Exception ex) { imgs = Map.of(); }
                                }

                                cardMap.put("id", idVal != null ? idVal : "");
                                cardMap.put("scryfallId", idVal != null ? idVal : "");
                                cardMap.put("oracleId", oracleVal != null ? oracleVal : "");
                                cardMap.put("name", name != null ? name : "");
                                cardMap.put("type_line", typeLine != null ? typeLine : "");
                                cardMap.put("mana_cost", manaCost != null ? manaCost : "");
                                cardMap.put("cmc", cmcVal instanceof Number ? ((Number)cmcVal).doubleValue() : 0);
                                cardMap.put("prices", prices != null ? prices : Map.of());
                                cardMap.put("legalities", legalities != null ? legalities : Map.of());
                                cardMap.put("image_uris", imgs != null ? imgs : Map.of());

                                // Also expose the compact imageUris key for frontend compatibility
                                cardMap.put("imageUris", imgs != null ? imgs : Map.of());

                                entry.put("card", cardMap);
                            }
            } else {
                entry.put("origin", "missing");
                entry.put("card", Map.of());
            }

            resultsList.add(entry);
        }

        Logger logger = LoggerFactory.getLogger(CardController.class);
        logger.info("batchScryfall: queries={}, fromDb={}, fromScryfall={}", original.size(), fromDb, fromScryfall);

        Map<String,Object> summary = Map.of("total", original.size(), "fromDb", fromDb, "fromScryfall", fromScryfall, "missing", resultsList.stream().filter(r -> "missing".equals(r.get("origin"))).count());

        return ResponseEntity.ok(Map.of("results", resultsList, "summary", summary));
    }

    // Helper: pick best print from a list preferring non-token layouts/type_line
    private Map<String,Object> pickBestPrint(List<Map<String,Object>> data) {
        if (data == null || data.isEmpty()) return null;
        // prefer item where layout != "token" and type_line does not contain "token"
        for (Map<String,Object> item : data) {
            String layout = (String) item.getOrDefault("layout", "");
            String typeLine = (String) item.getOrDefault("type_line", "");
            if (layout != null && layout.equalsIgnoreCase("token")) continue;
            if (typeLine != null && typeLine.toLowerCase().contains("token")) continue;
            return item;
        }
        // fallback: return first that has a name and id
        for (Map<String,Object> item : data) {
            if (item.get("id") != null && item.get("name") != null) return item;
        }
        return data.get(0);
    }

    private Map<String, Object> cardToMap(Card c) {
        Map<String, Object> cardMap = new java.util.LinkedHashMap<>();
        cardMap.put("id", c.getScryfallId() != null ? c.getScryfallId() : c.getId());
        cardMap.put("name", c.getName());
        cardMap.put("oracle_id", c.getOracleId());
        cardMap.put("set_name", c.getSetName());
        cardMap.put("image_uris", c.getImageUris() != null ? c.getImageUris() : Map.of());
        // include additional fields frontend expects
        cardMap.put("type_line", c.getTypeLine() != null ? c.getTypeLine() : "");
        cardMap.put("mana_cost", c.getManaCost() != null ? c.getManaCost() : "");
        cardMap.put("cmc", c.getCmc() != null ? c.getCmc() : 0);
        cardMap.put("prices", c.getPrices() != null ? c.getPrices() : Map.of());
        cardMap.put("legalities", c.getLegalities() != null ? c.getLegalities() : Map.of());
        return cardMap;
    }

    private void persistCardFromItem(Map<String, Object> item) {
        Card c = new Card();
        if (item.containsKey("id")) c.setScryfallId((String) item.get("id"));
        if (item.containsKey("name")) c.setName((String) item.get("name"));
        if (item.containsKey("oracle_id")) c.setOracleId((String) item.get("oracle_id"));
        if (item.containsKey("set_name")) c.setSetName((String) item.get("set_name"));
        if (item.containsKey("image_uris")) c.setImageUris((Map<String, String>) item.get("image_uris"));
        if (item.containsKey("type_line")) c.setTypeLine((String) item.get("type_line"));
        if (item.containsKey("mana_cost")) c.setManaCost((String) item.get("mana_cost"));
        if (item.containsKey("cmc")) {
            Object cmcObj = item.get("cmc");
            try { c.setCmc(cmcObj instanceof Number ? ((Number) cmcObj).doubleValue() : Double.parseDouble(cmcObj.toString())); } catch (Exception ex) {}
        }
        if (item.containsKey("prices")) c.setPrices((Map<String, String>) item.get("prices"));
        if (item.containsKey("legalities")) c.setLegalities((Map<String, String>) item.get("legalities"));

        Card exists = null;
        if (c.getScryfallId() != null) exists = cardRepository.findByScryfallId(c.getScryfallId()).orElse(null);
        if (exists == null && c.getOracleId() != null) exists = cardRepository.findByOracleId(c.getOracleId()).orElse(null);
        if (exists == null && c.getName() != null) {
            List<Card> possible = cardRepository.findByNameContainingIgnoreCase(c.getName());
            if (possible != null && !possible.isEmpty()) exists = possible.get(0);
        }
        if (exists != null) {
            exists.setName(c.getName());
            if (c.getScryfallId() != null) exists.setScryfallId(c.getScryfallId());
            if (c.getOracleId() != null) exists.setOracleId(c.getOracleId());
            if (c.getImageUris() != null) exists.setImageUris(c.getImageUris());
            if (c.getTypeLine() != null) exists.setTypeLine(c.getTypeLine());
            if (c.getManaCost() != null) exists.setManaCost(c.getManaCost());
            if (c.getCmc() != null) exists.setCmc(c.getCmc());
            if (c.getPrices() != null) exists.setPrices(c.getPrices());
            if (c.getLegalities() != null) exists.setLegalities(c.getLegalities());
            cardRepository.save(exists);
        } else {
            cardRepository.save(c);
        }
    }

    @PostMapping("/{cardId}/images")
    public ResponseEntity<Map<String, Object>> getPrintImages(@PathVariable String cardId, @RequestBody Map<String, String> body) {
        String oracleId = body.get("oracleId");
        if (oracleId == null || oracleId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "oracleId is required"));
        }

        Map<String, Object> resp = scryfallService.getPrintsByOracleId(oracleId);
        // Normalize prints: extract id, set_name, image_uris (small/normal/large) or card_faces images
        List<Map<String, Object>> data = (List<Map<String, Object>>) resp.getOrDefault("data", List.of());

        List<Map<String, Object>> prints = data.stream().map(item -> {
            String printId = (String) item.getOrDefault("id", "");
            String setName = (String) item.getOrDefault("set_name", "");
            Map<String, Object> images = (Map<String, Object>) item.get("image_uris");
            // Fallback to card_faces[0].image_uris if present
            if (images == null && item.containsKey("card_faces")) {
                List<Map<String, Object>> faces = (List<Map<String, Object>>) item.get("card_faces");
                if (faces != null && !faces.isEmpty()) {
                    images = (Map<String, Object>) faces.get(0).get("image_uris");
                }
            }
            if (images == null) images = Map.of();
            return Map.of("printId", printId, "setName", setName, "images", Map.of(
                    "small", images.getOrDefault("small", ""),
                    "normal", images.getOrDefault("normal", ""),
                    "large", images.getOrDefault("large", "")
            ));
        }).toList();

        return ResponseEntity.ok(Map.of("prints", prints));
    }
}
