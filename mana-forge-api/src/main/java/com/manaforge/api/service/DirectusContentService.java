package com.manaforge.api.service;

import com.manaforge.api.model.directus.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DirectusContentService implements ContentService {
    private final DirectusService directusService;

    @Override
    public List<StrapiArticleData> getLatestArticles(String locale, int limit, String acceptLanguage) throws JsonProcessingException {
        return directusService.getLatestArticles(locale, limit, acceptLanguage);
    }

    @Override
    public StrapiArticleData getArticleByDocumentId(String documentId, String locale, String acceptLanguage) throws JsonProcessingException {
        return directusService.getArticleByDocumentId(documentId, locale, acceptLanguage);
    }

    @Override
    public List<StrapiFormatData> getFormats(String locale, String acceptLanguage) throws JsonProcessingException {
        return directusService.getFormats(locale, acceptLanguage);
    }

    @Override
    public StrapiFormatData getFormatByMongoId(String mongoId, String locale) throws JsonProcessingException {
        return directusService.getFormatByMongoId(mongoId, locale);
    }

    @Override
    public Footer getFooter(String locale) throws JsonProcessingException {
        return directusService.getFooter(locale);
    }

    @Override
    public FooterLegal getFooterLegal(String locale) throws JsonProcessingException {
        return directusService.getFooterLegal(locale);
    }

    @Override
    public List<Hero> getHeros(String locale, String hero_id) throws JsonProcessingException {
        return directusService.getHeros(locale, hero_id);
    }

    @Override
    public List<Section> getSections(String locale, List<String> sectionIds) throws JsonProcessingException {
        return directusService.getSections(locale, sectionIds);
    }

    @Override
    public List<Language> getLanguages(String locale) throws JsonProcessingException {
        return directusService.getLanguages(locale);
    }
}
