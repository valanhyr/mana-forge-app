package com.manaforge.api.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.manaforge.api.model.mongo.Format;

import java.util.List;

@Repository
public interface FormatRepository extends MongoRepository<Format, String> {
    
    List<Format> findByIsActiveTrue();
}