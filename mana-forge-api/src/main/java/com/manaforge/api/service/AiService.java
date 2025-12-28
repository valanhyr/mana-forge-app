package com.manaforge.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.Map;

@Service
public class AiService {

    private final RestTemplate restTemplate;
    private final String engineUrl;

    public AiService(RestTemplate restTemplate, @Value("${manaforge.engine.url:http://localhost:8000/v1/ai}") String engineUrl) {
        this.restTemplate = restTemplate;
        this.engineUrl = engineUrl;
    }

    public Map<String, Object> analyzeDeck(Map<String, Object> deckPayload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Empaquetamos el payload del mazo para enviarlo al motor
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(deckPayload, headers);

        // Construimos la URL. Asumimos que el endpoint en el motor es "/analyze"
        String url = engineUrl + "/analyze-deck";

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

        return response;
    }

    public Map<String, Object> generateRandomDeck(Map<String, Object> payload) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        String url = engineUrl + "/generate-random-deck";

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);

        return response;
    }
}