package com.manaforge.api.service;

import com.manaforge.api.dto.DeckRequestDTO;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.model.mongo.Format;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.*;
import com.manaforge.api.service.impl.DeckServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeckServiceImplTest {

    @Mock private DeckRepository deckRepository;
    @Mock private ScryfallService scryfallService;
    @Mock private AiService aiService;
    @Mock private DailyDeckRepository dailyDeckRepository;
    @Mock private FormatRepository formatRepository;
    @Mock private UserRepository userRepository;
    @Mock private CardRepository cardRepository;

    @InjectMocks
    private DeckServiceImpl deckService;

    private Deck buildDeck(String id, String userId) {
        Deck deck = new Deck();
        deck.setId(id);
        deck.setName("Test Deck");
        deck.setFormatId("fmt1");
        deck.setUserId(userId);
        deck.setCards(List.of());
        deck.setLikedBy(new HashSet<>());
        return deck;
    }

    private DeckRequestDTO buildDto() {
        DeckRequestDTO dto = new DeckRequestDTO();
        dto.setName("My Deck");
        dto.setFormatId("fmt1");
        dto.setPrivate(false);
        DeckRequestDTO.CardEntry entry = new DeckRequestDTO.CardEntry();
        entry.setId("scry-abc");
        entry.setQuantity(4);
        entry.setBoard("main");
        dto.setCards(List.of(entry));
        return dto;
    }

    @Test
    void saveDeck_mapsCardsAndSavesWithUserId() {
        when(scryfallService.getCardById("scry-abc")).thenReturn(Map.of("colors", List.of("R")));
        Deck saved = buildDeck("d1", "user1");
        saved.setColors(List.of("R"));
        when(deckRepository.save(any(Deck.class))).thenReturn(saved);

        Deck result = deckService.saveDeck(buildDto(), "user1");

        assertThat(result.getUserId()).isEqualTo("user1");
        assertThat(result.getColors()).contains("R");
        verify(deckRepository).save(any(Deck.class));
    }

    @Test
    void updateDeck_throwsForbiddenWhenNotOwner() {
        Deck existing = buildDeck("d1", "ownerUser");
        when(deckRepository.findById("d1")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> deckService.updateDeck("d1", buildDto(), "otherUser"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    void updateDeck_throwsNotFoundWhenDeckMissing() {
        when(deckRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.updateDeck("missing", buildDto(), "user1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void updateDeck_successWhenOwner() {
        Deck existing = buildDeck("d1", "user1");
        when(deckRepository.findById("d1")).thenReturn(Optional.of(existing));
        when(scryfallService.getCardById(anyString())).thenReturn(Map.of("colors", List.of("W")));
        when(deckRepository.save(any(Deck.class))).thenReturn(existing);

        Deck result = deckService.updateDeck("d1", buildDto(), "user1");

        assertThat(result).isNotNull();
        verify(deckRepository).save(existing);
    }

    @Test
    void getDeckById_returnsDeckWhenFound() {
        Deck deck = buildDeck("d1", "user1");
        deck.setColors(List.of("R"));
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));

        Deck result = deckService.getDeckById("d1");

        assertThat(result.getId()).isEqualTo("d1");
    }

    @Test
    void getDeckById_throwsWhenNotFound() {
        when(deckRepository.findById("x")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.getDeckById("x"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getDeckView_likedByMeTrue_whenCurrentUserInLikedBySet() {
        Deck deck = buildDeck("d1", "user1");
        deck.setLikedBy(Set.of("user1"));
        deck.setCards(List.of());
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(formatRepository.findById("fmt1")).thenReturn(Optional.empty());
        when(userRepository.findById("user1")).thenReturn(Optional.empty());

        DeckViewDTO view = deckService.getDeckView("d1", "en", "user1");

        assertThat(view.isLikedByMe()).isTrue();
    }

    @Test
    void getDeckView_includesFormatNameFromLocale() {
        Deck deck = buildDeck("d1", "user1");
        deck.setCards(List.of());
        Format format = new Format();
        format.setName(Map.of("en", "Premodern", "es", "Premodereno"));
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(formatRepository.findById("fmt1")).thenReturn(Optional.of(format));
        when(userRepository.findById("user1")).thenReturn(Optional.empty());

        DeckViewDTO view = deckService.getDeckView("d1", "en", null);

        assertThat(view.getFormatName()).isEqualTo("Premodern");
    }

    @Test
    void likeDeck_addsToLikedByAndReturnsUpdatedCount() {
        Deck deck = buildDeck("d1", "user1");
        deck.setLikedBy(new HashSet<>());
        deck.setLikesCount(0);
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(deckRepository.save(any())).thenReturn(deck);

        Map<String, Object> result = deckService.likeDeck("d1", "user2");

        assertThat(result.get("likedByMe")).isEqualTo(true);
        assertThat((int) result.get("likesCount")).isEqualTo(1);
    }

    @Test
    void likeDeck_throwsWhenDeckNotFound() {
        when(deckRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.likeDeck("missing", "user1"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void unlikeDeck_removesFromLikedByAndDecrementsCount() {
        Deck deck = buildDeck("d1", "user1");
        deck.setLikedBy(new HashSet<>(Set.of("user2")));
        deck.setLikesCount(1);
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(deckRepository.save(any())).thenReturn(deck);

        Map<String, Object> result = deckService.unlikeDeck("d1", "user2");

        assertThat(result.get("likedByMe")).isEqualTo(false);
        assertThat((int) result.get("likesCount")).isEqualTo(0);
    }

    @Test
    void cloneDeck_createsCopyWithPrefixAndIsPrivateTrue() {
        Deck original = buildDeck("d1", "user1");
        original.setName("My Deck");
        original.setCards(List.of());
        original.setColors(List.of("R"));
        when(deckRepository.findById("d1")).thenReturn(Optional.of(original));
        when(deckRepository.save(any(Deck.class))).thenAnswer(inv -> inv.getArgument(0));

        Deck clone = deckService.cloneDeck("d1", "user2");

        assertThat(clone.getName()).isEqualTo("Copy of My Deck");
        assertThat(clone.isPrivate()).isTrue();
        assertThat(clone.getUserId()).isEqualTo("user2");
    }

    @Test
    void cloneDeck_throwsWhenOriginalNotFound() {
        when(deckRepository.findById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deckService.cloneDeck("missing", "user2"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void deleteDeck_throwsForbiddenWhenNotOwner() {
        Deck deck = buildDeck("d1", "ownerUser");
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));

        assertThatThrownBy(() -> deckService.deleteDeck("d1", "otherUser"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    void deleteDeck_callsDeleteByIdWhenOwner() {
        Deck deck = buildDeck("d1", "user1");
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));

        deckService.deleteDeck("d1", "user1");

        verify(deckRepository).delete(deck);
    }

    @Test
    void pinDeck_setsPinnedTrueForOwner() {
        Deck deck = buildDeck("d1", "user1");
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(deckRepository.save(deck)).thenReturn(deck);

        Deck result = deckService.pinDeck("d1", "user1");

        assertThat(result.isPinned()).isTrue();
    }

    @Test
    void unpinDeck_setsPinnedFalseForOwner() {
        Deck deck = buildDeck("d1", "user1");
        deck.setPinned(true);
        when(deckRepository.findById("d1")).thenReturn(Optional.of(deck));
        when(deckRepository.save(deck)).thenReturn(deck);

        Deck result = deckService.unpinDeck("d1", "user1");

        assertThat(result.isPinned()).isFalse();
    }

    @Test
    void searchDecks_callsCorrectRepoMethodForNameOnly() {
        when(deckRepository.findByIsPrivateFalseAndNameContainingIgnoreCase("bolt")).thenReturn(List.of());

        deckService.searchDecks("bolt", null, "en");

        verify(deckRepository).findByIsPrivateFalseAndNameContainingIgnoreCase("bolt");
        verify(deckRepository, never()).findByIsPrivateFalse();
    }

    @Test
    void analyzeDeck_delegatesToAiService() {
        Map<String, Object> payload = Map.of("deck", "data");
        Map<String, Object> expected = Map.of("score", 85);
        when(aiService.analyzeDeck(payload)).thenReturn(expected);

        Map<String, Object> result = deckService.analyzeDeck(payload);

        assertThat(result).isEqualTo(expected);
    }

    @Test
    void getFeaturedDeck_returnsNullWhenNoPublicDecksExist() {
        when(deckRepository.findByIsPrivateFalse()).thenReturn(List.of());

        assertThat(deckService.getFeaturedDeck("en")).isNull();
    }
}
