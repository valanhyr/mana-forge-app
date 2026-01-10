package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FormatSummaryDto {
    private String mongoId;
    private String title;
    // Para el resumen, tomaremos el texto de la primera descripción para simplificar
    private String description;
}