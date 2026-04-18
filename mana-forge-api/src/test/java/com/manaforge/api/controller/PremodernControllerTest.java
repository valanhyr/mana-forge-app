package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.PremodernService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PremodernController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class PremodernControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PremodernService premodernService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getBannedCards_returns200WithCardList() throws Exception {
        when(premodernService.getBannedCards()).thenReturn(
                List.of(
                        Map.of("name", "Necropotence", "object", "card"),
                        Map.of("name", "Demonic Tutor", "object", "card")
                )
        );

        mockMvc.perform(get("/api/premodern/banned-cards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Necropotence"))
                .andExpect(jsonPath("$[1].name").value("Demonic Tutor"));
    }

    @Test
    void getBannedCards_returnsEmptyListWhenServiceReturnsNone() throws Exception {
        when(premodernService.getBannedCards()).thenReturn(List.of());

        mockMvc.perform(get("/api/premodern/banned-cards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getBannedCards_isPublicEndpoint() throws Exception {
        when(premodernService.getBannedCards()).thenReturn(List.of());

        // No authentication — GET /api/** is public
        mockMvc.perform(get("/api/premodern/banned-cards"))
                .andExpect(status().isOk());
    }
}
