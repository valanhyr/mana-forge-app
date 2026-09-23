package com.manaforge.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.manaforge.api.model.directus.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

/**
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

    // No-arg constructor for frameworks/tests that instantiate via component-scan without supplying RestClient.Builder
    @SuppressWarnings("unused")
    public DirectusService() {
        this.objectMapper = new ObjectMapper().copy().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.baseUrl = "http://localhost:9055";
        this.accessToken = "";
        System.out.println("DirectusService: instantiated no-arg placeholder");
    }

    public DirectusService(RestClient.Builder builder,
                           ObjectMapper objectMapper,
                           @Value("${directus.url:http://directus:8080}") String directusUrl,
                           @Value("${directus.token:}") String directusToken) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Ensure URL doesn't end with / to avoid double slashes
        // Allow explicit env override if property binding did not apply inside container
        String envDirectus = System.getenv("DIRECTUS_URL");
        String resolved = (envDirectus != null && !envDirectus.isBlank()) ? envDirectus : directusUrl;

        String cleanBaseUrl = resolved.endsWith("/")
            ? resolved.substring(0, resolved.length() - 1)
            : resolved;
        this.baseUrl = cleanBaseUrl;

        // Prefer static token from directus.token property or env DIRECTUS_TOKEN
        String envToken = System.getenv("DIRECTUS_TOKEN");
        String resolvedToken = (envToken != null && !envToken.isBlank()) ? envToken : directusToken;
        if (resolvedToken != null && !resolvedToken.isBlank()) {
            this.accessToken = resolvedToken.trim();
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
                // Normalize to always include /api prefix for compatibility with stubs that expect /api/items
                if (!path.startsWith("/api/") && path.startsWith("/items/")) {
                    path = "/api" + path; // /items/... -> /api/items/...
                } else if (!path.startsWith("/api/") && !path.startsWith("/items/") && !path.startsWith("/api")) {
                    // if caller passed 'articles' or 'items/articles', assume items namespace
                    path = "/api/items" + (path.startsWith("/") ? path : "/" + path);
                }
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
            // Debug: print fetched data for inspection
            try {
                System.out.println("Directus fetched data for endpoint " + endpoint + ": " + dataNode.toString());
            } catch (Exception ignored) {}
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
    public List<DirectusFormatData> getFormats(String locale) throws JsonProcessingException {
        return getFormats(locale, null);
    }

    public List<DirectusFormatData> getFormats(String locale, String acceptLanguage) throws JsonProcessingException {
        String languageCode = normalizeLanguageCode(locale);
        String query = "fields=id,slug,mongo_id,imageUrl,translations.languages_code,translations.title,"
                + "translations.subtitle,translations.description,translations.rules";
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }
        JsonNode dataNode = fetchFromDirectus("api/items/formats", query, acceptLanguage);

        List<DirectusFormatData> formats = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            for (JsonNode node : dataNode) {
                DirectusFormatData fmt = objectMapper.treeToValue(node, DirectusFormatData.class);

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
    private List<DirectusComponent> buildSections(JsonNode translation) {
        List<DirectusComponent> sections = new ArrayList<>();
        for (String blockName : List.of("description", "rules")) {
            JsonNode block = translation.path(blockName);
            if (block.isMissingNode() || block.isNull()) {
                continue;
            }
            try {
                sections.add(objectMapper.treeToValue(block, DirectusComponent.class));
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
    public DirectusFormatData getFormatByMongoId(String mongoId, String locale) throws JsonProcessingException {
        String query = "filter[mongo_id][_eq]=" + mongoId;
        
        if (locale != null) {
            query += "&filter[locale][_eq]=" + locale;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/formats", query);

        if (dataNode != null && dataNode.isArray() && dataNode.size() > 0) {
            return objectMapper.treeToValue(dataNode.get(0), DirectusFormatData.class);
        }
        return null;
    }

    /**
     * Get latest articles for a locale
     */
    @Cacheable(value = "articles-latest", key = "#locale + '-' + #limit")
    public List<DirectusArticleData> getLatestArticles(String locale, int limit, String acceptLanguage) throws JsonProcessingException {
        // prefer explicit Accept-Language when provided by caller; fallback to locale param
        String languageCode = normalizeLanguageCode(acceptLanguage != null && !acceptLanguage.isBlank() ? acceptLanguage : locale);
        String query = "fields=id,publishedAt,author,imageUrl,translations.languages_code,translations.title,translations.subtitle,translations.seo,translations.content";
        query += "&sort=-publishedAt&limit=" + limit;
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/articles", query, acceptLanguage);

        List<DirectusArticleData> articles = new ArrayList<>();
        if (dataNode != null && dataNode.isArray()) {
            int idx = 0;
            for (JsonNode node : dataNode) {
                // Temporary debug: log the raw node for the first item to inspect mapping issues
                if (idx == 0) {
                    System.out.println("Directus raw article node: " + node.toString());
                }
                idx++;

                DirectusArticleData art = objectMapper.treeToValue(node, DirectusArticleData.class);

                // Ensure documentId is populated from Directus 'id' when missing
                if ((art.getDocumentId() == null || art.getDocumentId().isBlank()) && art.getId() != null) {
                    art.setDocumentId(String.valueOf(art.getId()));
                }

                JsonNode tr = pickTranslation(node.path("translations"), languageCode);
                                if (tr != null) {
                                    System.out.println("Directus raw article node: " + tr.toString());
                    // If translation has its own id/documentId fields, prefer them; otherwise reuse top-level
                    if (!tr.path("documentId").isMissingNode() && !tr.path("documentId").isNull()) {
                        art.setDocumentId(tr.path("documentId").asText(null));
                    }
                    if (!tr.path("id").isMissingNode() && !tr.path("id").isNull()) {
                        try {
                            art.setId(Integer.valueOf(tr.path("id").asText()));
                        } catch (NumberFormatException ignored) {}
                    }
                    art.setTitle(tr.path("title").asText(art.getTitle()));
                    art.setSubtitle(tr.path("subtitle").asText(art.getSubtitle()));
                    // content may be textual or an object; preserve as string
                    JsonNode contentNode = tr.path("content");
                    if (!contentNode.isMissingNode() && !contentNode.isNull()) {
                        if (contentNode.isTextual()) {
                            art.setContent(contentNode.asText());
                        } else {
                            art.setContent(contentNode.toString());
                        }
                    } else {
                        // Fallbacks: try top-level content or legacy 'article' field
                        JsonNode topContent = node.path("content");
                        if (!topContent.isMissingNode() && !topContent.isNull()) {
                            art.setContent(topContent.isTextual() ? topContent.asText() : topContent.toString());
                        } else {
                            JsonNode legacy = node.path("article");
                            if (!legacy.isMissingNode() && !legacy.isNull()) {
                                art.setContent(legacy.isTextual() ? legacy.asText() : legacy.toString());
                            }
                        }
                    }
                    art.setLocale(tr.path("languages_code").asText(languageCode));
                    // seo may be an object or string; try to map safely
                    JsonNode seoNode = tr.path("seo");
                    if (!seoNode.isMissingNode() && !seoNode.isNull()) {
                        try {
                            if (seoNode.isObject()) {
                                art.setSeo(objectMapper.treeToValue(seoNode, com.manaforge.api.model.directus.DirectusSeo.class));
                            } else if (seoNode.isTextual() && !seoNode.asText().isBlank()) {
                                // attempt to parse textual JSON
                                art.setSeo(objectMapper.readValue(seoNode.asText(), com.manaforge.api.model.directus.DirectusSeo.class));
                            }
                        } catch (Exception ignored) {}
                    }
                }

                // Debug: show final mapped article
                try { System.out.println("Mapped DirectusArticleData: " + art.toString()); } catch (Exception ignored) {}
                articles.add(art);
            }
        }
        return articles;
    }

    /**
     * Get article by documentId and locale
     */
    @Cacheable(value = "article-detail", key = "#documentId + '-' + #locale")
    public DirectusArticleData getArticleByDocumentId(String documentId, String locale, String acceptLanguage) throws JsonProcessingException {
        String languageCode = normalizeLanguageCode(acceptLanguage != null && !acceptLanguage.isBlank() ? acceptLanguage : locale);
        String query = "fields=id,publishedAt,author,imageUrl,translations.languages_code,translations.title,translations.content";
        if (languageCode != null) {
            query += "&deep[translations][_filter][languages_code][_eq]=" + languageCode;
        }

        JsonNode dataNode = fetchFromDirectus("api/items/articles/" + documentId, query, acceptLanguage);

        if (dataNode != null && !dataNode.isArray()) {
            DirectusArticleData art = objectMapper.treeToValue(dataNode, DirectusArticleData.class);

            // Ensure documentId is populated from Directus 'id' when missing
            if ((art.getDocumentId() == null || art.getDocumentId().isBlank()) && art.getId() != null) {
                art.setDocumentId(String.valueOf(art.getId()));
            }

            JsonNode tr = pickTranslation(dataNode.path("translations"), languageCode);
                        if (tr != null) {
                            System.out.println("Directus raw article node: " + tr.toString());
                art.setTitle(tr.path("title").asText(art.getTitle()));
                art.setSubtitle(tr.path("subtitle").asText(art.getSubtitle()));
                // content may be textual or an object; preserve as string
                JsonNode contentNode = tr.path("content");
                if (!contentNode.isMissingNode() && !contentNode.isNull()) {
                    if (contentNode.isTextual()) {
                        art.setContent(contentNode.asText());
                    } else {
                        art.setContent(contentNode.toString());
                    }
                } else {
                    // Fallbacks: try top-level content or legacy 'article' field
                    JsonNode topContent = dataNode.isArray() && dataNode.size() > 0 ? dataNode.get(0).path("content") : dataNode.path("content");
                    if (!topContent.isMissingNode() && !topContent.isNull()) {
                        art.setContent(topContent.isTextual() ? topContent.asText() : topContent.toString());
                    } else {
                                            JsonNode legacy = dataNode.path("article");
                        if (!legacy.isMissingNode() && !legacy.isNull()) {
                            art.setContent(legacy.isTextual() ? legacy.asText() : legacy.toString());
                        }
                    }
                }
                art.setLocale(tr.path("languages_code").asText(languageCode));

                JsonNode seoNode = tr.path("seo");
                if (!seoNode.isMissingNode() && !seoNode.isNull()) {
                    try {
                        if (seoNode.isObject()) {
                            art.setSeo(objectMapper.treeToValue(seoNode, DirectusSeo.class));
                        } else if (seoNode.isTextual() && !seoNode.asText().isBlank()) {
                            art.setSeo(objectMapper.readValue(seoNode.asText(), DirectusSeo.class));
                        }
                    } catch (Exception ignored) {}
                }
            }
            return art;
        }

        return null;
    }
}
