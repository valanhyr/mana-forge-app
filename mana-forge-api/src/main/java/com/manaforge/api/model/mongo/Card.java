package com.manaforge.api.model.mongo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.util.Map;
import java.util.List;

@Data
@Document(collection = "cards")
@JsonIgnoreProperties(ignoreUnknown = true) // Ignora los +50 campos extra de Scryfall
public class Card {

    @Id
    private String id; // El ID interno de MongoDB

    @Indexed(unique = true)
    @JsonProperty("id")
    private String scryfallId; // El UUID oficial de Scryfall

    @Indexed
    private String name;

    @JsonProperty("mana_cost")
    private String manaCost;

    private Double cmc;

    @JsonProperty("type_line")
    private String typeLine;

    @JsonProperty("oracle_text")
    private String oracleText;

    private List<String> colors;

    @JsonProperty("set_name")
    private String setName;

    private String rarity;

    // Precios: Scryfall envía un objeto con usd, usd_foil, etc.
    private Map<String, String> prices;

    // Imágenes: Mapeamos el objeto image_uris de Scryfall
    private Map<String, String> imageUris;

    @JsonProperty("image_uris")
    private void unpackImages(Map<String, String> image_uris) {
        this.imageUris = image_uris;
    }

    // Legalidades (Fundamental para Premodern)
    private Map<String, String> legalities;
}