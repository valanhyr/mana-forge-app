package com.manaforge.api.frontdesk;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FrontdeskOperatorRepository extends MongoRepository<FrontdeskOperator, String> {
    Optional<FrontdeskOperator> findByEmail(String email);
}
