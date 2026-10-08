package com.manaforge.api.service;

import java.time.Instant;
import java.util.Map;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FrontdeskAuditService {
    private final AuditEventRepository repository;

    public AuditEvent record(User operator, String targetId, String targetName, AuditEvent.Action action,
                             String details, Map<String, Object> metadata) {
        return record(new AuditEvent.Actor(operator.getId(), operator.getUsername(), "OPERATOR"),
                targetId, targetName, action, details, metadata);
    }

    public AuditEvent record(AuditEvent.Actor actor, String targetId, String targetName, AuditEvent.Action action,
                             String details, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        event.setTimestamp(Instant.now());
        event.setActor(actor);
        event.setTargetUserId(targetId);
        event.setTargetUserName(targetName);
        event.setAction(action);
        event.setDetails(details);
        event.setMetadata(metadata);
        return repository.insert(event);
    }
}
