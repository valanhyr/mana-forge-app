package com.manaforge.api.service;

import java.util.Map;
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
    void readsPublishedTemplatesUsingServerSideTokenAndSnakeCaseFields() {
        stubTemplate();
        var templates = service.list();
        assertThat(templates).hasSize(1);
        assertThat(templates.getFirst().bodyTemplate()).isEqualTo("Hi {{user.name}}");
        assertThat(templates.getFirst().availableMacros()).containsExactly("user.name");
        server.verify(getRequestedFor(urlPathEqualTo("/items/email_templates"))
                .withQueryParam("filter[status][_eq]", equalTo("published"))
                .withHeader("Authorization", equalTo("Bearer private-token")));
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
    void missingPublishedTemplateIs404() {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(okJson("{\"data\":[]}")));
        assertThatThrownBy(() -> service.get("missing")).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(404));
    }

    @Test
    void directusFailureIsNotReportedAsEmptySuccessOrLeaked() {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(aResponse().withStatus(401).withBody("private-token")));
        assertThatThrownBy(() -> service.list()).isInstanceOf(ResponseStatusException.class)
                .hasMessageNotContaining("private-token")
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(502));
    }

    private void stubTemplate() {
        server.stubFor(get(urlPathEqualTo("/items/email_templates")).willReturn(okJson("""
                {"data":[{"id":1,"title":"Reply","category":"support","subject":"Hello {{user.name}}",
                "body_template":"Hi {{user.name}}","available_macros":["user.name"]}]}
                """)));
    }
}
