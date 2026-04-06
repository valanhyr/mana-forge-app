package com.manaforge.api.service;

import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.model.mongo.Card;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.mongodb.core.BulkOperations;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Downloads Scryfall's oracle_cards bulk data file and upserts every card into
 * the local MongoDB collection, eliminating the need for individual API calls
 * during deck enrichment.
 *
 * - Runs automatically at startup when the collection is empty.
 * - Runs on a daily schedule (03:00) to pick up new/updated cards.
 * - The custom {@code gameChanger} field is never overwritten by Scryfall data.
 */
@Service
public class CardBulkLoadService {

    private static final Logger log = LoggerFactory.getLogger(CardBulkLoadService.class);

    private static final String BULK_DATA_API = "https://api.scryfall.com/bulk-data";
    private static final int BATCH_SIZE = 500;

    private final MongoTemplate mongoTemplate;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean loading = new AtomicBoolean(false);

    public CardBulkLoadService(MongoTemplate mongoTemplate,
                               RestTemplate restTemplate,
                               ObjectMapper objectMapper) {
        this.mongoTemplate = mongoTemplate;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void loadOnStartupIfEmpty() {
        Thread.ofVirtual().name("scryfall-bulk-init").start(() -> {
            long count = mongoTemplate.getCollection("cards").estimatedDocumentCount();
            if (count == 0) {
                log.info("Cards collection is empty — triggering Scryfall bulk load.");
                loadBulkData();
            } else {
                log.info("Cards collection has {} documents — skipping startup bulk load.", count);
            }
        });
    }

    @Scheduled(cron = "0 0 3 * * ?")
    public void scheduledDailyUpdate() {
        log.info("Starting scheduled Scryfall bulk data refresh.");
        Thread.ofVirtual().name("scryfall-bulk-scheduled").start(this::loadBulkData);
    }

    public void loadBulkData() {
        if (!loading.compareAndSet(false, true)) {
            log.warn("Scryfall bulk load already in progress — skipping.");
            return;
        }
        try {
            String downloadUri = resolveOracleCardsDownloadUri();
            if (downloadUri == null) {
                log.error("Could not resolve oracle_cards download URI from Scryfall bulk-data API.");
                return;
            }
            log.info("Downloading Scryfall oracle_cards from: {}", downloadUri);
            streamAndUpsert(downloadUri);
        } catch (Exception e) {
            log.error("Scryfall bulk load failed: {}", e.getMessage(), e);
        } finally {
            loading.set(false);
        }
    }

    @SuppressWarnings("unchecked")
    private String resolveOracleCardsDownloadUri() {
        Map<String, Object> response = restTemplate.getForObject(BULK_DATA_API, Map.class);
        if (response == null) return null;
        List<Map<String, Object>> dataList = (List<Map<String, Object>>) response.get("data");
        if (dataList == null) return null;
        return dataList.stream()
                .filter(entry -> "oracle_cards".equals(entry.get("type")))
                .map(entry -> (String) entry.get("download_uri"))
                .findFirst()
                .orElse(null);
    }

    private void streamAndUpsert(String downloadUri) throws Exception {
        TypeReference<Map<String, Object>> mapType = new TypeReference<>() {};
        try (InputStream is = new URI(downloadUri).toURL().openStream();
             var parser = objectMapper.getFactory().createParser(is)) {

            if (parser.nextToken() != JsonToken.START_ARRAY) {
                throw new IllegalStateException("Expected JSON array in Scryfall bulk data.");
            }

            List<Map<String, Object>> batch = new ArrayList<>(BATCH_SIZE);
            int total = 0;

            while (parser.nextToken() != JsonToken.END_ARRAY) {
                batch.add(objectMapper.readValue(parser, mapType));
                if (batch.size() >= BATCH_SIZE) {
                    upsertBatch(batch);
                    total += batch.size();
                    batch.clear();
                    log.debug("Upserted {} cards so far...", total);
                }
            }

            if (!batch.isEmpty()) {
                upsertBatch(batch);
                total += batch.size();
            }

            log.info("Scryfall bulk load complete — {} cards upserted.", total);
        }
    }

    private void upsertBatch(List<Map<String, Object>> cards) {
        BulkOperations bulkOps = mongoTemplate.bulkOps(BulkOperations.BulkMode.UNORDERED, Card.class);
        for (Map<String, Object> card : cards) {
            String scryfallId = (String) card.get("id");
            if (scryfallId == null) continue;
            Query query = Query.query(Criteria.where("scryfallId").is(scryfallId));
            bulkOps.upsert(query, buildUpdate(scryfallId, card));
        }
        bulkOps.execute();
    }

    /**
     * Builds a MongoDB {@link Update} from a raw Scryfall card map.
     * Maps Scryfall snake_case JSON keys to the Java camelCase field names stored in MongoDB.
     * The custom {@code gameChanger} field is intentionally excluded to preserve manual edits.
     */
    private Update buildUpdate(String scryfallId, Map<String, Object> c) {
        Update u = new Update();
        u.set("scryfallId",       scryfallId);
        set(u, c, "name",               "name");
        set(u, c, "lang",               "lang");
        set(u, c, "released_at",        "releasedAt");
        set(u, c, "uri",                "uri");
        set(u, c, "scryfall_uri",       "scryfallUri");
        set(u, c, "layout",             "layout");
        set(u, c, "highres_image",      "highresImage");
        set(u, c, "image_status",       "imageStatus");
        set(u, c, "image_uris",         "imageUris");
        set(u, c, "mana_cost",          "manaCost");
        set(u, c, "cmc",                "cmc");
        set(u, c, "type_line",          "typeLine");
        set(u, c, "oracle_text",        "oracleText");
        set(u, c, "power",              "power");
        set(u, c, "toughness",          "toughness");
        set(u, c, "colors",             "colors");
        set(u, c, "color_identity",     "colorIdentity");
        set(u, c, "keywords",           "keywords");
        set(u, c, "legalities",         "legalities");
        set(u, c, "games",              "games");
        set(u, c, "reserved",           "reserved");
        set(u, c, "foil",               "foil");
        set(u, c, "nonfoil",            "nonfoil");
        set(u, c, "oversized",          "oversized");
        set(u, c, "promo",              "promo");
        set(u, c, "reprint",            "reprint");
        set(u, c, "variation",          "variation");
        set(u, c, "set_id",             "setId");
        set(u, c, "set",                "set");
        set(u, c, "set_name",           "setName");
        set(u, c, "set_type",           "setType");
        set(u, c, "set_uri",            "setUri");
        set(u, c, "set_search_uri",     "setSearchUri");
        set(u, c, "scryfall_set_uri",   "scryfallSetUri");
        set(u, c, "rulings_uri",        "rulingsUri");
        set(u, c, "prints_search_uri",  "printsSearchUri");
        set(u, c, "collector_number",   "collectorNumber");
        set(u, c, "digital",            "digital");
        set(u, c, "rarity",             "rarity");
        set(u, c, "artist",             "artist");
        set(u, c, "prices",             "prices");
        set(u, c, "related_uris",       "relatedUris");
        set(u, c, "purchase_uris",      "purchaseUris");
        return u;
    }

    private void set(Update update, Map<String, Object> card, String scryfallKey, String mongoField) {
        if (card.containsKey(scryfallKey)) {
            update.set(mongoField, card.get(scryfallKey));
        }
    }
}
