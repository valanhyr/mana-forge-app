package com.manaforge.api.service;

import java.util.Collections;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
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

    public AiService(@Qualifier("aiRestTemplate") RestTemplate restTemplate, @Value("${services.python-engine.url:http://localhost:8000}") String engineUrl) {
        this.restTemplate = restTemplate;
        // Asegurar que no haya doble barra al concatenar y que termine en /v1/ai
        String baseUrl = engineUrl.endsWith("/") ? engineUrl.substring(0, engineUrl.length() - 1) : engineUrl;
        this.engineUrl = baseUrl.endsWith("/v1/ai") ? baseUrl : baseUrl + "/v1/ai";
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
        logger.info("Calling AI Engine (Random): {} [Thread: {}]", url, Thread.currentThread().getName());

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            
            if (response == null || response.containsKey("error")) {
                logger.warn("AI Engine returned invalid response for random deck: {}", response);
                return null;
            }
            
            logger.info("AI Engine returned a valid deck response.");
            return response;
        } catch (Exception e) {
            logger.error("Error generating random deck with AI: {}", e.getMessage());
            return null;
        }
    }
}