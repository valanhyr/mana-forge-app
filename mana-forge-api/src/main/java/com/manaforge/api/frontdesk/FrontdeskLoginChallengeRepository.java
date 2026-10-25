package com.manaforge.api.frontdesk;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface FrontdeskLoginChallengeRepository extends MongoRepository<FrontdeskLoginChallenge, String> {}
