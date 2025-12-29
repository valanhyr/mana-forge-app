package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.Format;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FormatRepository extends MongoRepository<Format, String> {
    List<Format> findByIsActiveTrue();
    Optional<Format> findBySlug(String slug);
    Optional<Format> findByName(String name);
}
