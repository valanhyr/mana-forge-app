package com.manaforge.api.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PremodernServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ScryfallService scryfallService;

    @InjectMocks
    private PremodernService premodernService;

    @SuppressWarnings("unchecked")
    private void stubExchange(List<Map<String, Object>> body) {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)
        )).thenReturn(ResponseEntity.ok(body));
    }

    private Map<String, Object> validCard(String name) {
        Map<String, Object> card = new HashMap<>();
        card.put("object", "card");
        card.put("name", name);
        return card;
    }

    @Test
    void getBannedCards_returnsEnrichedList() {
        stubExchange(List.of(Map.of("cardName", "Necropotence"), Map.of("cardName", "Demonic Tutor")));
        when(scryfallService.getCardNamed("Necropotence", null, null)).thenReturn(validCard("Necropotence"));
        when(scryfallService.getCardNamed("Demonic Tutor", null, null)).thenReturn(validCard("Demonic Tutor"));

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).get("name")).isEqualTo("Necropotence");
    }

    @Test
    void getBannedCards_filtersOutErrorCards() {
        stubExchange(List.of(Map.of("cardName", "BadCard")));
        Map<String, Object> errorCard = new HashMap<>();
        errorCard.put("object", "error");
        when(scryfallService.getCardNamed("BadCard", null, null)).thenReturn(errorCard);

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).isEmpty();
    }

    @Test
    void getBannedCards_filtersOutNullCards() {
        stubExchange(List.of(Map.of("cardName", "Unknown")));
        when(scryfallService.getCardNamed("Unknown", null, null)).thenReturn(null);

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).isEmpty();
    }

    @Test
    void getBannedCards_filtersOutEntriesWithoutCardName() {
        stubExchange(List.of(Map.of("someOtherKey", "value")));

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).isEmpty();
        verify(scryfallService, never()).getCardNamed(any(), any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getBannedCards_returnsEmptyOnNullResponse() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)
        )).thenReturn(ResponseEntity.ok(null));

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void getBannedCards_returnsEmptyOnException() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)
        )).thenThrow(new RuntimeException("Network error"));

        List<Map<String, Object>> result = premodernService.getBannedCards();

        assertThat(result).isEmpty();
    }
}
