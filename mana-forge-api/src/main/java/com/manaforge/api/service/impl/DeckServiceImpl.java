package com.manaforge.api.service.impl;

import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.dto.DeckSearchResultDTO;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.dto.FeaturedDeckDTO;
import com.manaforge.api.model.ai.DailyDeck;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.repository.*;
import com.manaforge.api.service.AiService;
import com.manaforge.api.service.DeckService;
import com.manaforge.api.service.ScryfallService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.data.domain.Example;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

@Service
public class DeckServiceImpl implements DeckService {

    private final DeckRepository deckRepository;
    private final ScryfallService scryfallService;
    private final AiService aiService;
    private final DailyDeckRepository dailyDeckRepository;
    private final FormatRepository formatRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;

    public DeckServiceImpl(DeckRepository deckRepository, ScryfallService scryfallService, AiService aiService,
                           DailyDeckRepository dailyDeckRepository, FormatRepository formatRepository,
                           UserRepository userRepository, CardRepository cardRepository) {
        this.deckRepository = deckRepository;
        this.scryfallService = scryfallService;
        this.aiService = aiService;
        this.dailyDeckRepository = dailyDeckRepository;
        this.formatRepository = formatRepository;
        this.userRepository = userRepository;
        this.cardRepository = cardRepository;
    }

    @Override
    public Deck saveDeck(DeckRequestDTO dto, String userId) {
        Deck deck = new Deck();
        deck.setName(dto.getName());
        deck.setFormatId(dto.getFormatId());
        deck.setUserId(userId);
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

        return deckRepository.save(deck);
    }

