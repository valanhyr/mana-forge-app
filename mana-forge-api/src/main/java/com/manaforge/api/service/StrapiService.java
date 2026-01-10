package com.manaforge.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.model.strapi.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Service
public class StrapiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public StrapiService(RestClient.Builder builder,
                         ObjectMapper objectMapper,
                         @Value("${strapi.api.url}") String strapiApiUrl,
                         @Value("${strapi.api.token}") String strapiApiToken) {
        this.objectMapper = objectMapper;
        // Inicialización moderna del RestClient (Stack 2025)
        this.restClient = builder
                .baseUrl(strapiApiUrl)
                .defaultHeader("Authorization", "Bearer " + strapiApiToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    /**
     * Método privado para centralizar las llamadas a Strapi y extraer el nodo "data"
     */
    private JsonNode fetchFromStrapi(String collection, String query) throws JsonProcessingException {
        String path = "/" + collection + (query != null && !query.isEmpty() ? "?" + query : "");
        
        System.out.println("   -> 🚀 Calling Strapi API: " + path);
        
        try {
            String response = restClient.get()
                    .uri(path)
                    .retrieve()
                    .body(String.class);

            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode dataNode = rootNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                System.err.println("   -> ⚠️ No data found for: " + collection);
                return null;
            }
            return dataNode;
        } catch (Exception e) {
            System.err.println("   -> ❌ Error calling Strapi: " + e.getMessage());
            throw new RuntimeException("Error fetching " + collection + " from Strapi", e);
        }
    }

    @Cacheable(value = "footer", key = "#locale")
    public Footer getFooter(String locale) throws JsonProcessingException {
        String query = "locale=" + locale + "&populate[footer_sections][populate][0]=footer_links";
        JsonNode data = fetchFromStrapi("footer", query);
        
        return (data != null) ? objectMapper.treeToValue(data, Footer.class) : null;
    }

    @Cacheable(value = "footer-legal", key = "#locale")
    public FooterLegal getFooterLegal(String locale) throws JsonProcessingException {
        String query = "locale=" + locale + "&populate=legal_links";
        JsonNode data = fetchFromStrapi("footer-legal", query);
        
        return (data != null) ? objectMapper.treeToValue(data, FooterLegal.class) : null;
    }

    @Cacheable(value = "heros", key = "#locale + '-' + #hero_id")
    public List<Hero> getHeros(String locale, String hero_id) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("populate=image");
        if (locale != null) query.append("&locale=").append(locale);
        if (hero_id != null) query.append("&filters[hero_id][$eq]=").append(hero_id);

        JsonNode dataNode = fetchFromStrapi("heros", query.toString());
        List<Hero> heros = new ArrayList<>();

        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                heros.add(objectMapper.treeToValue(node, Hero.class));
            }
        }
        return heros;
    }

    @Cacheable(value = "sections", key = "#locale + '-' + T(String).join(',', #sectionIds)")
    public List<Section> getSections(String locale, List<String> sectionIds) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("populate=image");
        if (locale != null) query.append("&locale=").append(locale);
        
        if (sectionIds != null && !sectionIds.isEmpty()) {
            for (int i = 0; i < sectionIds.size(); i++) {
                query.append("&filters[section_id][$in][").append(i).append("]=").append(sectionIds.get(i));
            }
        }

        JsonNode dataNode = fetchFromStrapi("sections", query.toString());
        List<Section> sections = new ArrayList<>();

        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                sections.add(objectMapper.treeToValue(node, Section.class));
            }
        }
        return sections;
    }

    @Cacheable(value = "languages", key = "#locale")
    public List<Language> getLanguages(String locale) throws JsonProcessingException {
        String query = "locale=" + locale;
        JsonNode dataNode = fetchFromStrapi("languages", query);
        
        List<Language> languages = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                languages.add(objectMapper.treeToValue(node, Language.class));
            }
        }
        return languages;
    }

    @Cacheable(value = "formats", key = "#locale")
    public List<StrapiFormatData> getFormats(String locale) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("populate[0]=rules&populate[1]=description");
        if (locale != null) {
            query.append("&locale=").append(locale);
        }
        JsonNode dataNode = fetchFromStrapi("formats", query.toString());

        List<StrapiFormatData> formats = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                formats.add(objectMapper.treeToValue(node, StrapiFormatData.class));
            }
        }
        return formats;
    }

    @Cacheable(value = "format-detail", key = "#mongoId + '-' + #locale")
    public StrapiFormatData getFormatByMongoId(String mongoId, String locale) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("filters[mongo_id][$eq]=").append(mongoId)
                .append("&populate[0]=rules&populate[1]=description");
        if (locale != null) {
            query.append("&locale=").append(locale);
        }
        JsonNode dataNode = fetchFromStrapi("formats", query.toString());

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(dataNode.get(0), StrapiFormatData.class);
        }
        return null;
    }
}