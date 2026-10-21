package com.manaforge.api.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.dto.FrontdeskDtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** Operational templates are read fresh: unpublishing a template must take effect immediately. */
@Service
public class DirectusEmailTemplateService {
    private static final Pattern MACRO = Pattern.compile("\\{\\{([a-zA-Z0-9_.-]+)}}");
    private final RestClient client;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String collection;

    public DirectusEmailTemplateService(RestClient.Builder builder,
            @Value("${directus.url}") String url, @Value("${directus.token:}") String token,
            @Value("${frontdesk.email-template-collection:email_templates}") String collection) {
        if (!collection.matches("[a-zA-Z0-9_]+")) throw new IllegalArgumentException("Invalid template collection");
        this.collection = collection;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        RestClient.Builder configured = builder.clone().baseUrl(url).requestFactory(factory);
        if (token != null && !token.isBlank()) configured.defaultHeaders(headers -> headers.setBearerAuth(token));
        client = configured.build();
    }

    public List<EmailTemplate> list() { return list(null); }

    public List<EmailTemplate> list(String acceptLanguage) { return fetch(null, acceptLanguage); }

    public EmailTemplate get(String id) {
        return get(id, null);
    }

    public EmailTemplate get(String id, String acceptLanguage) {
        return fetch(id, acceptLanguage).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Published template not found"));
    }

    private List<EmailTemplate> fetch(String id, String acceptLanguage) {
        try {
            String json = client.get().uri(builder -> {
                builder.path("/items/" + collection)
                        .queryParam("filter[status][_eq]", "published")
                        .queryParam("fields", "id,title,category,available_macros,translations.languages_code,"
                                + "translations.subject,translations.body_template")
                        .queryParam("sort", "title").queryParam("limit", id == null ? 100 : 1);
                if (id != null) builder.queryParam("filter[id][_eq]", id);
                return builder.build();
            }).retrieve().body(String.class);
            JsonNode data = mapper.readTree(json).path("data");
            if (!data.isArray()) throw new IllegalStateException("Invalid Directus response");
            List<EmailTemplate> templates = new ArrayList<>();
            for (JsonNode node : data) {
                JsonNode translation = pickTranslation(node.path("translations"), languageCode(acceptLanguage));
                List<String> macros = new ArrayList<>();
                if (node.path("available_macros").isArray()) {
                    node.path("available_macros").forEach(macro -> macros.add(macro.asText()));
                }
                templates.add(new EmailTemplate(required(node, "id"), required(node, "title"),
                        node.path("category").asText(""), required(translation, "subject"),
                        required(translation, "body_template"), macros));
            }
            return templates;
        } catch (Exception exception) {
            // Do not expose upstream credentials, URLs or response bodies in client-facing errors.
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to load email templates");
        }
    }

    private String languageCode(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isBlank()) return "en";
        try {
            String range = Locale.LanguageRange.parse(acceptLanguage.replace('_', '-')).getFirst().getRange();
            return range.split("-")[0];
        } catch (IllegalArgumentException exception) {
            return "en";
        }
    }

    private JsonNode pickTranslation(JsonNode translations, String language) {
        JsonNode first = null;
        JsonNode english = null;
        if (translations.isArray()) {
            for (JsonNode translation : translations) {
                // Keep subject and body in the same language; incomplete drafts cannot be sent.
                if (translation.path("subject").asText("").isBlank()
                        || translation.path("body_template").asText("").isBlank()) continue;
                if (first == null) first = translation;
                String code = languageCode(translation.path("languages_code").asText(""));
                if (language.equals(code)) return translation;
                if ("en".equals(code)) english = translation;
            }
        }
        if (english != null) return english;
        if (first != null) return first;
        throw new IllegalStateException("Template has no complete translation");
    }

    private String required(JsonNode node, String field) {
        if (node.path(field).isMissingNode() || node.path(field).isNull()) {
            throw new IllegalStateException("Invalid template field");
        }
        return node.path(field).asText();
    }

    public RenderedTemplate render(String id, Map<String, String> variables) {
        return render(id, variables, null);
    }

    public RenderedTemplate render(String id, Map<String, String> variables, String acceptLanguage) {
        EmailTemplate template = get(id, acceptLanguage);
        return new RenderedTemplate(interpolate(template.subject(), variables),
                interpolate(template.bodyTemplate(), variables));
    }

    static String interpolate(String text, Map<String, String> variables) {
        Matcher matcher = MACRO.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String replacement = variables.get(matcher.group(1));
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement == null ? matcher.group() : replacement));
        }
        return matcher.appendTail(result).toString();
    }
}
