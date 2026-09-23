package com.manaforge.api.model.directus;

import lombok.Data;
import java.util.List;

@Data
public class DirectusFormatResponse {
    private List<DirectusFormatData> data;
}
