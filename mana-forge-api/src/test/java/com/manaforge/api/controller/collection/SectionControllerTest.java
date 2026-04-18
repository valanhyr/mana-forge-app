package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.strapi.Section;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.StrapiService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SectionController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class SectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StrapiService strapiService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getSections_returns200() throws Exception {
        when(strapiService.getSections(eq("es"), anyList())).thenReturn(List.of(new Section()));

        mockMvc.perform(get("/content-service/sections")
                .param("locale", "es")
                .param("section_id", "home", "about"))
                .andExpect(status().isOk());
    }

    @Test
    void getSections_returns200WithEmptyList() throws Exception {
        when(strapiService.getSections(any(), anyList())).thenReturn(List.of());

        mockMvc.perform(get("/content-service/sections")
                .param("section_id", "unknown"))
                .andExpect(status().isOk());
    }

    @Test
    void getSections_returns500OnJsonProcessingException() throws Exception {
        when(strapiService.getSections(any(), anyList())).thenThrow(new JsonProcessingException("parse error") {});

        mockMvc.perform(get("/content-service/sections")
                .param("locale", "es")
                .param("section_id", "home"))
                .andExpect(status().isInternalServerError());
    }
}
