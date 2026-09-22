package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.directus.FooterLegal;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.ContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FooterLegalController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class FooterLegalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContentService contentService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getFooterLegal_returns200() throws Exception {
        when(contentService.getFooterLegal("es")).thenReturn(new FooterLegal());

        mockMvc.perform(get("/content-service/footer-legal").param("locale", "es"))
                .andExpect(status().isOk());
    }

    @Test
    void getFooterLegal_returns500OnJsonProcessingException() throws Exception {
        when(contentService.getFooterLegal("es")).thenThrow(new JsonProcessingException("parse error") {});

        mockMvc.perform(get("/content-service/footer-legal").param("locale", "es"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getFooterLegal_returns500OnRuntimeException() throws Exception {
        when(contentService.getFooterLegal("es")).thenThrow(new RuntimeException("CMS down"));

        mockMvc.perform(get("/content-service/footer-legal").param("locale", "es"))
                .andExpect(status().isInternalServerError());
    }
}
