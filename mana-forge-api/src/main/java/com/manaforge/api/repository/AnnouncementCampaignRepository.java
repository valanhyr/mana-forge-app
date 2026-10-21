package com.manaforge.api.repository;

import com.manaforge.api.model.mongo.AnnouncementCampaign;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AnnouncementCampaignRepository extends MongoRepository<AnnouncementCampaign, String> {}
