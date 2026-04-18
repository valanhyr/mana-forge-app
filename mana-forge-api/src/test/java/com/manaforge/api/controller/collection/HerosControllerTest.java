package com.manaforge.api.controller.collection;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.strapi.Hero;
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

@WebMvcTest(HerosController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class HerosControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StrapiService strapiService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getHeros_returns200WithList() throws Exception {
        when(strapiService.getHeros("es", null)).thenReturn(List.of(new Hero(), new Hero()));

        mockMvc.perform(get("/content-service/heros").param("locale", "es"))
                .andExpect(status().isOk());
    }

    @Test
    void getHeros_withHeroId_returnsSingleHero() throws Exception {
        Hero hero = new Hero();
        when(strapiService.getHeros("es", "home-hero")).thenReturn(List.of(hero));

        mockMvc.perform(get("/content-service/heros")
                .param("locale", "es")
                .param("hero_id", "home-hero"))
                .andExpect(status().isOk());
    }

    @Test
    void getHeros_withHeroId_returnsEmptyListWhenNoMatch() throws Exception {
        when(strapiService.getHeros("es", "unknown")).thenReturn(List.of());

        mockMvc.perform(get("/content-service/heros")
                .param("locale", "es")
                .param("hero_id", "unknown"))
                .andExpect(status().isOk());
    }

    @Test
    void getHeros_returns500OnJsonProcessingException() throws Exception {
        when(strapiService.getHeros("es", null)).thenThrow(new JsonProcessingException("parse error") {});

        mockMvc.perform(get("/content-service/heros").param("locale", "es"))
                .andExpect(status().isInternalServerError());
    }
}
