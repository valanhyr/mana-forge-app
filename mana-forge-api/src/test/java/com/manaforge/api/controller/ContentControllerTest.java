package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.strapi.Footer;
import com.manaforge.api.model.strapi.Hero;
import com.manaforge.api.model.strapi.Section;
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
    private StrapiService strapiService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getFooter_returns200() throws Exception {
        when(strapiService.getFooter("es")).thenReturn(new Footer());

        mockMvc.perform(get("/api/v1/content/footer/es"))
                .andExpect(status().isOk());
    }

    @Test
    void getHeros_returns200WithList() throws Exception {
        Hero hero = new Hero();
        when(strapiService.getHeros("es", null)).thenReturn(List.of(hero));

        mockMvc.perform(get("/api/v1/content/heros").param("locale", "es"))
                .andExpect(status().isOk());
    }

    @Test
    void getSections_returns200WithList() throws Exception {
        when(strapiService.getSections(eq("es"), any())).thenReturn(List.of(new Section()));

        mockMvc.perform(get("/api/v1/content/sections")
                .param("locale", "es")
                .param("sectionIds", "home"))
                .andExpect(status().isOk());
    }

    @Test
    void evictContentCache_returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/content/cache"))
                .andExpect(status().isNoContent());
    }
}
