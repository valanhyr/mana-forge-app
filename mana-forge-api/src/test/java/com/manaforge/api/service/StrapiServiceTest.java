package com.manaforge.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.manaforge.api.model.directus.DirectusArticleData;
import com.manaforge.api.model.directus.DirectusFormatData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class DirectusServiceTest {

    private WireMockServer wireMock;
    private DirectusService directusService;

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        wireMock.start();
        directusService = new DirectusService(
                RestClient.builder(),
                new ObjectMapper(),
                wireMock.baseUrl(),
                "test-token"
        );
    }

    @AfterEach
    void tearDown() {
        wireMock.stop();
    }

    // ── getLatestArticles ───────────────────────────────────────────────────

    @Test
    void getLatestArticles_parsesDataArrayCorrectly() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/articles"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "data": [
                                    {
                                      "documentId": "doc-1",
                                      "title": "First Article",
                                      "publishedAt": "2024-01-01T00:00:00.000Z"
                                    }
                                  ]
                                }
                                """)));

        List<DirectusArticleData> result = directusService.getLatestArticles("es", 5, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("First Article");
        assertThat(result.get(0).getDocumentId()).isEqualTo("doc-1");
    }

    @Test
    void getLatestArticles_returnsEmptyListWhenStrapiErrors() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/articles"))
                .willReturn(aResponse().withStatus(500)));

        assertThatThrownBy(() -> directusService.getLatestArticles("es", 5, null))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getLatestArticles_returnsEmptyListWhenDataIsNull() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/articles"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": null, \"meta\": {}}")));

        List<DirectusArticleData> result = directusService.getLatestArticles("es", 5, null);

        assertThat(result).isEmpty();
    }

    // ── getArticleByDocumentId ──────────────────────────────────────────────

    @Test
    void getArticleByDocumentId_returnsArticleOnSuccess() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/articles/doc-abc"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "data": {
                                    "documentId": "doc-abc",
                                    "title": "Detail Article",
                                    "subtitle": "Sub"
                                  }
                                }
                                """)));

        DirectusArticleData result = directusService.getArticleByDocumentId("doc-abc", "en", null);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Detail Article");
    }

    @Test
    void getArticleByDocumentId_returnsNullWhenDataMissing() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/articles/no-such-doc"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": null}")));

        DirectusArticleData result = directusService.getArticleByDocumentId("no-such-doc", "es", null);

        assertThat(result).isNull();
    }

    // ── getFormats ──────────────────────────────────────────────────────────

    @Test
    void getFormats_mapsFormatListCorrectly() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "data": [
                                    {
                                      "id": 1,
                                      "mongo_id": "premodern",
                                      "title": "Premodern",
                                      "slug": "premodern",
                                      "locale": "es"
                                    }
                                  ]
                                }
                                """)));

        List<DirectusFormatData> result = directusService.getFormats("es", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMongoId()).isEqualTo("premodern");
        assertThat(result.get(0).getTitle()).isEqualTo("Premodern");
    }

    @Test
    void getFormats_returnsEmptyListWhenDataArrayIsEmpty() throws Exception {
            wireMock.stubFor(get(urlPathEqualTo("/items/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": []}")));

        List<DirectusFormatData> result = directusService.getFormats("es", null);

        assertThat(result).isEmpty();
    }

    // ── getFormatByMongoId ──────────────────────────────────────────────────

    @Test
    void getFormatByMongoId_returnsFormatWhenFound() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/items/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "data": [
                                    {
                                      "id": 2,
                                      "mongo_id": "premodern",
                                      "title": "Premodern",
                                      "slug": "premodern"
                                    }
                                  ]
                                }
                                """)));

        DirectusFormatData result = directusService.getFormatByMongoId("premodern", "es");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Premodern");
    }

    @Test
    void getFormatByMongoId_returnsNullWhenNotFound() throws Exception {
    wireMock.stubFor(get(urlPathEqualTo("/items/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": []}")));

        DirectusFormatData result = directusService.getFormatByMongoId("unknown-id", "es");

        assertThat(result).isNull();
    }
}
