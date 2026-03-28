package com.manaforge.api.service;

import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.dto.SeoDto;
import com.manaforge.api.model.strapi.StrapiComponent;
import com.manaforge.api.model.strapi.StrapiFormatData;
import com.manaforge.api.model.strapi.StrapiSeo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FormatService {

    private static final Logger logger = LoggerFactory.getLogger(FormatService.class);

    private final StrapiService strapiService;

    public FormatService(StrapiService strapiService) {
        this.strapiService = strapiService;
    }

    public List<FormatSummaryDto> getAllFormats() {
        try {
            // Delegamos en StrapiService (que ya maneja caché y RestClient)
            List<StrapiFormatData> formats = strapiService.getFormats("es");
            logger.info("Found {} formats from Strapi", formats.size());
            
            return formats.stream()
                    .map(this::mapToSummary)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error fetching formats from Strapi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public FormatDetailDto getFormatByMongoId(String mongoId) {
        try {
            StrapiFormatData data = strapiService.getFormatByMongoId(mongoId, "es");
            
            if (data == null) return null;
            
            return mapToDetail(data);
        } catch (Exception e) {
            logger.error("Error fetching format detail from Strapi: {}", e.getMessage());
            return null;
        }
    }

    private FormatSummaryDto mapToSummary(StrapiFormatData data) {
        String descriptionText = data.getSection().stream()
                .filter(c -> "description".equals(c.getName()))
                .findFirst()
                .map(StrapiComponent::getDescription)
                .orElse("");

        return FormatSummaryDto.builder()
                .mongoId(data.getMongoId())
                .title(data.getTitle())
                .subtitle(data.getSubtitle())
                .imageUrl(data.getImageUrl())
                .slug(data.getSlug())
                .build();
    }

    private FormatDetailDto mapToDetail(StrapiFormatData data) {
        FormatDetailDto.FormatSectionDto descriptionSection = data.getSection().stream()
                .filter(c -> "description".equals(c.getName()))
                .findFirst()
                .map(this::mapToSectionDto)
                .orElse(null);

        FormatDetailDto.FormatSectionDto rulesSection = data.getSection().stream()
                .filter(c -> "rules".equals(c.getName()))
                .findFirst()
                .map(this::mapToSectionDto)
                .orElse(null);

        return FormatDetailDto.builder()
                .slug(data.getSlug())
                .title(data.getTitle())
                .subtitle(data.getSubtitle())
                .imageUrl(data.getImageUrl())
                .description(descriptionSection)
                .rules(rulesSection)
                .seo(mapSeo(data.getSeo()))
                .build();
    }

    private SeoDto mapSeo(StrapiSeo seo) {
        if (seo == null) return null;
        return SeoDto.builder()
                .title(seo.getTitle())
                .description(seo.getDescription())
                .keywords(seo.getKeywords())
                .canonical(seo.getCanonical())
                .build();
    }

    private FormatDetailDto.FormatSectionDto mapToSectionDto(StrapiComponent component) {
        return FormatDetailDto.FormatSectionDto.builder()
                .name(component.getName())
                .title(component.getTitle())
                .description(component.getDescription())
                .rules(component.getRules() == null ? Collections.emptyList() : component.getRules().stream()
                        .map(r -> FormatDetailDto.FormatRuleDto.builder().id(r.getId()).text(r.getText()).build())
                        .collect(Collectors.toList()))
                .build();
    }
}