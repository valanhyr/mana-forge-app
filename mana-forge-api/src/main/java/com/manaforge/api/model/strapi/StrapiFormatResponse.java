package com.manaforge.api.model.strapi;

import lombok.Data;
import java.util.List;

@Data
public class StrapiFormatResponse {
    private List<StrapiFormatData> data;
}