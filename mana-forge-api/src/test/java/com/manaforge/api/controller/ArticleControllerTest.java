package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.dto.ArticleDto;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.ArticleService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ArticleController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class ArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ArticleService articleService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void getLatestArticles_returns200WithArticleList() throws Exception {
        ArticleDto article = ArticleDto.builder().documentId("doc1").title("Test Article").build();
        when(articleService.getLast5Articles("es")).thenReturn(List.of(article));

        mockMvc.perform(get("/api/articles/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].documentId").value("doc1"))
                .andExpect(jsonPath("$[0].title").value("Test Article"));
    }

    @Test
    void getLatestArticles_normalizesEnUStoEn() throws Exception {
        when(articleService.getLast5Articles("en")).thenReturn(List.of());

        mockMvc.perform(get("/api/articles/latest")
                .header("Accept-Language", "en-US"))
                .andExpect(status().isOk());

        verify(articleService).getLast5Articles("en");
    }

    @Test
    void getLatestArticles_returnsEmptyListWhenServiceReturnsNone() throws Exception {
        when(articleService.getLast5Articles("es")).thenReturn(List.of());

        mockMvc.perform(get("/api/articles/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void evictArticlesCache_returns204() throws Exception {
        mockMvc.perform(delete("/api/articles/cache"))
                .andExpect(status().isNoContent());
    }

    @Test
    void getArticleByDocumentId_returns200WhenFound() throws Exception {
        ArticleDto article = ArticleDto.builder().documentId("doc1").title("Found Article").build();
        when(articleService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        mockMvc.perform(get("/api/articles/doc1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value("doc1"))
                .andExpect(jsonPath("$.title").value("Found Article"));
    }

    @Test
    void getArticleByDocumentId_returns404WhenNotFound() throws Exception {
        when(articleService.getArticleByDocumentId("missing", "es")).thenReturn(null);

        mockMvc.perform(get("/api/articles/missing"))
                .andExpect(status().isNotFound());
    }
}
