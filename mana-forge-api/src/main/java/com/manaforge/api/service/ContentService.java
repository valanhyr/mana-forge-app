package com.manaforge.api.service;

import com.manaforge.api.model.strapi.*;

import java.util.List;

public interface ContentService {
    // Articles
    List<StrapiArticleData> getLatestArticles(String locale, int limit, String acceptLanguage) throws Exception;
    StrapiArticleData getArticleByDocumentId(String documentId, String locale, String acceptLanguage) throws Exception;

    // Formats
    List<StrapiFormatData> getFormats(String locale, String acceptLanguage) throws Exception;
    StrapiFormatData getFormatByMongoId(String mongoId, String locale) throws Exception;

    // Other content
    Footer getFooter(String locale) throws Exception;
    FooterLegal getFooterLegal(String locale) throws Exception;
    List<Hero> getHeros(String locale, String hero_id) throws Exception;
    List<Section> getSections(String locale, List<String> sectionIds) throws Exception;
    List<Language> getLanguages(String locale) throws Exception;
}
