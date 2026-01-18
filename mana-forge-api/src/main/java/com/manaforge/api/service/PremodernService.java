package com.manaforge.api.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class PremodernService {

    private final RestTemplate restTemplate;
    private final ScryfallService scryfallService;
    private static final String PREMODERN_BANNED_URL = "https://premodernmagic.com/_serverside/get-banned-cards.php";

    public PremodernService(RestTemplate restTemplate, ScryfallService scryfallService) {
        this.restTemplate = restTemplate;
        this.scryfallService = scryfallService;
    }

    /**
     * Obtiene la lista de cartas prohibidas de Premodern y las enriquece con datos de Scryfall.
     * Se cachea el resultado. Configurar el TTL de "premodern_banned" para 1 mes en el CacheManager.
     */
    @Cacheable(value = "premodern_banned", cacheManager = "scryfallCacheManager")
    public List<Map<String, Object>> getBannedCards() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            headers.set("Referer", "https://premodernmagic.com/rules");
            headers.set("User-Agent", "TuWebBot/1.0");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            // Realizamos la petición a Premodern Magic
            List<Map<String, Object>> response = restTemplate.exchange(
                    PREMODERN_BANNED_URL,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            ).getBody();

            if (response == null) {
                return Collections.emptyList();
            }

            // Transformamos la lista simple en objetos completos de Scryfall
            return response.stream()
                    .map(item -> (String) item.get("cardName"))
                    .filter(Objects::nonNull)
                    .map(name -> scryfallService.getCardNamed(name, null, null))
                    .filter(this::isValidCard)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    /**
     * Verifica que el objeto devuelto por Scryfall sea válido y no un error.
     */
    private boolean isValidCard(Map<String, Object> card) {
        return card != null && !card.isEmpty() && !"error".equals(card.get("object"));
    }
}
