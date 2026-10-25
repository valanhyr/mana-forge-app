package com.manaforge.api.frontdesk;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface FrontdeskOperatorSessionRepository extends MongoRepository<FrontdeskOperatorSession, String> {}
