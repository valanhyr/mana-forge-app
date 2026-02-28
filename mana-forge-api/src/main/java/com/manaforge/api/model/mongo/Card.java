package com.manaforge.api.model.mongo;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.Map;

@Data
@Document(collection = "cards")
public class Card {
    @Id
    private String id;

    // @JsonAlias permite deserializar desde "id" (Scryfall) sin causar conflicto
    // de serialización con el @Id de Mongo.
    @JsonAlias("id")
    private String scryfallId;

    private String name;
    private String lang;
    private String releasedAt;
    private String uri;
    private String scryfallUri;
    private String layout;
    private Boolean highresImage;
    private String imageStatus;
    private Map<String, String> imageUris;
    private String manaCost;
    private Double cmc;
    private String typeLine;
    private String oracleText;
    private String power;
    private String toughness;
    private List<String> colors;
    private List<String> colorIdentity;
    private List<String> keywords;
    private Map<String, String> legalities;
    private List<String> games;
    private Boolean reserved;
    private Boolean foil;
    private Boolean nonfoil;
    private Boolean oversized;
    private Boolean promo;
    private Boolean reprint;
    private Boolean variation;
    private String setId;
    private String set;
    private String setName;
    private String setType;
    private String setUri;
    private String setSearchUri;
    private String scryfallSetUri;
    private String rulingsUri;
    private String printsSearchUri;
    private String collectorNumber;
    private Boolean digital;
    private String rarity;
    private String artist;
    private Map<String, String> prices;
    private Map<String, String> relatedUris;
    private Map<String, String> purchaseUris;
    private Boolean gameChanger;
}