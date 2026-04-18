package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.strapi.Language;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.StrapiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LanguageController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class LanguageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StrapiService strapiService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getLanguages_returns200() throws Exception {
        when(strapiService.getLanguages("es")).thenReturn(List.of(new Language()));

        mockMvc.perform(get("/content-service/languages"))
                .andExpect(status().isOk());
    }

    @Test
    void getLanguages_usesDefaultLocaleEs() throws Exception {
        when(strapiService.getLanguages("es")).thenReturn(List.of());

        // No locale param — defaults to "es"
        mockMvc.perform(get("/content-service/languages"))
                .andExpect(status().isOk());
    }

    @Test
    void getLanguages_returns500OnJsonProcessingException() throws Exception {
        when(strapiService.getLanguages("es")).thenThrow(new JsonProcessingException("parse error") {});

        mockMvc.perform(get("/content-service/languages"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getLanguages_returns500OnRuntimeException() throws Exception {
        when(strapiService.getLanguages("es")).thenThrow(new RuntimeException("Strapi down"));

        mockMvc.perform(get("/content-service/languages"))
                .andExpect(status().isInternalServerError());
    }
}
