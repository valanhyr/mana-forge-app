package com.manaforge.api.model.mongo;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "decks")
public class Deck {
    @Id
    private String id;
    private String title;
    private String description;
    private String formatId; // Relación con el formato
    private String userId;   // Quién lo creó
    
    // El mazo guardado como una lista de entradas (Cantidad + ID de Carta)
    private List<DeckEntry> mainDeck;
    private List<DeckEntry> sideboard;
    
    private boolean isPublic;
}

@Data
class DeckEntry {
    private String cardId;   // El ID de tu colección de MongoDB
    private Integer quantity;
}