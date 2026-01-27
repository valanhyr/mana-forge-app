package com.manaforge.api.service;

import java.util.Collections;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AiService {

    private static final Logger logger = LoggerFactory.getLogger(AiService.class);
    private final RestTemplate restTemplate;
    private final String engineUrl;

    public AiService(RestTemplate restTemplate, @Value("${manaforge.engine.url:http://localhost:8000/v1/ai}") String engineUrl) {
        this.restTemplate = restTemplate;
        // Asegurar que no haya doble barra al concatenar
        this.engineUrl = engineUrl.endsWith("/") ? engineUrl.substring(0, engineUrl.length() - 1) : engineUrl;
    }

    public Map<String, Object> analyzeDeck(Map<String, Object> deckPayload) {
        String url = engineUrl + "/analyze-deck";
        logger.info("Calling AI Engine (Analyze): {}", url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Empaquetamos el payload del mazo para enviarlo al motor
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(deckPayload, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            return response != null ? response : Collections.emptyMap();
        } catch (Exception e) {
            logger.error("Error analyzing deck with AI: {}", e.getMessage());
            return Map.of("error", "AI Service unavailable", "details", e.getMessage());
        }
    }

    public Map<String, Object> generateRandomDeck(Map<String, Object> payload) {
        String url = engineUrl + "/generate-random-deck";
        logger.info("Calling AI Engine (Random): {}", url);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            return response != null ? response : Collections.emptyMap();
        } catch (Exception e) {
            logger.error("Error generating random deck with AI: {}", e.getMessage());
            return Map.of("error", "AI Service unavailable", "details", e.getMessage());
        }
    }
}