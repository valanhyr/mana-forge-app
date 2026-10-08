package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.NewsletterCampaign;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NewsletterCampaignRepository extends MongoRepository<NewsletterCampaign, String> {}
