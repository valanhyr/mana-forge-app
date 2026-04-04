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
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ScryfallService {

    private final RestTemplate restTemplate;

    /** Enforces Scryfall's <10 req/sec policy across all threads. */
    private static final ReentrantLock RATE_LOCK = new ReentrantLock();
    private static volatile long lastCallMs = 0;
    private static final long MIN_INTERVAL_MS = 110;
    private static final String SCRYFALL_API_URL = "https://api.scryfall.com/cards/search";
    private static final String SCRYFALL_CARD_BY_ID_URL = "https://api.scryfall.com/cards/{id}";
    private static final String SCRYFALL_SYMBOLOGY_URL = "https://api.scryfall.com/symbology";
    private static final String SCRYFALL_NAMED_URL = "https://api.scryfall.com/cards/named";
    private static final String SCRYFALL_AUTOCOMPLETE_URL = "https://api.scryfall.com/cards/autocomplete";

    public ScryfallService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** Blocks the calling thread (virtual-thread safe) until a Scryfall call is permitted. */
    private void throttle() {
        RATE_LOCK.lock();
        try {
            long wait = lastCallMs + MIN_INTERVAL_MS - System.currentTimeMillis();
            if (wait > 0) {
                try { Thread.sleep(wait); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            }
            lastCallMs = System.currentTimeMillis();
        } finally {
            RATE_LOCK.unlock();
        }
    }

    @Cacheable(value = "scryfall_search")
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

            throttle();
            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            return Map.of("object", "list", "data", Collections.emptyList());
        } catch (Exception e) {
            e.printStackTrace(); // Imprime el error en consola para depurar
            return Map.of("object", "list", "data", Collections.emptyList());
        }
    }

    @Cacheable(value = "scryfall_card")
    public Map<String, Object> getCardById(String id) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(SCRYFALL_CARD_BY_ID_URL)
                    .buildAndExpand(id)
                    .toUri();

            throttle();
            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            return Collections.emptyMap();
        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyMap();
        }
    }

    @Cacheable(value = "scryfall_symbology")
    public Map<String, Object> getSymbology() {
        try {
            throttle();
            return restTemplate.getForObject(SCRYFALL_SYMBOLOGY_URL, Map.class);
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "list", "data", Collections.emptyList());
        }
    }

    @Cacheable(value = "scryfall_named")
    public Map<String, Object> getCardNamed(String exact, String fuzzy, String set) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(SCRYFALL_NAMED_URL);
            
            if (exact != null) builder.queryParam("exact", exact);
            if (fuzzy != null) builder.queryParam("fuzzy", fuzzy);
            if (set != null) builder.queryParam("set", set);

            URI uri = builder.build().encode().toUri();

            throttle();
            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            // Devuelve un mapa con error controlado en lugar de lanzar excepción
            return Map.of("object", "error", "code", "not_found", "details", "No card found with the given name.");
        } catch (HttpClientErrorException.TooManyRequests e) {
            return Map.of("object", "error", "code", "rate_limited", "details", "Scryfall rate limit reached.");
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "error", "details", "Internal error fetching named card.");
        }
    }

    @Cacheable(value = "scryfall_search")
    public Map<String, Object> getBannedCardsByFormat(String format) {
        return searchCards(Map.of("q", "banned:" + format));
    }

    @Cacheable(value = "scryfall_autocomplete")
    public Map<String, Object> getAutocomplete(String query) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(SCRYFALL_AUTOCOMPLETE_URL)
                    .queryParam("q", query)
                    .build()
                    .encode()
                    .toUri();

            throttle();
            return restTemplate.getForObject(uri, Map.class);
        } catch (Exception e) {
            return Map.of("object", "catalog", "data", Collections.emptyList());
        }
    }
}