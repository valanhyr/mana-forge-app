package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.dto.DeckViewDTO;
import com.manaforge.api.model.mongo.Deck;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.DeckService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeckController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class DeckControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DeckService deckService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId("user1");
        mockUser.setUsername("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(userRepository.findByEmail("testuser")).thenReturn(Optional.empty());
    }

    private UsernamePasswordAuthenticationToken mockAuth() {
        return new UsernamePasswordAuthenticationToken("testuser", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void postDeck_withoutAuth_returns4xx() throws Exception {
        mockMvc.perform(post("/api/decks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"formatId\":\"fmt1\",\"cards\":[],\"private\":false}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void postDeck_withAuth_returns200() throws Exception {
        Deck saved = new Deck();
        saved.setId("deck1");
        saved.setName("Test");
        saved.setCards(List.of());
        when(deckService.saveDeck(any(), eq("user1"))).thenReturn(saved);

        mockMvc.perform(post("/api/decks")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"formatId\":\"fmt1\",\"cards\":[],\"private\":false}"))
                .andExpect(status().isOk());
    }

    @Test
    void putDeck_withAuth_serviceForbidden_returns403() throws Exception {
        when(deckService.updateDeck(eq("deck1"), any(), eq("user1")))
                .thenThrow(new RuntimeException("Forbidden: not owner"));

        mockMvc.perform(put("/api/decks/deck1")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"formatId\":\"fmt1\",\"cards\":[],\"private\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void putDeck_withAuth_serviceNotFound_returns404() throws Exception {
        when(deckService.updateDeck(eq("deck1"), any(), eq("user1")))
                .thenThrow(new RuntimeException("Deck not found"));

        mockMvc.perform(put("/api/decks/deck1")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"formatId\":\"fmt1\",\"cards\":[],\"private\":false}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void putDeck_withAuth_success_returns200() throws Exception {
        Deck updated = new Deck();
        updated.setId("deck1");
        updated.setCards(List.of());
        when(deckService.updateDeck(eq("deck1"), any(), eq("user1"))).thenReturn(updated);

        mockMvc.perform(put("/api/decks/deck1")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"formatId\":\"fmt1\",\"cards\":[],\"private\":false}"))
                .andExpect(status().isOk());
    }

    @Test
    void getDeckById_found_returns200() throws Exception {
        Deck deck = new Deck();
        deck.setId("deck1");
        deck.setCards(List.of());
        when(deckService.getDeckById("deck1")).thenReturn(deck);

        mockMvc.perform(get("/api/decks/deck1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck1"));
    }

    @Test
    void getDeckById_notFound_returns404() throws Exception {
        when(deckService.getDeckById("missing")).thenThrow(new RuntimeException("Deck not found"));

        mockMvc.perform(get("/api/decks/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDeckView_found_returns200WithDto() throws Exception {
        DeckViewDTO dto = new DeckViewDTO();
        dto.setId("deck1");
        dto.setName("My Deck");
        dto.setMainDeck(List.of());
        dto.setSideboard(List.of());
        dto.setMaybeboard(List.of());
        when(deckService.getDeckView(eq("deck1"), any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/decks/deck1/view"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("deck1"))
                .andExpect(jsonPath("$.name").value("My Deck"));
    }

    @Test
    void deleteDeck_withoutAuth_returns4xx() throws Exception {
        mockMvc.perform(delete("/api/decks/deck1"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void deleteDeck_withAuth_serviceForbidden_returns403() throws Exception {
        doThrow(new RuntimeException("Forbidden: not owner"))
                .when(deckService).deleteDeck("deck1", "user1");

        mockMvc.perform(delete("/api/decks/deck1")
                        .with(authentication(mockAuth()))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteDeck_withAuth_success_returns200() throws Exception {
        doNothing().when(deckService).deleteDeck("deck1", "user1");

        mockMvc.perform(delete("/api/decks/deck1")
                        .with(authentication(mockAuth()))
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    void analyzeDeck_publicEndpoint_returns200() throws Exception {
        when(deckService.analyzeDeck(any())).thenReturn(Map.of("score", 90));

        mockMvc.perform(post("/api/decks/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deck\":\"data\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(90));
    }

    @Test
    void searchDecks_returns200WithList() throws Exception {
        when(deckService.searchDecks(eq("test"), isNull(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/decks/search").param("name", "test"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void likeDeck_withoutAuth_returns4xx() throws Exception {
        mockMvc.perform(post("/api/decks/deck1/like"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void likeDeck_withAuth_returns200WithLikesCount() throws Exception {
        when(deckService.likeDeck("deck1", "user1"))
                .thenReturn(Map.of("likesCount", 5, "likedByMe", true));

        mockMvc.perform(post("/api/decks/deck1/like")
                        .with(authentication(mockAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likesCount").value(5));
    }
}
