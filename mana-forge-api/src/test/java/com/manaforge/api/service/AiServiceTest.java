package com.manaforge.api.service;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class AiServiceTest {

    private WireMockServer wireMock;
    private AiService aiService;
    private final RestTemplate restTemplate = new RestTemplate();

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        wireMock.start();
        aiService = new AiService(restTemplate, wireMock.baseUrl());
    }

    @AfterEach
    void tearDown() {
        wireMock.stop();
    }

    @Test
    void analyzeDeck_returnsMapWithScoreOnSuccess() {
        wireMock.stubFor(post(urlEqualTo("/v1/ai/analyze-deck"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"score\": 85, \"summary\": \"Solid aggro deck\"}")));

        Map<String, Object> result = aiService.analyzeDeck(Map.of("deck", "data"));

        assertThat(result).containsKey("score");
        assertThat(result.get("score")).isEqualTo(85);
    }

    @Test
    void analyzeDeck_returnsErrorMapWhenServerError() {
        wireMock.stubFor(post(urlEqualTo("/v1/ai/analyze-deck"))
                .willReturn(aResponse()
                        .withStatus(500)
                        .withBody("Internal Server Error")));

        Map<String, Object> result = aiService.analyzeDeck(Map.of("deck", "data"));

        assertThat(result).containsKey("error");
    }

    @Test
    void generateRandomDeck_returnsValidDeckOnSuccess() {
        String deckJson = """
                {
                    "deck_name": "Red Rush",
                    "archetype": "Sligh",
                    "main_deck": [],
                    "sideboard": []
                }
                """;
        wireMock.stubFor(post(urlEqualTo("/v1/ai/generate-random-deck"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(deckJson)));

        Map<String, Object> result = aiService.generateRandomDeck(Map.of("locale", "en"));

        assertThat(result).isNotNull();
        assertThat(result).containsKey("deck_name");
    }

    @Test
    void generateRandomDeck_returnsNullWhenResponseContainsError() {
        wireMock.stubFor(post(urlEqualTo("/v1/ai/generate-random-deck"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"error\": \"Model unavailable\"}")));

        Map<String, Object> result = aiService.generateRandomDeck(Map.of("locale", "en"));

        assertThat(result).isNull();
    }

    @Test
    void analyzeDeck_returnsErrorMapOnConnectionRefused() {
        wireMock.stop();

        Map<String, Object> result = aiService.analyzeDeck(Map.of("deck", "data"));

        assertThat(result).containsKey("error");
    }
}
