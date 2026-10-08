package com.manaforge.api.repository;

import java.util.Collection;
import com.manaforge.api.model.mongo.SupportTicket;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

public interface SupportTicketRepository extends MongoRepository<SupportTicket, String> {
    long countByUserIdAndStatusIn(String userId, Collection<SupportTicket.Status> statuses);
    Page<SupportTicket> findByUserIdAndCustomerVisibleTrue(String userId, Pageable pageable);
    Optional<SupportTicket> findByIdAndUserIdAndCustomerVisibleTrue(String id, String userId);
}
