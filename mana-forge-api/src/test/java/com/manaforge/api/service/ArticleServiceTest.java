package com.manaforge.api.service;

import com.manaforge.api.dto.ArticleDto;
import com.manaforge.api.model.strapi.StrapiArticleData;
import com.manaforge.api.model.strapi.StrapiSeo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceTest {

    @Mock
    private StrapiService strapiService;

    @InjectMocks
    private ArticleService articleService;

    private StrapiArticleData buildArticle(String id, String title) {
        StrapiArticleData data = new StrapiArticleData();
        data.setDocumentId(id);
        data.setTitle(title);
        data.setSubtitle("Subtitle");
        data.setImageUrl("http://example.com/img.png");
        data.setArticle("Content body");
        data.setPublishedAt("2024-01-01");
        return data;
    }

    @Test
    void getLast5Articles_mapsToDtoList() throws Exception {
        StrapiArticleData a1 = buildArticle("doc1", "Article One");
        StrapiArticleData a2 = buildArticle("doc2", "Article Two");
        when(strapiService.getLatestArticles("es", 5)).thenReturn(List.of(a1, a2));

        List<ArticleDto> result = articleService.getLast5Articles("es");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getDocumentId()).isEqualTo("doc1");
        assertThat(result.get(0).getTitle()).isEqualTo("Article One");
        assertThat(result.get(1).getDocumentId()).isEqualTo("doc2");
    }

    @Test
    void getLast5Articles_returnsEmptyOnException() throws Exception {
        when(strapiService.getLatestArticles("es", 5)).thenThrow(new RuntimeException("Strapi down"));

        List<ArticleDto> result = articleService.getLast5Articles("es");

        assertThat(result).isEmpty();
    }

    @Test
    void getArticleByDocumentId_mapsToDto() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "My Article");
        when(strapiService.getArticleByDocumentId("doc1", "en")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "en");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("My Article");
        assertThat(result.getDocumentId()).isEqualTo("doc1");
    }

    @Test
    void getArticleByDocumentId_returnsNullWhenServiceReturnsNull() throws Exception {
        when(strapiService.getArticleByDocumentId("missing", "es")).thenReturn(null);

        ArticleDto result = articleService.getArticleByDocumentId("missing", "es");

        assertThat(result).isNull();
    }

    @Test
    void getArticleByDocumentId_returnsNullOnException() throws Exception {
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenThrow(new RuntimeException("error"));

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result).isNull();
    }

    @Test
    void mapToDto_usesCoverUrlWhenSet() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "Cover Test");
        article.setCoverUrl("http://example.com/cover.png");
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result.getImageUrl()).isEqualTo("http://example.com/cover.png");
    }

    @Test
    void mapToDto_fallsBackToImageUrlWhenCoverIsNull() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "Image Test");
        article.setCoverUrl(null);
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result.getImageUrl()).isEqualTo("http://example.com/img.png");
    }

    @Test
    void mapToDto_mapsSeoFields() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "SEO Test");
        StrapiSeo seo = new StrapiSeo();
        seo.setTitle("SEO Title");
        seo.setDescription("SEO Desc");
        seo.setKeywords("kw1,kw2");
        seo.setCanonical("https://example.com/article");
        article.setSeo(seo);
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result.getSeo()).isNotNull();
        assertThat(result.getSeo().getTitle()).isEqualTo("SEO Title");
        assertThat(result.getSeo().getKeywords()).isEqualTo("kw1,kw2");
    }

    @Test
    void mapToDto_handlesNullSeo() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "No SEO");
        article.setSeo(null);
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result.getSeo()).isNull();
    }

    @Test
    void mapToDto_handlesNullAuthor() throws Exception {
        StrapiArticleData article = buildArticle("doc1", "No Author");
        article.setAuthor(null);
        when(strapiService.getArticleByDocumentId("doc1", "es")).thenReturn(article);

        ArticleDto result = articleService.getArticleByDocumentId("doc1", "es");

        assertThat(result.getAuthor()).isNull();
    }
}
