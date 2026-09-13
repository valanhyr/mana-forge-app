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
 * Uses static token provided via property directus.token. Removed automatic login/rotation.
 */
@Service
public class DirectusService {

    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
    private final ObjectMapper objectMapper;
    private final String baseUrl;

    // static token from env/property
    private volatile String accessToken;

    public DirectusService(RestClient.Builder builder,
                           ObjectMapper objectMapper,
                           @Value("${directus.url:http://directus:8080}") String directusUrl,
                           @Value("${directus.token:}") String directusToken) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Ensure URL doesn't end with / to avoid double slashes
        String cleanBaseUrl = directusUrl.endsWith("/")
            ? directusUrl.substring(0, directusUrl.length() - 1)
            : directusUrl;
        this.baseUrl = cleanBaseUrl;

        // Prefer static token from directus.token property
        if (directusToken != null && !directusToken.isBlank()) {
            this.accessToken = directusToken.trim();
            System.out.println("DirectusService using static token from directus.token");
        } else {
            System.err.println("DirectusService no static token provided (directus.token). Requests will be unauthenticated unless token set at runtime.");
        }

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000);
        requestFactory.setReadTimeout(60000);

        // RestTemplate used for simplicity
        System.out.println("   -> DirectusService initialized with URL: " + this.baseUrl);
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        // No scheduled refresh or login. Static token only.
    }

    
    @jakarta.annotation.PreDestroy
    public void shutdown() {
        // nothing to shutdown
    }

    /**
     * Helper method to make API calls to Directus
     */
    private JsonNode fetchFromDirectus(String endpoint, String query) throws JsonProcessingException {
        return fetchFromDirectus(endpoint, query, null);
    }

    private JsonNode fetchFromDirectus(String endpoint, String query, String acceptLanguage) throws JsonProcessingException {
        String path = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        // Accept both /api/items/... and /items/...; normalize to /items/...
        if (path.startsWith("/api/")) {
            path = path.substring(4); // remove leading /api
        }
        String fullPath = path + (query != null && !query.isEmpty() ? "?" + query : "");

        System.out.println("   -> Calling Directus API: " + this.baseUrl + fullPath);

        try {
            String response;
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setAccept(java.util.List.of(org.springframework.http.MediaType.APPLICATION_JSON));
            if (acceptLanguage != null && !acceptLanguage.isBlank()) {
                headers.set("Accept-Language", acceptLanguage);
            }
            if (accessToken != null && !accessToken.isBlank()) headers.setBearerAuth(accessToken);
            org.springframework.http.HttpEntity<Void> req = new org.springframework.http.HttpEntity<>(headers);

            org.springframework.http.ResponseEntity<String> resp = restTemplate.exchange(baseUrl + fullPath, org.springframework.http.HttpMethod.GET, req, String.class);
            response = resp.getBody();

            if (response != null && response.trim().startsWith("<")) {
                System.err.println("   -> Error: Received HTML instead of JSON from Directus");
                throw new RuntimeException("Invalid response from Directus (HTML received)");
            }

            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode dataNode = rootNode.path("data");

            if (dataNode.isMissingNode() || dataNode.isNull()) {
                System.err.println("   -> No data found for: " + endpoint);
                return null;
            }
            return dataNode;
        } catch (org.springframework.web.client.HttpClientErrorException.Unauthorized ue) {
            System.err.println("   -> Unauthorized from Directus. Token may be invalid.");
            throw ue;
        } catch (Exception e) {
            System.err.println("   -> Error calling Directus: " + e.getMessage());
            throw new RuntimeException("Error fetching " + endpoint + " from Directus", e);
        }
    }

    // Following methods unchanged, use fetchFromDirectus

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
        return getFormats(locale, null);
    }

    public List<StrapiFormatData> getFormats(String locale, String acceptLanguage) throws JsonProcessingException {
        String languageCode = normalizeLanguageCode(locale);
        String query = "fields=id,slug,mongo_id,imageUrl,translations.languages_code,translations.title,"
                + "translations.subtitle,translations.description,translations.rules";
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }
        JsonNode dataNode = fetchFromDirectus("api/items/formats", query, acceptLanguage);

        List<StrapiFormatData> formats = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                StrapiFormatData fmt = objectMapper.treeToValue(node, StrapiFormatData.class);

                JsonNode translation = pickTranslation(node.path("translations"), languageCode);
                if (translation != null) {
                    fmt.setTitle(translation.path("title").asText(null));
                    fmt.setSubtitle(translation.path("subtitle").asText(null));
                    String lang = translation.path("languages_code").asText(null);
                    fmt.setLocale(lang != null ? lang : languageCode);
                    fmt.setSection(buildSections(translation));
                }

                // Skip placeholder/draft rows without slug
                if (fmt.getSlug() == null || fmt.getSlug().isBlank()) {
                    continue;
                }

                formats.add(fmt);
            }
        }
        return formats;
    }

    /**
     * Directus stores language codes as plain ISO codes ("en", "es"), while callers may send
     * full locales such as "en_US" or "en-US".
     */
    private String normalizeLanguageCode(String locale) {
        if (locale == null || locale.isBlank()) {
            return null;
        }
        String normalized = locale.trim().replace('-', '_');
        int separator = normalized.indexOf('_');
        return (separator > 0 ? normalized.substring(0, separator) : normalized).toLowerCase();
    }

    /**
     * Selects the translation matching the requested locale, falling back to the first available one.
     */
    private JsonNode pickTranslation(JsonNode translations, String locale) {
        if (translations == null || !translations.isArray() || translations.isEmpty()) {
            return null;
        }
        if (locale != null && !locale.isBlank()) {
            for (JsonNode tr : translations) {
                if (locale.equals(tr.path("languages_code").asText(null))) {
                    return tr;
                }
            }
        }
        return translations.get(0);
    }

    /**
     * Converts the Directus translation blocks (description, rules) into the Strapi component shape
     * expected by the frontend.
     */
    private List<StrapiComponent> buildSections(JsonNode translation) {
        List<StrapiComponent> sections = new ArrayList<>();
        for (String blockName : List.of("description", "rules")) {
            JsonNode block = translation.path(blockName);
            if (block.isMissingNode() || block.isNull()) {
                continue;
            }
            try {
                sections.add(objectMapper.treeToValue(block, StrapiComponent.class));
            } catch (JsonProcessingException ignored) {
                // skip malformed block
            }
        }
        return sections;
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
        String languageCode = normalizeLanguageCode(locale);
        String query = "fields=id,publishedAt,author,imageUrl,translations.languages_code,translations.title,translations.content";
        query += "&sort=-publishedAt&limit=" + limit;
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/articles", query);

        List<StrapiArticleData> articles = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                StrapiArticleData art = objectMapper.treeToValue(node, StrapiArticleData.class);

                JsonNode tr = pickTranslation(node.path("translations"), languageCode);
                if (tr != null) {
                    art.setTitle(tr.path("title").asText(null));
                    art.setContent(tr.path("content").asText(null));
                    art.setLocale(tr.path("languages_code").asText(languageCode));
                }

                articles.add(art);
            }
        }
        return articles;
    }

    /**
     * Get article by documentId and locale
     */
    @Cacheable(value = "article-detail", key = "#documentId + '-' + #locale")
    public StrapiArticleData getArticleByDocumentId(String documentId, String locale) throws JsonProcessingException {
        String languageCode = normalizeLanguageCode(locale);
        String query = "fields=id,publishedAt,author,imageUrl,translations.languages_code,translations.title,translations.content";
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/articles/" + documentId, query);

        if (dataNode != null && !dataNode.isArray()) {
            StrapiArticleData art = objectMapper.treeToValue(dataNode, StrapiArticleData.class);
            JsonNode tr = pickTranslation(dataNode.path("translations"), languageCode);
            if (tr != null) {
                art.setTitle(tr.path("title").asText(null));
                art.setContent(tr.path("content").asText(null));
                art.setLocale(tr.path("languages_code").asText(languageCode));
            }
            return art;
        }
        return null;
    }
}
