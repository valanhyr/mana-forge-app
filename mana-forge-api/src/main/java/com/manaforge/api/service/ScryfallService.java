package com.manaforge.api.service;

import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponents;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Service
public class ScryfallService {

    private final RestTemplate restTemplate;
    private static final String SCRYFALL_API_URL = "https://api.scryfall.com/cards/search";

    public ScryfallService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> searchCards(String query) {
        UriComponents uriComponents = UriComponentsBuilder.fromUriString(SCRYFALL_API_URL)
                .queryParam("q", query)
                .build();
        
        return restTemplate.getForObject(uriComponents.toUriString(), Map.class);
    }
}