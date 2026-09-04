package com.manaforge.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.manaforge.api.model.strapi.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

/**
 * DirectusService - Replaces StrapiService for CMS content management
 * 
 * Key differences from Strapi:
 * 1. No "attributes" nesting - data is flat
 * 2. Simpler query parameters (filter[field][_eq]=value)
 * 3. Single endpoint per collection (/api/items/collection)
 * 4. Collections are flat - no populate depth needed
 * 
 * Usage: Same interface as StrapiService but connects to Directus backend
 */
@Service
public class DirectusService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public DirectusService(RestClient.Builder builder,
                           ObjectMapper objectMapper,
                           @Value("${directus.url:http://directus:8080}") String directusUrl,
                           @Value("${directus.admin-token:}") String adminToken) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Ensure URL doesn't end with / to avoid double slashes
        String cleanBaseUrl = directusUrl.endsWith("/") 
            ? directusUrl.substring(0, directusUrl.length() - 1) 
            : directusUrl;
        this.baseUrl = cleanBaseUrl;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000);
        requestFactory.setReadTimeout(60000);

        // Initialize RestClient with Authorization header
        this.restClient = builder
                .requestFactory(requestFactory)
                .baseUrl(cleanBaseUrl)
                .defaultHeader("Authorization", "Bearer " + adminToken)
                .defaultHeader("Content-Type", "application/json")
                .build();

        System.out.println("   -> 🔗 DirectusService initialized with URL: " + this.baseUrl);
    }

    /**
     * Helper method to make API calls to Directus
     */
    private JsonNode fetchFromDirectus(String endpoint, String query) throws JsonProcessingException {
        String path = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        String fullPath = path + (query != null && !query.isEmpty() ? "?" + query : "");

        System.out.println("   -> 🚀 Calling Directus API: " + this.baseUrl + fullPath);

        try {
            String response = restClient.get()
                    .uri(fullPath)
                    .retrieve()
                    .body(String.class);

            if (response != null && response.trim().startsWith("<")) {
                System.err.println("   -> ❌ Error: Received HTML instead of JSON from Directus");
                throw new RuntimeException("Invalid response from Directus (HTML received)");
            }

            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode dataNode = rootNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                System.err.println("   -> ⚠️ No data found for: " + endpoint);
                return null;
            }
            return dataNode;
        } catch (Exception e) {
            System.err.println("   -> ❌ Error calling Directus: " + e.getMessage());
            throw new RuntimeException("Error fetching " + endpoint + " from Directus", e);
        }
    }

    /**
     * Get footer by locale
     * Directus returns flat array, so we get first item
     */
    @Cacheable(value = "footer", key = "#locale")
    public Footer getFooter(String locale) throws JsonProcessingException {
        String query = "filter[locale][_eq]=" + locale;
        JsonNode dataNode = fetchFromDirectus("api/items/footer", query);

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(dataNode.get(0), Footer.class);
        }
        return null;
    }

    /**
     * Get footer legal information by locale
     */
    @Cacheable(value = "footer-legal", key = "#locale")
    public FooterLegal getFooterLegal(String locale) throws JsonProcessingException {
        String query = "filter[locale][_eq]=" + locale;
        JsonNode dataNode = fetchFromDirectus("api/items/footer_legal", query);

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(dataNode.get(0), FooterLegal.class);
        }
        return null;
    }

    /**
     * Get heroes filtered by locale and optional hero_id
     */
    @Cacheable(value = "heros", key = "#locale + '-' + #hero_id")
    public List<Hero> getHeros(String locale, String hero_id) throws JsonProcessingException {
        StringBuilder query = new StringBuilder();
        
        if (locale != null) {
            query.append("filter[locale][_eq]=").append(locale);
        }
        
        if (hero_id != null) {
            if (query.length() > 0) query.append("&");
            query.append("filter[hero_id][_eq]=").append(hero_id);
        }

        JsonNode dataNode = fetchFromDirectus("api/items/heros", query.toString());
        List<Hero> heros = new ArrayList<>();

        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                heros.add(objectMapper.treeToValue(node, Hero.class));
            }
        }
        return heros;
    }

    /**
     * Get sections filtered by locale and optional section IDs
     */
    @Cacheable(value = "sections", key = "#locale + '-' + T(String).join(',', #sectionIds)")
    public List<Section> getSections(String locale, List<String> sectionIds) throws JsonProcessingException {
        StringBuilder query = new StringBuilder();
        
        if (locale != null) {
            query.append("filter[locale][_eq]=").append(locale);
        }

        if (sectionIds != null && !sectionIds.isEmpty()) {
            for (int i = 0; i < sectionIds.size(); i++) {
                if (query.length() > 0) query.append("&");
                query.append("filter[section_id][_in][").append(i).append("]=").append(sectionIds.get(i));
            }
        }

        JsonNode dataNode = fetchFromDirectus("api/items/sections", query.toString());
        List<Section> sections = new ArrayList<>();

        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                sections.add(objectMapper.treeToValue(node, Section.class));
            }
        }
        return sections;
    }

    /**
     * Get available languages
     */
    @Cacheable(value = "languages", key = "#locale")
    public List<Language> getLanguages(String locale) throws JsonProcessingException {
        String query = locale != null ? "filter[locale][_eq]=" + locale : "";
        JsonNode dataNode = fetchFromDirectus("api/items/languages", query);

        List<Language> languages = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                languages.add(objectMapper.treeToValue(node, Language.class));
            }
        }
        return languages;
    }

    /**
     * Get all formats for a locale
     */
    @Cacheable(value = "formats", key = "#locale")
    public List<StrapiFormatData> getFormats(String locale) throws JsonProcessingException {
        String query = locale != null ? "filter[locale][_eq]=" + locale : "";
        JsonNode dataNode = fetchFromDirectus("api/items/formats", query);

        List<StrapiFormatData> formats = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                formats.add(objectMapper.treeToValue(node, StrapiFormatData.class));
            }
        }
        return formats;
    }

    /**
     * Get format details by MongoDB ID and locale
     */
    @Cacheable(value = "format-detail", key = "#mongoId + '-' + #locale")
    public StrapiFormatData getFormatByMongoId(String mongoId, String locale) throws JsonProcessingException {
        String query = "filter[mongo_id][_eq]=" + mongoId;
        
        if (locale != null) {
            query += "&filter[locale][_eq]=" + locale;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/formats", query);

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(dataNode.get(0), StrapiFormatData.class);
        }
        return null;
    }

    /**
     * Get latest articles for a locale
     */
    @Cacheable(value = "articles-latest", key = "#locale + '-' + #limit")
    public List<StrapiArticleData> getLatestArticles(String locale, int limit) throws JsonProcessingException {
        String query = "filter[locale][_eq]=" + locale 
                     + "&sort=-publishedAt"
                     + "&limit=" + limit;
        
        JsonNode dataNode = fetchFromDirectus("api/items/articles", query);

        List<StrapiArticleData> articles = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                articles.add(objectMapper.treeToValue(node, StrapiArticleData.class));
            }
        }
        return articles;
    }

    /**
     * Get article by documentId and locale
     */
    @Cacheable(value = "article-detail", key = "#documentId + '-' + #locale")
    public StrapiArticleData getArticleByDocumentId(String documentId, String locale) throws JsonProcessingException {
        String query = "filter[locale][_eq]=" + locale;
        JsonNode dataNode = fetchFromDirectus("api/items/articles/" + documentId, query);

        if (dataNode != null && !dataNode.isArray()) {
            return objectMapper.treeToValue(dataNode, StrapiArticleData.class);
        }
        return null;
    }
}
