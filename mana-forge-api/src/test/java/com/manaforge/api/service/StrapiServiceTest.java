package com.manaforge.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.manaforge.api.model.strapi.StrapiArticleData;
import com.manaforge.api.model.strapi.StrapiFormatData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class StrapiServiceTest {

    private WireMockServer wireMock;
    private StrapiService strapiService;

    @BeforeEach
    void setUp() {
        wireMock = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        wireMock.start();
        strapiService = new StrapiService(
                RestClient.builder(),
                new ObjectMapper(),
                wireMock.baseUrl() + "/api",
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
        wireMock.stubFor(get(urlPathEqualTo("/api/articles"))
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

        List<StrapiArticleData> result = strapiService.getLatestArticles("es", 5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("First Article");
        assertThat(result.get(0).getDocumentId()).isEqualTo("doc-1");
    }

    @Test
    void getLatestArticles_returnsEmptyListWhenStrapiErrors() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/articles"))
                .willReturn(aResponse().withStatus(500)));

        assertThatThrownBy(() -> strapiService.getLatestArticles("es", 5))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void getLatestArticles_returnsEmptyListWhenDataIsNull() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/articles"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": null, \"meta\": {}}")));

        List<StrapiArticleData> result = strapiService.getLatestArticles("es", 5);

        assertThat(result).isEmpty();
    }

    // ── getArticleByDocumentId ──────────────────────────────────────────────

    @Test
    void getArticleByDocumentId_returnsArticleOnSuccess() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/articles/doc-abc"))
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

        StrapiArticleData result = strapiService.getArticleByDocumentId("doc-abc", "en");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Detail Article");
    }

    @Test
    void getArticleByDocumentId_returnsNullWhenDataMissing() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/articles/no-such-doc"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": null}")));

        StrapiArticleData result = strapiService.getArticleByDocumentId("no-such-doc", "es");

        assertThat(result).isNull();
    }

    // ── getFormats ──────────────────────────────────────────────────────────

    @Test
    void getFormats_mapsFormatListCorrectly() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/formats"))
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

        List<StrapiFormatData> result = strapiService.getFormats("es");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMongoId()).isEqualTo("premodern");
        assertThat(result.get(0).getTitle()).isEqualTo("Premodern");
    }

    @Test
    void getFormats_returnsEmptyListWhenDataArrayIsEmpty() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": []}")));

        List<StrapiFormatData> result = strapiService.getFormats("es");

        assertThat(result).isEmpty();
    }

    // ── getFormatByMongoId ──────────────────────────────────────────────────

    @Test
    void getFormatByMongoId_returnsFormatWhenFound() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/formats"))
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

        StrapiFormatData result = strapiService.getFormatByMongoId("premodern", "es");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Premodern");
    }

    @Test
    void getFormatByMongoId_returnsNullWhenNotFound() throws Exception {
        wireMock.stubFor(get(urlPathEqualTo("/api/formats"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"data\": []}")));

        StrapiFormatData result = strapiService.getFormatByMongoId("unknown-id", "es");

        assertThat(result).isNull();
    }
}
