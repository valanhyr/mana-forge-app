package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.AuditEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditEventRepository extends MongoRepository<AuditEvent, String> {}
