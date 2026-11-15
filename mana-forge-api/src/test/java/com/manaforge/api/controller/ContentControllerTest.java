package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.directus.Footer;
import com.manaforge.api.model.directus.Hero;
import com.manaforge.api.model.directus.Section;
import com.manaforge.api.model.directus.FaqTopic;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.ContentService;
import com.manaforge.api.service.DirectusService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContentController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContentService contentService;

    @MockitoBean
    private DirectusService directusService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getFooter_returns200() throws Exception {
        when(contentService.getFooter("es")).thenReturn(new Footer());

        mockMvc.perform(get("/api/v1/content/footer/es"))
                .andExpect(status().isOk());
    }

    @Test
    void getHeros_returns200WithList() throws Exception {
        Hero hero = new Hero();
        when(contentService.getHeros("es", null)).thenReturn(List.of(hero));

        mockMvc.perform(get("/api/v1/content/heros").param("locale", "es"))
                .andExpect(status().isOk());
    }

    @Test
    void getSections_returns200WithList() throws Exception {
        when(contentService.getSections(eq("es"), any())).thenReturn(List.of(new Section()));

        mockMvc.perform(get("/api/v1/content/sections")
                .param("locale", "es")
                .param("sectionIds", "home"))
                .andExpect(status().isOk());
    }

    @Test
    void evictContentCache_requiresAuth_returns401() throws Exception {
        mockMvc.perform(delete("/api/v1/content/cache"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void faqs_arePublicAndHonorExplicitLocaleBeforeHeader() throws Exception {
        when(directusService.getFaqs("en")).thenReturn(List.of(new FaqTopic("general", "Getting started",
                List.of(new FaqTopic.FaqQuestion("first", "Question", "Answer")))));
        mockMvc.perform(get("/api/v1/content/faqs").param("locale", "en")
                        .header("Accept-Language", "es"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("general"))
                .andExpect(jsonPath("$[0].questions[0].id").value("first"));
    }

    @Test
    void faqs_resolveWeightedHeaderAndDefaultToSpanish() throws Exception {
        when(directusService.getFaqs("en")).thenReturn(List.of(new FaqTopic("en", "English", List.of())));
        when(directusService.getFaqs("es")).thenReturn(List.of(new FaqTopic("es", "Español", List.of())));
        mockMvc.perform(get("/api/v1/content/faqs").header("Accept-Language", "en-US,en;q=0.9,es;q=0.5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value("en"));
        mockMvc.perform(get("/api/v1/content/faqs"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value("es"));
    }

    @Test
    void faqs_reportDirectusErrorsWithoutLeakingDetails() throws Exception {
        when(directusService.getFaqs("es")).thenThrow(new RuntimeException("private token"));
        mockMvc.perform(get("/api/v1/content/faqs"))
                .andExpect(status().isBadGateway())
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private token"))));
    }
}
