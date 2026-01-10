package com.manaforge.api.service;

import com.manaforge.api.dto.ComponentDto;
import com.manaforge.api.dto.FormatDetailDto;
import com.manaforge.api.dto.FormatSummaryDto;
import com.manaforge.api.model.strapi.StrapiComponent;
import com.manaforge.api.model.strapi.StrapiFormatData;
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
        // Para el resumen, extraemos el texto del primer componente de descripción si existe
        String descriptionText = "";
        if (data.getDescription() != null && !data.getDescription().isEmpty()) {
            descriptionText = data.getDescription().get(0).getDescription();
        }

        return FormatSummaryDto.builder()
                .mongoId(data.getMongoId())
                .title(data.getTitle())
                .description(descriptionText)
                .build();
    }

    private FormatDetailDto mapToDetail(StrapiFormatData data) {
        return FormatDetailDto.builder()
                .mongoId(data.getMongoId())
                .title(data.getTitle())
                .subtitle(data.getSubtitle())
                .description(mapComponents(data.getDescription()))
                .rules(mapComponents(data.getRules()))
                .build();
    }

    private List<ComponentDto> mapComponents(List<StrapiComponent> components) {
        if (components == null) return Collections.emptyList();
        return components.stream()
                .map(c -> ComponentDto.builder()
                        .title(c.getTitle())
                        .description(c.getDescription())
                        .build())
                .collect(Collectors.toList());
    }
}