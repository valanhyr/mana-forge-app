package com.manaforge.api.service;

import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.dto.DeckSearchResultDTO;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.dto.FeaturedDeckDTO;
import com.manaforge.api.model.mongo.Deck;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;

public interface DeckService {
    Deck saveDeck(DeckRequestDTO dto, String userId);
    Deck updateDeck(String id, DeckRequestDTO dto, String userId);
    Deck getDeckById(String id);
    DeckViewDTO getDeckView(String id, String locale, String currentUserId);
    Map<String, Object> likeDeck(String id, String userId);
    Map<String, Object> unlikeDeck(String id, String userId);
    Deck cloneDeck(String id, String userId);
    void deleteDeck(String id, String userId);
    List<DeckSearchResultDTO> searchDecks(String name, String formatId, String locale);
    FeaturedDeckDTO getFeaturedDeck(String locale);
    List<Deck> getDecksByUser(String userId);
    Map<String, Object> analyzeDeck(Map<String, Object> deckPayload);
    Map<String, Object> generateRandomDeck(Map<String, Object> payload);
    Deck pinDeck(String id, String userId);
    Deck unpinDeck(String id, String userId);
    Map<String, Object> rateDailyDeck(LocalDate date, String userId, int stars);
}
