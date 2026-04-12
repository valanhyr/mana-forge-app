package com.manaforge.api.controller.collection;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.strapi.Footer;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.StrapiService;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FooterController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class FooterControllerTest {

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

        mockMvc.perform(get("/content-service/footer").param("locale", "es"))
                .andExpect(status().isOk());
    }

    @Test
    void getFooter_returns500OnJsonProcessingException() throws Exception {
        when(strapiService.getFooter("es")).thenThrow(new JsonProcessingException("parse error") {});

        mockMvc.perform(get("/content-service/footer").param("locale", "es"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getFooter_returns500OnRuntimeException() throws Exception {
        when(strapiService.getFooter("es")).thenThrow(new RuntimeException("Strapi unavailable"));

        mockMvc.perform(get("/content-service/footer").param("locale", "es"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void getFooter_isPublicEndpoint() throws Exception {
        when(strapiService.getFooter("en")).thenReturn(new Footer());

        // No authentication — GET /content-service/** is public
        mockMvc.perform(get("/content-service/footer").param("locale", "en"))
                .andExpect(status().isOk());
    }
}
