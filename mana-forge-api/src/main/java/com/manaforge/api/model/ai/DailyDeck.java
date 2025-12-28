package com.manaforge.api.model.ai;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.Map;

@Document(collection = "daily_decks")
public class DailyDeck {

    @Id
    private String id;

    @Indexed(unique = true)
    private LocalDate date;

    private Map<String, Object> deckData;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Map<String, Object> getDeckData() {
        return deckData;
    }

    public void setDeckData(Map<String, Object> deckData) {
        this.deckData = deckData;
    }
}
