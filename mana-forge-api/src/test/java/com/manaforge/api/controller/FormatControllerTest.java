package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.model.mongo.Format;
import com.manaforge.api.repository.FormatRepository;
import com.manaforge.api.service.FormatService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FormatController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class FormatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FormatRepository formatRepository;

    @MockitoBean
    private FormatService formatService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void getActiveFormats_returns200WithList() throws Exception {
        Format f1 = new Format();
        f1.setId("fmt1");
        f1.setName(Map.of("en", "Premodern"));
        f1.setActive(true);
        when(formatRepository.findByIsActiveTrue()).thenReturn(List.of(f1));

        mockMvc.perform(get("/api/formats/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("fmt1"));
    }

    @Test
    void getAllFormats_returns200WithSummaryDtoList() throws Exception {
        FormatSummaryDto dto = FormatSummaryDto.builder()
                .mongoId("fmt1")
                .title("Premodern")
                .slug("premodern")
                .build();
        when(formatService.getAllFormats()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/formats"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].title").value("Premodern"));
    }

    @Test
    void getFormatById_found_returns200WithDetailDto() throws Exception {
        FormatDetailDto dto = FormatDetailDto.builder()
                .slug("premodern")
                .title("Premodern")
                .build();
        when(formatService.getFormatByMongoId("fmt1")).thenReturn(dto);

        mockMvc.perform(get("/api/formats/fmt1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Premodern"));
    }

    @Test
    void getFormatById_notFound_returns404() throws Exception {
        when(formatService.getFormatByMongoId("missing")).thenReturn(null);

        mockMvc.perform(get("/api/formats/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void evictFormatsCache_publicEndpoint_returns204() throws Exception {
        mockMvc.perform(delete("/api/formats/cache").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
