package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.EmailDelivery;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EmailDeliveryRepository extends MongoRepository<EmailDelivery, String> {}
