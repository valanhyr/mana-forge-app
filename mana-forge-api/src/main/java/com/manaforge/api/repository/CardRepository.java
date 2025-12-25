package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Card;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends MongoRepository<Card, String> {
    
    List<Card> findByNameContainingIgnoreCase(String name);
}