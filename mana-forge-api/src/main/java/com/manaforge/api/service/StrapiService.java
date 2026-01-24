package com.manaforge.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.manaforge.api.model.strapi.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Service
public class StrapiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    public StrapiService(RestClient.Builder builder,
                         ObjectMapper objectMapper,
                         @Value("${strapi.api.url}") String strapiApiUrl,
                         @Value("${strapi.api.token}") String strapiApiToken) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Aseguramos que la URL no termine en / para evitar dobles barras (//) al concatenar rutas
        String cleanBaseUrl = strapiApiUrl.endsWith("/") ? strapiApiUrl.substring(0, strapiApiUrl.length() - 1) : strapiApiUrl;
        this.baseUrl = cleanBaseUrl;

        if (!cleanBaseUrl.endsWith("/api")) {
            System.err.println("   -> ⚠️ WARNING: 'strapi.api.url' does not end with '/api'. Current value: " + cleanBaseUrl);
            System.err.println("   -> 💡 Hint: Strapi v4 endpoints usually start with /api (e.g. https://tu-app.strapiapp.com/api)");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000); // 10 segundos para conectar
        requestFactory.setReadTimeout(60000);    // 60 segundos para leer datos (Strapi Cloud puede ser lento al despertar)

        // Inicialización moderna del RestClient (Stack 2025)
        this.restClient = builder
                .requestFactory(requestFactory)
                .baseUrl(cleanBaseUrl)
                .defaultHeader("Authorization", "Bearer " + strapiApiToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    /**
     * Método privado para centralizar las llamadas a Strapi y extraer el nodo "data"
     */
    private JsonNode fetchFromStrapi(String collection, String query) throws JsonProcessingException {
        String path = "/" + collection + (query != null && !query.isEmpty() ? "?" + query : "");
        
        System.out.println("   -> 🚀 Calling Strapi API: " + this.baseUrl + path);
        
        try {
            String response = restClient.get()
                    .uri(path)
                    .retrieve()
                    .body(String.class);

            if (response != null && response.trim().startsWith("<")) {
                System.err.println("   -> ❌ Error: Received HTML instead of JSON from Strapi. Likely 404 or 500 error page.");
                System.err.println("   -> 💡 Hint: Check if 'strapi.api.url' in application.properties includes '/api' (e.g. http://localhost:1337/api)");
                throw new RuntimeException("Invalid response from Strapi (HTML received). Check URL configuration.");
            }

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

    /**
     * Helper method to unwrap "attributes" from Strapi v4 response items.
     * Strapi v4 nests content fields inside an "attributes" object.
     */
    private JsonNode extractAttributes(JsonNode node) {
        if (node != null && node.has("attributes")) {
            JsonNode attributes = node.get("attributes");
            if (attributes instanceof ObjectNode) {
                ObjectNode objNode = (ObjectNode) attributes;
                if (node.has("id")) {
                    objNode.set("id", node.get("id"));
                }
                if (node.has("documentId")) {
                    objNode.set("documentId", node.get("documentId"));
                }
            }
            return attributes;
        }
        return node;
    }

    @Cacheable(value = "footer", key = "#locale")
    public Footer getFooter(String locale) throws JsonProcessingException {
        String query = "locale=" + locale + "&populate[footer_sections][populate][0]=footer_links";
        JsonNode data = fetchFromStrapi("footer", query);
        
        return (data != null) ? objectMapper.treeToValue(extractAttributes(data), Footer.class) : null;
    }

    @Cacheable(value = "footer-legal", key = "#locale")
    public FooterLegal getFooterLegal(String locale) throws JsonProcessingException {
        String query = "locale=" + locale + "&populate=legal_links";
        JsonNode data = fetchFromStrapi("footer-legal", query);
        
        return (data != null) ? objectMapper.treeToValue(extractAttributes(data), FooterLegal.class) : null;
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
                heros.add(objectMapper.treeToValue(extractAttributes(node), Hero.class));
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
                sections.add(objectMapper.treeToValue(extractAttributes(node), Section.class));
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
                languages.add(objectMapper.treeToValue(extractAttributes(node), Language.class));
            }
        }
        return languages;
    }

    @Cacheable(value = "formats", key = "#locale")
    public List<StrapiFormatData> getFormats(String locale) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("populate=*");
        if (locale != null) {
            query.append("&locale=").append(locale);
        }
        JsonNode dataNode = fetchFromStrapi("formats", query.toString());

        List<StrapiFormatData> formats = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                formats.add(objectMapper.treeToValue(extractAttributes(node), StrapiFormatData.class));
            }
        }
        return formats;
    }

    @Cacheable(value = "format-detail", key = "#mongoId + '-' + #locale")
    public StrapiFormatData getFormatByMongoId(String mongoId, String locale) throws JsonProcessingException {
        StringBuilder query = new StringBuilder("filters[mongo_id][$eq]=").append(mongoId)
                .append("&populate[section][populate]=rules");
        if (locale != null) {
            query.append("&locale=").append(locale);
        }
        JsonNode dataNode = fetchFromStrapi("formats", query.toString());

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(extractAttributes(dataNode.get(0)), StrapiFormatData.class);
        }
        return null;
    }

    @Cacheable(value = "articles-latest", key = "#locale + '-' + #limit")
    public List<StrapiArticleData> getLatestArticles(String locale, int limit) throws JsonProcessingException {
        String query = "locale=" + locale + "&populate=*&sort[0]=createdAt:desc&pagination[limit]=" + limit;
        JsonNode dataNode = fetchFromStrapi("articles", query);

        List<StrapiArticleData> articles = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                articles.add(objectMapper.treeToValue(extractAttributes(node), StrapiArticleData.class));
            }
        }
        return articles;
    }

    @Cacheable(value = "article-detail", key = "#documentId + '-' + #locale")
    public StrapiArticleData getArticleByDocumentId(String documentId, String locale) throws JsonProcessingException {
        String query = "populate=*&locale=" + locale;
        JsonNode dataNode = fetchFromStrapi("articles/" + documentId, query);

        if (dataNode != null && !dataNode.isArray()) {
            return objectMapper.treeToValue(extractAttributes(dataNode), StrapiArticleData.class);
        }
        return null;
    }
}