package com.manaforge.api.service;

import java.util.Map;
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class DirectusEmailTemplateServiceTest {
    private WireMockServer server;
    private DirectusEmailTemplateService service;

    @BeforeEach
    void setUp() {
        server = new WireMockServer(options().dynamicPort());
        server.start();
        service = new DirectusEmailTemplateService(RestClient.builder(), server.baseUrl(), "private-token", "email_templates");
    }

    @AfterEach
    void tearDown() { server.stop(); }

    @Test
    void readsPublishedTranslationsUsingServerSideTokenAndSnakeCaseFields() {
        stubTemplate();
        var templates = service.list();
        assertThat(templates).hasSize(1);
        assertThat(templates.getFirst().bodyTemplate()).isEqualTo("Hi {{user.name}}");
        assertThat(templates.getFirst().subject()).isEqualTo("Hello {{user.name}}");
        assertThat(templates.getFirst().availableMacros()).containsExactly("user.name");
        server.verify(getRequestedFor(urlPathEqualTo("/items/email_templates"))
                .withQueryParam("filter[status][_eq]", equalTo("published"))
                .withQueryParam("fields", equalTo("id,title,category,available_macros,translations.languages_code,"
                        + "translations.subject,translations.body_template"))
                .withHeader("Authorization", equalTo("Bearer private-token")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"es", "es-ES", "es_AR", "es-ES,es;q=0.9,en;q=0.8", "en;q=0.5,es;q=0.9"})
    void selectsRequestedLanguageIncludingRegionalAndWeightedHeaders(String language) {
        stubTemplate();
        var template = service.list(language).getFirst();
        assertThat(template.subject()).isEqualTo("Hola {{user.name}}");
        assertThat(template.bodyTemplate()).isEqualTo("Buenas {{user.name}}");
    }

    @ParameterizedTest
    @ValueSource(strings = {"fr-FR", "*", "", "not a valid language"})
    void fallsBackToEnglishBeforeTheFirstTranslation(String language) {
        stubTemplate();
        assertThat(service.get("1", language).bodyTemplate()).isEqualTo("Hi {{user.name}}");
    }

    @Test
    void fallsBackToTheFirstCompleteTranslationWhenEnglishIsMissing() {
        stubTranslations("""
                [{"languages_code":"fr","subject":"Incomplete","body_template":null},
                 {"languages_code":"es","subject":"Hola","body_template":"Buenas"}]
                """);
        var template = service.get("1");
        assertThat(template.subject()).isEqualTo("Hola");
        assertThat(template.bodyTemplate()).isEqualTo("Buenas");
    }

    @Test
    void incompleteRequestedTranslationFallsBackWithoutMixingLanguages() {
        stubTranslations("""
                [{"languages_code":"es","subject":"Hola","body_template":"  "},
                 {"languages_code":"en","subject":"Hello","body_template":"Hi"}]
                """);
        var template = service.get("1", "es");
        assertThat(template.subject()).isEqualTo("Hello");
        assertThat(template.bodyTemplate()).isEqualTo("Hi");
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", "{}", "[{\"languages_code\":\"en\",\"subject\":null,\"body_template\":\"Hi\"}]"})
    void missingCompleteTranslationsAreNotReportedAsEmptySuccess(String translations) {
        stubTranslations(translations);
        assertThatThrownBy(() -> service.list()).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(502));
    }

    @Test
    void renderingEscapesRegexReplacementCharacters() {
        stubTemplate();
        var rendered = service.render("1", Map.of("user.name", "Dollar $1 \\ path"));
        assertThat(rendered.body()).isEqualTo("Hi Dollar $1 \\ path");
        server.verify(getRequestedFor(urlPathEqualTo("/items/email_templates"))
                .withQueryParam("filter[id][_eq]", equalTo("1")));
    }

    @Test
    void rendersSubjectAndBodyInTheRequestedLanguageAndKeepsUnknownMacros() {
        stubTemplate();
        var rendered = service.render("1", Map.of("user.name", "Cliente"), "es");
        assertThat(rendered.subject()).isEqualTo("Hola Cliente");
        assertThat(rendered.body()).isEqualTo("Buenas Cliente");
        assertThat(service.render("1", Map.of(), "es").body()).isEqualTo("Buenas {{user.name}}");
    }

    @Test
    void unpublishingTakesEffectWithoutCaching() {
        stubTemplate();
        assertThat(service.list("es")).hasSize(1);
        server.resetAll();
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(okJson("{\"data\":[]}")));
        assertThatThrownBy(() -> service.render("1", Map.of(), "es"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(404));
    }

    @Test
    void missingPublishedTemplateIs404() {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(okJson("{\"data\":[]}")));
        assertThatThrownBy(() -> service.get("missing")).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(404));
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 403, 500})
    void directusFailureIsNotReportedAsEmptySuccessOrLeaked(int status) {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(aResponse().withStatus(status).withBody("private-token")));
        assertThatThrownBy(() -> service.list()).isInstanceOf(ResponseStatusException.class)
                .hasMessageNotContaining("private-token")
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(502));
    }

    private void stubTemplate() {
        stubTranslations("""
                [{"languages_code":"es","subject":"Hola {{user.name}}","body_template":"Buenas {{user.name}}"},
                 {"languages_code":"en","subject":"Hello {{user.name}}","body_template":"Hi {{user.name}}"}]
                """);
    }

    private void stubTranslations(String translations) {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(okJson("""
                {"data":[{"id":1,"title":"Reply","category":"support",
                "translations":%s,"available_macros":["user.name"]}]}
                """.formatted(translations))));
    }
}
