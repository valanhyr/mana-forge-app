package com.manaforge.api.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.Map;

@Service
public class ScryfallService {

    private final RestTemplate restTemplate;
    private static final String SCRYFALL_API_URL = "https://api.scryfall.com/cards/search";
    private static final String SCRYFALL_CARD_BY_ID_URL = "https://api.scryfall.com/cards/{id}";
    private static final String SCRYFALL_SYMBOLOGY_URL = "https://api.scryfall.com/symbology";
    private static final String SCRYFALL_NAMED_URL = "https://api.scryfall.com/cards/named";
    private static final String SCRYFALL_AUTOCOMPLETE_URL = "https://api.scryfall.com/cards/autocomplete";

    public ScryfallService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Cacheable(value = "scryfall_search", cacheManager = "scryfallCacheManager")
    public Map<String, Object> searchCards(Map<String, String> params) {
        try {
            MultiValueMap<String, String> queryParams = new LinkedMultiValueMap<>();
            if (params != null) {
                queryParams.setAll(params);
            }

            URI uri = UriComponentsBuilder.fromUriString(SCRYFALL_API_URL)
                    .queryParams(queryParams)
                    .build()
                    .encode()
                    .toUri();

            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            return Map.of("object", "list", "data", Collections.emptyList());
        } catch (Exception e) {
            e.printStackTrace(); // Imprime el error en consola para depurar
            return Map.of("object", "list", "data", Collections.emptyList());
        }
    }

    @Cacheable(value = "scryfall_card", cacheManager = "scryfallCacheManager")
    public Map<String, Object> getCardById(String id) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(SCRYFALL_CARD_BY_ID_URL)
                    .buildAndExpand(id)
                    .toUri();

            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            return Collections.emptyMap();
        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyMap();
        }
    }

    @Cacheable(value = "scryfall_symbology", cacheManager = "scryfallCacheManager")
    public Map<String, Object> getSymbology() {
        try {
            return restTemplate.getForObject(SCRYFALL_SYMBOLOGY_URL, Map.class);
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "list", "data", Collections.emptyList());
        }
    }

    @Cacheable(value = "scryfall_named", cacheManager = "scryfallCacheManager")
    public Map<String, Object> getCardNamed(String exact, String fuzzy, String set) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(SCRYFALL_NAMED_URL);
            
            if (exact != null) builder.queryParam("exact", exact);
            if (fuzzy != null) builder.queryParam("fuzzy", fuzzy);
            if (set != null) builder.queryParam("set", set);

            URI uri = builder.build().encode().toUri();

            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            // Devuelve un mapa con error controlado en lugar de lanzar excepción
            return Map.of("object", "error", "code", "not_found", "details", "No card found with the given name.");
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "error", "details", "Internal error fetching named card.");
        }
    }

    @Cacheable(value = "scryfall_autocomplete", cacheManager = "scryfallCacheManager")
    public Map<String, Object> getAutocomplete(String query) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(SCRYFALL_AUTOCOMPLETE_URL)
                    .queryParam("q", query)
                    .build()
                    .encode()
                    .toUri();

            return restTemplate.getForObject(uri, Map.class);
        } catch (Exception e) {
            return Map.of("object", "catalog", "data", Collections.emptyList());
        }
    }
}