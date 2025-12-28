package com.manaforge.api.repository;

import com.manaforge.api.model.ai.DailyDeck;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyDeckRepository extends MongoRepository<DailyDeck, String> {
    Optional<DailyDeck> findByDate(LocalDate date);
}
