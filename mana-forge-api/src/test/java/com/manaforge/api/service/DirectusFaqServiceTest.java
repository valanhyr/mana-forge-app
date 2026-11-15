package com.manaforge.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.*;

class DirectusFaqServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private WireMockServer directus;
    private DirectusService service;

    @BeforeEach
    void setUp() {
        directus = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        directus.start();
        service = new DirectusService(RestClient.builder(), mapper, directus.baseUrl(), "test-token");
    }

    @AfterEach
    void tearDown() {
        directus.stop();
    }

    private void page(String collection, int offset, String body) {
        directus.stubFor(get(urlPathEqualTo("/items/" + collection))
                .withQueryParam("offset", equalTo(String.valueOf(offset)))
                .willReturn(okJson(body)));
    }

    private JsonNode getFaqs(String locale) throws Exception {
        return mapper.valueToTree(service.getFaqs(locale));
    }

    @Test
    void mapsOnlyPublishedCompleteTranslationsAndSortsBothLevels() throws Exception {
        page("faq_topics", 0, """
                {"data":[
                  {"id":2,"code":"decks","status":"published","sort":20,"translations":[{"languages_code":"es","title":"Mazos"}]},
                  {"id":1,"code":"general","status":"published","sort":10,"translations":[{"languages_code":"es","title":"Primeros pasos"},{"languages_code":"en","title":"Getting started"}]},
                  {"id":3,"code":"empty","status":"published","sort":30,"translations":[{"languages_code":"es","title":"Vacío"}]},
                  {"id":4,"code":"draft","status":"draft","sort":1,"translations":[{"languages_code":"es","title":"Borrador"}]}
                ]}
                """);
        page("faq_topics", 4, "{\"data\":[]}");
        page("faqs", 0, """
                {"data":[
                  {"id":1,"code":"last","status":"published","sort":20,"topic":1,"translations":[{"languages_code":"es","question":"Última","answer":"Respuesta"}]},
                  {"id":2,"code":"first","status":"published","sort":10,"topic":1,"translations":[{"languages_code":"es","question":"Primera","answer":"Respuesta"},{"languages_code":"en","question":"First","answer":"Answer"}]},
                  {"id":3,"code":"deck","status":"published","sort":10,"topic":2,"translations":[{"languages_code":"es","question":"Mazo","answer":"Respuesta"}]},
                  {"id":4,"code":"incomplete","status":"published","sort":1,"topic":1,"translations":[{"languages_code":"es","question":"Incompleta","answer":" "}]},
                  {"id":5,"code":"draft-question","status":"draft","sort":1,"topic":1,"translations":[{"languages_code":"es","question":"Borrador","answer":"Respuesta"}]}
                ]}
                """);
        page("faqs", 5, "{\"data\":[]}");

        assertThat(getFaqs("es")).isEqualTo(mapper.readTree("""
                [
                  {"id":"general","title":"Primeros pasos","questions":[
                    {"id":"first","question":"Primera","answer":"Respuesta"},
                    {"id":"last","question":"Última","answer":"Respuesta"}]},
                  {"id":"decks","title":"Mazos","questions":[
                    {"id":"deck","question":"Mazo","answer":"Respuesta"}]}
                ]
                """));
        assertThat(getFaqs("en")).isEqualTo(mapper.readTree("""
                [{"id":"general","title":"Getting started","questions":[
                  {"id":"first","question":"First","answer":"Answer"}]}]
                """));
        directus.verify(getRequestedFor(urlPathEqualTo("/items/faq_topics"))
                .withQueryParam("filter[status][_eq]", equalTo("published"))
                .withHeader("Authorization", equalTo("Bearer test-token")));
    }

    @Test
    void omitsBlankAndDuplicateCodesAndSortsNullLast() throws Exception {
        page("faq_topics", 0, """
                {"data":[
                  {"id":1,"code":"general","status":"published","sort":null,"translations":[{"languages_code":"es","title":"General"}]},
                  {"id":2,"code":"dupe","status":"published","sort":1,"translations":[{"languages_code":"es","title":"Duplicado"}]},
                  {"id":3,"code":"dupe","status":"published","sort":2,"translations":[{"languages_code":"es","title":"Duplicado"}]},
                  {"id":4,"code":" ","status":"published","sort":0,"translations":[{"languages_code":"es","title":"Sin código"}]}
                ]}
                """);
        page("faq_topics", 4, "{\"data\":[]}");
        page("faqs", 0, """
                {"data":[
                  {"id":1,"code":"z-last","status":"published","sort":null,"topic":1,"translations":[{"languages_code":"es","question":"Final","answer":"R"}]},
                  {"id":2,"code":"b-first","status":"published","sort":10,"topic":1,"translations":[{"languages_code":"es","question":"B","answer":"R"}]},
                  {"id":3,"code":"a-first","status":"published","sort":10,"topic":1,"translations":[{"languages_code":"es","question":"A","answer":"R"}]},
                  {"id":4,"code":"duplicate","status":"published","sort":0,"topic":1,"translations":[{"languages_code":"es","question":"X","answer":"R"}]},
                  {"id":5,"code":"duplicate","status":"published","sort":0,"topic":1,"translations":[{"languages_code":"es","question":"Y","answer":"R"}]},
                  {"id":6,"code":"duplicate-translation","status":"published","sort":0,"topic":1,"translations":[{"languages_code":"es","question":"X","answer":"R"},{"languages_code":"es","question":"Y","answer":"R"}]}
                ]}
                """);
        page("faqs", 6, "{\"data\":[]}");

        assertThat(getFaqs("es")).isEqualTo(mapper.readTree("""
                [{"id":"general","title":"General","questions":[
                  {"id":"a-first","question":"A","answer":"R"},
                  {"id":"b-first","question":"B","answer":"R"},
                  {"id":"z-last","question":"Final","answer":"R"}]}]
                """));
    }

    @Test
    void propagatesDirectusFailureRatherThanReturningAnEmptyList() {
        directus.stubFor(get(urlPathEqualTo("/items/faq_topics"))
                .willReturn(aResponse().withStatus(500)));
        assertThatThrownBy(() -> getFaqs("es")).isInstanceOf(RuntimeException.class);
    }

    @Test
    void fetchesSubsequentPagesUntilAnEmptyPage() throws Exception {
        page("faq_topics", 0, """
                {"data":[{"id":1,"code":"first","status":"published","sort":10,"translations":[{"languages_code":"es","title":"Uno"}]}]}
                """);
        page("faq_topics", 1, """
                {"data":[{"id":2,"code":"second","status":"published","sort":20,"translations":[{"languages_code":"es","title":"Dos"}]}]}
                """);
        page("faq_topics", 2, "{\"data\":[]}");
        page("faqs", 0, """
                {"data":[{"id":1,"code":"question","status":"published","sort":10,"topic":2,"translations":[{"languages_code":"es","question":"P","answer":"R"}]}]}
                """);
        page("faqs", 1, "{\"data\":[]}");
        assertThat(getFaqs("es").get(0).path("id").asText()).isEqualTo("second");
        directus.verify(getRequestedFor(urlPathEqualTo("/items/faq_topics"))
                .withQueryParam("offset", equalTo("2")));
    }

    @Test
    void rejectsMalformedDirectusData() {
        page("faq_topics", 0, "{\"data\":null}");
        assertThatThrownBy(() -> getFaqs("es")).isInstanceOf(IllegalStateException.class);
    }
}