    @Override
    public Deck updateDeck(String id, DeckRequestDTO dto, String userId) {
        return deckRepository.findById(id)
                .map(existingDeck -> {
                    if (!existingDeck.getUserId().equals(userId)) {
                        throw new RuntimeException("Forbidden: You don't own this deck");
                    }

                    existingDeck.setName(dto.getName());
                    existingDeck.setFormatId(dto.getFormatId());
                    existingDeck.setPrivate(dto.isPrivate());

                    List<Deck.DeckCardEntry> cardEntries = dto.getCards().stream().map(cardDto -> {
                        Deck.DeckCardEntry entry = new Deck.DeckCardEntry();
                        entry.setScryfallId(cardDto.getId());
                        entry.setQuantity(cardDto.getQuantity());
                        entry.setBoard(cardDto.getBoard());
                        return entry;
                    }).collect(Collectors.toList());

                    existingDeck.setCards(cardEntries);
                    calculateAndSetDeckColors(existingDeck);

                    return deckRepository.save(existingDeck);
                })
                .orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public Deck getDeckById(String id) {
        return deckRepository.findById(id)
                .map(deck -> {
                    if (deck.getColors() == null || deck.getColors().isEmpty()) {
                        calculateAndSetDeckColors(deck);
                        return deckRepository.save(deck);
                    }
                    return deck;
                })
                .orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public DeckViewDTO getDeckView(String id, String locale, String currentUserId) {
        return deckRepository.findById(id).map(deck -> {
            DeckViewDTO dto = new DeckViewDTO();
            dto.setId(deck.getId());
            dto.setName(deck.getName());
            dto.setColors(deck.getColors());
            dto.setLikesCount(deck.getLikesCount());
            dto.setLikedByMe(currentUserId != null && deck.getLikedBy() != null
                    && deck.getLikedBy().contains(currentUserId));

            formatRepository.findById(deck.getFormatId()).ifPresent(f ->
                    dto.setFormatName(f.getLocalizedName(locale)));

            userRepository.findById(deck.getUserId()).ifPresent(u ->
                    dto.setOwnerUsername(u.getUsername()));

            List<DeckViewDTO.CardEntryDTO> main = new ArrayList<>();
            List<DeckViewDTO.CardEntryDTO> side = new ArrayList<>();
            List<DeckViewDTO.CardEntryDTO> maybe = new ArrayList<>();

            if (deck.getCards() != null) {
                // Usamos Virtual Threads para paralelizar la búsqueda en base de datos
                try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                    var futures = deck.getCards().stream()
                        .map(entry -> CompletableFuture.supplyAsync(() -> {
                            DeckViewDTO.CardEntryDTO cardDTO = new DeckViewDTO.CardEntryDTO();
                            cardDTO.setScryfallId(entry.getScryfallId());
                            cardDTO.setQuantity(entry.getQuantity());
                            cardDTO.setCategory(entry.getBoard());

                            // 1. Buscar en caché local (DB) en paralelo
                            cardRepository.findByScryfallId(entry.getScryfallId())
                                    .ifPresent(card -> {
                                        cardDTO.setName(card.getName());
                                        cardDTO.setManaCost(card.getManaCost());
                                        cardDTO.setCmc(card.getCmc());
                                        cardDTO.setTypeLine(card.getTypeLine());
                                        cardDTO.setImageUris(card.getImageUris());
                                        cardDTO.setGameChanger(Boolean.TRUE.equals(card.getGameChanger()));
                                        cardDTO.setPrices(card.getPrices());
                                    });
                            
                            return Map.entry(entry, cardDTO);
                        }, executor))
                        .toList();

                    // Recolectamos resultados y hacemos fallback secuencial si es necesario
                    for (var future : futures) {
                        var result = future.join();
                        var entry = result.getKey();
                        var cardDTO = result.getValue();

                        // 2. Fallback a Scryfall (Secuencial para respetar rate limits)
                        if (cardDTO.getName() == null || cardDTO.getCmc() == null) {
                            Map<String, Object> scryfallData = scryfallService.getCardById(entry.getScryfallId());
                            if (scryfallData != null && !scryfallData.isEmpty()) {
                                if (cardDTO.getName() == null) cardDTO.setName((String) scryfallData.get("name"));
                                if (cardDTO.getManaCost() == null) cardDTO.setManaCost((String) scryfallData.get("mana_cost"));
                                if (scryfallData.get("cmc") instanceof Number n) cardDTO.setCmc(n.doubleValue());
                                if (cardDTO.getTypeLine() == null) cardDTO.setTypeLine((String) scryfallData.get("type_line"));
                                if (cardDTO.getImageUris() == null) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, String> imageUris = (Map<String, String>) scryfallData.get("image_uris");
                                    cardDTO.setImageUris(imageUris);
                                }
                                if (cardDTO.getPrices() == null && scryfallData.get("prices") instanceof Map<?,?> p) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, String> prices = (Map<String, String>) p;
                                    cardDTO.setPrices(prices);
                                }
                                if (Boolean.TRUE.equals(scryfallData.get("games_changer")) || Boolean.TRUE.equals(scryfallData.get("game_changer"))) {
                                    cardDTO.setGameChanger(true);
                                }
                            }
                        }

                        if ("side".equals(entry.getBoard())) {
                            side.add(cardDTO);
                        } else if ("maybe".equals(entry.getBoard())) {
                            maybe.add(cardDTO);
                        } else {
                            main.add(cardDTO);
                        }
                    }
                }
            }

            dto.setMainDeck(main);
            dto.setSideboard(side);
            dto.setMaybeboard(maybe);
            return dto;
        }).orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public List<Deck> getDecksByUser(String userId) {
        List<Deck> decks = deckRepository.findByUserId(userId);
        return decks.stream().map(deck -> {
            if (deck.getColors() == null || deck.getColors().isEmpty()) {
                calculateAndSetDeckColors(deck);
                return deckRepository.save(deck);
            }
            return deck;
        }).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> likeDeck(String id, String userId) {
        return deckRepository.findById(id).map(deck -> {
            if (deck.getLikedBy() == null) deck.setLikedBy(new java.util.HashSet<>());
            boolean added = deck.getLikedBy().add(userId);
            if (added) {
                deck.setLikesCount(deck.getLikedBy().size());
                deckRepository.save(deck);
            }
            return Map.<String, Object>of(
                    "likesCount", deck.getLikesCount(),
                    "likedByMe", true
            );
        }).orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public Map<String, Object> unlikeDeck(String id, String userId) {
        return deckRepository.findById(id).map(deck -> {
            if (deck.getLikedBy() != null && deck.getLikedBy().remove(userId)) {
                deck.setLikesCount(deck.getLikedBy().size());
                deckRepository.save(deck);
            }
            return Map.<String, Object>of(
                    "likesCount", deck.getLikesCount(),
                    "likedByMe", false
            );
        }).orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public Deck cloneDeck(String id, String userId) {
        return deckRepository.findById(id).map(original -> {
            Deck clone = new Deck();
            clone.setName("Copy of " + original.getName());
            clone.setFormatId(original.getFormatId());
            clone.setUserId(userId);
            clone.setPrivate(true);
            
            if (original.getCards() != null) {
                clone.setCards(new ArrayList<>(original.getCards()));
            }
            
            if (original.getColors() != null) {
                clone.setColors(new ArrayList<>(original.getColors()));
            }
            
            clone.setLikesCount(0);
            clone.setLikedBy(new HashSet<>());
            
            return deckRepository.save(clone);
        }).orElseThrow(() -> new RuntimeException("Deck not found"));
    }

    @Override
    public void deleteDeck(String id, String userId) {
        deckRepository.findById(id).ifPresentOrElse(deck -> {
            if (!deck.getUserId().equals(userId)) {
                throw new RuntimeException("Forbidden: You don't own this deck");
            }
            deckRepository.delete(deck);
        }, () -> {
            throw new RuntimeException("Deck not found");
        });
    }

    @Override
    public List<DeckSearchResultDTO> searchDecks(String name, String formatId, String locale) {
        List<Deck> decks;
        if (name != null && formatId != null) {
            decks = deckRepository.findByIsPrivateFalseAndNameContainingIgnoreCaseAndFormatId(name, formatId);
        } else if (name != null) {
            decks = deckRepository.findByIsPrivateFalseAndNameContainingIgnoreCase(name);
        } else if (formatId != null) {
            decks = deckRepository.findByIsPrivateFalseAndFormatId(formatId);
        } else {
            decks = deckRepository.findByIsPrivateFalse();
        }

        return decks.stream().map(deck -> {
            DeckSearchResultDTO dto = new DeckSearchResultDTO();
            dto.setId(deck.getId());
            dto.setName(deck.getName());
            dto.setColors(deck.getColors());
            dto.setLikesCount(deck.getLikesCount());

            formatRepository.findById(deck.getFormatId()).ifPresent(f ->
                    dto.setFormatName(f.getLocalizedName(locale)));

            userRepository.findById(deck.getUserId()).ifPresent(u ->
                    dto.setOwnerUsername(u.getUsername()));

            deck.getCards().stream()
                    .filter(c -> "main".equals(c.getBoard()))
                    .findFirst()
                    .ifPresent(c -> dto.setFeaturedScryfallId(c.getScryfallId()));

            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public FeaturedDeckDTO getFeaturedDeck(String locale) {
        List<Deck> publicDecks = deckRepository.findByIsPrivateFalse();
        if (publicDecks.isEmpty()) return null;

        Deck deck = publicDecks.get(new Random().nextInt(publicDecks.size()));

        FeaturedDeckDTO dto = new FeaturedDeckDTO();
        dto.setId(deck.getId());
        dto.setName(deck.getName());
        dto.setColors(deck.getColors());
        dto.setLikesCount(deck.getLikesCount());

        formatRepository.findById(deck.getFormatId()).ifPresent(format ->
                dto.setFormatName(format.getLocalizedName(locale)));

        userRepository.findById(deck.getUserId()).ifPresent(user ->
                dto.setOwnerUsername(user.getUsername()));

        deck.getCards().stream()
                .filter(c -> "main".equals(c.getBoard()))
                .findFirst()
                .ifPresent(c -> dto.setFeaturedScryfallId(c.getScryfallId()));

        return dto;
    }

    @Override
    public Map<String, Object> analyzeDeck(Map<String, Object> deckPayload) {
        return aiService.analyzeDeck(deckPayload);
    }

    private static final List<String> SUPPORTED_LOCALES = List.of("es", "en");

    @Override
    public Map<String, Object> generateRandomDeck(Map<String, Object> payload) {
        LocalDate today = LocalDate.now();
        String requestedLocale = payload.getOrDefault("locale", "es").toString();

        Optional<DailyDeck> existing = getDailyDeckSafe(today);
        if (existing.isPresent()) {
            DailyDeck daily = existing.get();
            Map<String, Object> deckData = resolveDeckForLocale(daily, requestedLocale, payload);
            deckData.put("date", daily.getDate().toString());
            enrichRatingsInfo(deckData, daily.getRatings(), payload.get("userId"));
            return deckData;
        }

        try {
            // Generate deck for all supported locales in parallel using virtual threads
            Map<String, Map<String, Object>> byLocale = generateForAllLocales(payload);
            if (byLocale.isEmpty()) return Collections.emptyMap();

            // Enrich mana costs once (cards are the same across locales)
            Map<String, Object> reference = byLocale.values().iterator().next();
            enrichDeckData(reference);
            // Propagate enriched card lists to all locales
            for (Map<String, Object> localeData : byLocale.values()) {
                if (localeData != reference) {
                    localeData.put("main_deck", reference.get("main_deck"));
                    localeData.put("sideboard", reference.get("sideboard"));
                }
            }

            DailyDeck daily = new DailyDeck();
            daily.setDate(today);
            daily.setDeckDataByLocale(byLocale);
            // Keep deckData as fallback pointing to default locale
            daily.setDeckData(byLocale.getOrDefault(requestedLocale, reference));
            dailyDeckRepository.save(daily);

            Map<String, Object> result = byLocale.getOrDefault(requestedLocale, reference);
            enrichRatingsInfo(result, daily.getRatings(), payload.get("userId"));
            result.put("date", today.toString());
            return result;
        } catch (DuplicateKeyException e) {
            return getDailyDeckSafe(today)
                    .map(d -> {
                        Map<String, Object> data = resolveDeckForLocale(d, requestedLocale, payload);
                        data.put("date", d.getDate().toString());
                        return data;
                    })
                    .orElse(Collections.emptyMap());
        }
    }

    private Map<String, Object> resolveDeckForLocale(DailyDeck daily, String locale, Map<String, Object> payload) {
        Map<String, Map<String, Object>> byLocale = daily.getDeckDataByLocale();

        // If we have the requested locale stored, return it
        if (byLocale != null && byLocale.containsKey(locale)) {
            Map<String, Object> data = byLocale.get(locale);
            if (isMissingManaCosts(data)) {
                enrichDeckData(data);
                byLocale.put(locale, data);
                daily.setDeckDataByLocale(byLocale);
                dailyDeckRepository.save(daily);
            }
            return data;
        }

        // Locale not yet stored — generate it and persist
        if (byLocale != null && !byLocale.isEmpty()) {
            Map<String, Object> payloadWithLocale = new HashMap<>(payload);
            payloadWithLocale.put("locale", locale);
            Map<String, Object> generated = aiService.generateRandomDeck(payloadWithLocale);
            if (generated != null) {
                // Reuse already-enriched card lists from an existing locale
                Map<String, Object> existing = byLocale.values().iterator().next();
                generated.put("main_deck", existing.get("main_deck"));
                generated.put("sideboard", existing.get("sideboard"));
                byLocale.put(locale, generated);
                daily.setDeckDataByLocale(byLocale);
                dailyDeckRepository.save(daily);
                return generated;
            }
        }

        // Fallback: old record without deckDataByLocale
        Map<String, Object> fallback = daily.getDeckData();
        if (fallback == null) fallback = Collections.emptyMap();
        if (isMissingManaCosts(fallback)) {
            enrichDeckData(fallback);
            daily.setDeckData(fallback);
            dailyDeckRepository.save(daily);
        }
        return fallback;
    }

    private Map<String, Map<String, Object>> generateForAllLocales(Map<String, Object> basePayload) {
        Map<String, Map<String, Object>> result = new java.util.concurrent.ConcurrentHashMap<>();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<Void>> futures = SUPPORTED_LOCALES.stream()
                .map(loc -> CompletableFuture.runAsync(() -> {
                    Map<String, Object> localePayload = new HashMap<>(basePayload);
                    localePayload.put("locale", loc);
                    Map<String, Object> deck = aiService.generateRandomDeck(localePayload);
                    if (deck != null) result.put(loc, deck);
                }, executor))
                .toList();
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        }
        return result;
    }

    private void enrichRatingsInfo(Map<String, Object> deckData, Map<String, Integer> ratings, Object userIdObj) {
        if (deckData == null) return;
        
        int totalRatings = 0;
        double averageRating = 0.0;
        Integer userRating = null;

        if (ratings != null && !ratings.isEmpty()) {
            totalRatings = ratings.size();
            long sum = ratings.values().stream().mapToInt(Integer::intValue).sum();
            averageRating = (double) sum / totalRatings;

            if (userIdObj instanceof String userId && ratings.containsKey(userId)) {
                userRating = ratings.get(userId);
            }
        }

        deckData.put("totalRatings", totalRatings);
        deckData.put("averageRating", Math.round(averageRating * 10.0) / 10.0); // 1 decimal
        deckData.put("userRating", userRating);
    }

    private boolean isMissingManaCosts(Map<String, Object> deckData) {
        if (deckData == null) return false;
        Object main = deckData.get("main_deck");
        if (main instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map<?, ?> cardMap) {
                return !cardMap.containsKey("mana_cost");
            }
        }
        return true;
    }

    private void enrichDeckData(Map<String, Object> deckData) {
        if (deckData == null) return;
        enrichDeckList(deckData, "main_deck");
        enrichDeckList(deckData, "sideboard");
        enrichDeckList(deckData, "maybeboard");
    }

    private void enrichDeckList(Map<String, Object> deckData, String key) {
        Object listObj = deckData.get(key);
        if (listObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> cardMap) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> mutableCardMap = (Map<String, Object>) cardMap;
                    String cardName = (String) mutableCardMap.get("name");
                    if (cardName != null) {
                        cardName = cardName.trim();
                        // Intentar buscar en repositorio local primero (exacto)
                        String finalName = cardName;
                        String manaCost = cardRepository.findByName(finalName)
                            .map(com.manaforge.api.model.mongo.Card::getManaCost)
                            .orElse(null);
                        
                        // Si falla exacto, probar con el buscador de "contiene"
                        if (manaCost == null) {
                            List<com.manaforge.api.model.mongo.Card> matches = cardRepository.findByNameContainingIgnoreCase(finalName);
                            if (!matches.isEmpty()) {
                                manaCost = matches.get(0).getManaCost();
                            }
                        }
                        
                        if (manaCost == null) {
                            try {
                                Map<String, Object> scryData = scryfallService.getCardNamed(finalName, null, null);
                                if (scryData != null && scryData.containsKey("mana_cost")) {
                                    manaCost = (String) scryData.get("mana_cost");
                                }
                                if (scryData != null && (Boolean.TRUE.equals(scryData.get("games_changer")) || Boolean.TRUE.equals(scryData.get("game_changer")))) {
                                    mutableCardMap.put("isGameChanger", true);
                                }
                            } catch (Exception e) {
                                // Ignorar errores de red
                            }
                        } else {
                            // Si lo encontramos en cache, intentar sacar el gameChanger si existe
                            cardRepository.findByName(finalName).ifPresent(c -> {
                                if (Boolean.TRUE.equals(c.getGameChanger())) {
                                    mutableCardMap.put("isGameChanger", true);
                                }
                            });
                        }
                        
                        if (manaCost != null) {
                            mutableCardMap.put("mana_cost", manaCost);
                        }
                    }
                }
            }
        }
    }

    private Optional<DailyDeck> getDailyDeckSafe(LocalDate date) {
        try {
            return dailyDeckRepository.findByDate(date);
        } catch (IncorrectResultSizeDataAccessException e) {
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

    @Override
    public Deck pinDeck(String id, String userId) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        if (!deck.getUserId().equals(userId)) {
            throw new RuntimeException("Forbidden: You do not own this deck");
        }
        deck.setPinned(true);
        return deckRepository.save(deck);
    }

    @Override
    public Deck unpinDeck(String id, String userId) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        if (!deck.getUserId().equals(userId)) {
            throw new RuntimeException("Forbidden: You do not own this deck");
        }
        deck.setPinned(false);
        return deckRepository.save(deck);
    }

    @Override
    public Map<String, Object> rateDailyDeck(LocalDate date, String userId, int stars) {
        DailyDeck dailyDeck = getDailyDeckSafe(date)
                .orElseThrow(() -> new RuntimeException("Daily deck not found for date: " + date));

        Map<String, Integer> ratings = dailyDeck.getRatings();
        if (ratings == null) {
            ratings = new HashMap<>();
            dailyDeck.setRatings(ratings);
        }

        // Si el usuario vota la MISMA estrella, la quitamos (despuntuar). Si no, la guardamos/actualizamos
        if (ratings.containsKey(userId) && ratings.get(userId) == stars) {
            ratings.remove(userId);
        } else {
            // Validar límite 1-5
            stars = Math.max(1, Math.min(5, stars));
            ratings.put(userId, stars);
        }

        dailyDeckRepository.save(dailyDeck);

        Map<String, Object> response = new HashMap<>(dailyDeck.getDeckData());
        enrichRatingsInfo(response, ratings, userId);
        return response;
    }
}
