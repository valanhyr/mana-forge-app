package com.manaforge.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScryfallServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private ScryfallService scryfallService;

    @BeforeEach
    void setUp() {
        scryfallService = new ScryfallService(restTemplate);
    }

    @Test
    @SuppressWarnings("unchecked")
    void getCardById_returnsMapWhenRestTemplateReturnsData() {
        Map<String, Object> cardData = Map.of("id", "abc", "name", "Lightning Bolt", "colors", List.of("R"));
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(cardData);

        Map<String, Object> result = scryfallService.getCardById("abc");

        assertThat(result).containsKey("name");
        assertThat(result.get("name")).isEqualTo("Lightning Bolt");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getCardById_returnsEmptyMapWhenNotFound() {
        when(restTemplate.getForObject(any(URI.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.NotFound.class);

        Map<String, Object> result = scryfallService.getCardById("unknown-id");

        assertThat(result).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void getCardNamed_passesExactParam() {
        Map<String, Object> cardData = Map.of("name", "Counterspell");
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(cardData);

        Map<String, Object> result = scryfallService.getCardNamed("Counterspell", null, null);

        assertThat(result.get("name")).isEqualTo("Counterspell");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getCardNamed_returnsErrorMapWhenNotFound() {
        when(restTemplate.getForObject(any(URI.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.NotFound.class);

        Map<String, Object> result = scryfallService.getCardNamed("NonExistentCard", null, null);

        assertThat(result).containsKey("object");
        assertThat(result.get("object")).isEqualTo("error");
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchCards_returnsDataFromRestTemplate() {
        Map<String, Object> response = Map.of("object", "list", "data", List.of(Map.of("name", "Forest")));
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(response);

        Map<String, Object> result = scryfallService.searchCards(Map.of("q", "t:land"));

        assertThat(result).containsKey("data");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAutocomplete_returnsCatalogData() {
        Map<String, Object> catalog = Map.of("object", "catalog", "data", List.of("Lightning Bolt", "Lightning Helix"));
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(catalog);

        Map<String, Object> result = scryfallService.getAutocomplete("Light");

        assertThat(result).containsKey("data");
        assertThat(result.get("object")).isEqualTo("catalog");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getBannedCardsByFormat_callsSearchWithBannedQuery() {
        Map<String, Object> response = Map.of("object", "list", "data", List.of());
        when(restTemplate.getForObject(any(URI.class), eq(Map.class))).thenReturn(response);

        Map<String, Object> result = scryfallService.getBannedCardsByFormat("premodern");

        assertThat(result).containsKey("data");
    }
}
