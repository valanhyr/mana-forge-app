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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
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

    @Cacheable(value = "scryfall_prints")
    public Map<String, Object> getPrintsByOracleId(String oracleId) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(SCRYFALL_API_URL)
                    .queryParam("q", "oracle_id:" + oracleId)
                    .queryParam("unique", "prints");

            URI uri = builder.build().encode().toUri();

            throttle();
            return restTemplate.getForObject(uri, Map.class);
        } catch (HttpClientErrorException.NotFound e) {
            return Map.of("object", "list", "data", Collections.emptyList());
        } catch (HttpClientErrorException.TooManyRequests e) {
            return Map.of("object", "error", "code", "rate_limited", "details", "Scryfall rate limit reached.");
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "list", "data", Collections.emptyList());
        }
    }

    /**
     * Batch search helper: accepts a list of query strings (e.g. names or q= expressions)
     * Returns a map from the original query to the Scryfall response Map.
     */
    public Map<String, Map<String, Object>> batchSearch(List<String> queries) {
        if (queries == null || queries.isEmpty()) return Collections.emptyMap();

        // Use a virtual-thread executor when available to scale many concurrent tasks.
        ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor();
        try {
            List<CompletableFuture<Map<String, Object>>> futures = queries.stream()
                    .map(q -> CompletableFuture.<Map<String,Object>>supplyAsync(() -> {
                        try {
                            return searchCards(Map.of("q", q));
                        } catch (Exception e) {
                            e.printStackTrace();
                            return Map.of("object", "error", "details", "internal_error");
                        }
                    }, ex))
                    .collect(java.util.stream.Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            Map<String, Map<String, Object>> result = new LinkedHashMap<>();
            for (int i = 0; i < queries.size(); i++) {
                try {
                    result.put(queries.get(i), futures.get(i).get());
                } catch (Exception e) {
                    result.put(queries.get(i), Map.of("object", "error", "details", "failed_to_get"));
                }
            }
            return result;
        } finally {
            ex.shutdown();
            try { ex.awaitTermination(1, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
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

    /**
     * Use Scryfall /cards/collection to fetch many cards by identifiers in one request.
     * Accepts identifiers like scryfall ids, multiverse ids, etc.
     */
    public Map<String, Object> collectionByIdentifiers(List<Map<String, String>> identifiers) {
        try {
            URI uri = UriComponentsBuilder.fromUriString("https://api.scryfall.com/cards/collection").build().encode().toUri();
            Map<String, Object> body = Map.of("identifiers", identifiers);
            throttle();
            return restTemplate.postForObject(uri, body, Map.class);
        } catch (HttpClientErrorException.TooManyRequests e) {
            return Map.of("object", "error", "code", "rate_limited", "details", "Scryfall rate limit reached.");
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("object", "error", "details", "collection_failed");
        }
    }
}