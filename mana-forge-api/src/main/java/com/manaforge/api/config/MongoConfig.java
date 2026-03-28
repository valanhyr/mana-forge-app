package com.manaforge.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(basePackages = "com.manaforge.api")
public class MongoConfig {
    // MongoDB connection is configured via MONGODB_URI environment variable
    // See application.yaml: spring.data.mongodb.uri
}
