package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.mongo.Card;
import com.manaforge.api.repository.CardRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.ScryfallService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CardController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class CardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CardRepository cardRepository;

    @MockitoBean
    private ScryfallService scryfallService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void searchScryfall_returns200WithCardData() throws Exception {
        Map<String, Object> response = Map.of("object", "list", "data", List.of(
                Map.of("name", "Lightning Bolt", "id", "abc123")
        ));
        when(scryfallService.searchCards(any())).thenReturn(response);

        mockMvc.perform(get("/api/cards/scryfall").param("q", "lightning"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.object").value("list"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    void getScryfallCardById_returns200WithCardData() throws Exception {
        Map<String, Object> cardData = Map.of("id", "abc123", "name", "Lightning Bolt");
        when(scryfallService.getCardById("abc123")).thenReturn(cardData);

        mockMvc.perform(get("/api/cards/scryfall/abc123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Lightning Bolt"));
    }

    @Test
    void getBannedCards_byFormat_returns200() throws Exception {
        Map<String, Object> response = Map.of("object", "list", "data", List.of());
        when(scryfallService.getBannedCardsByFormat("premodern")).thenReturn(response);

        mockMvc.perform(get("/api/cards/banned/premodern"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.object").value("list"));
    }

    @Test
    void getAutocomplete_withQuery_returns200WithData() throws Exception {
        Map<String, Object> catalog = Map.of("object", "catalog", "data", List.of("Lightning Bolt"));
        when(scryfallService.getAutocomplete("Light")).thenReturn(catalog);

        mockMvc.perform(get("/api/cards/autocomplete").param("q", "Light"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void getAutocomplete_withNoQuery_returns200WithEmptyData() throws Exception {
        mockMvc.perform(get("/api/cards/autocomplete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        verify(scryfallService, never()).getAutocomplete(any());
    }

    @Test
    void getCardById_throughBaseController_returns200WhenFound() throws Exception {
        Card card = new Card();
        card.setId("mongo-id-1");
        card.setName("Dark Ritual");
        when(cardRepository.findById("mongo-id-1")).thenReturn(Optional.of(card));

        mockMvc.perform(get("/api/cards/mongo-id-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Dark Ritual"));
    }
}
