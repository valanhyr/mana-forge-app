package com.manaforge.api.model.mongo;

import java.time.Instant;
import java.util.Map;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "audit_events")
public class AuditEvent {
    public enum Action {
        USER_LOGIN, USER_STATUS_UPDATE, AI_QUOTA_RESET, TICKET_CREATED,
        TICKET_STATUS_CHANGED, TICKET_NOTE_ADDED, TICKET_MESSAGE_ADDED,
        TICKET_ASSIGNED, EMAIL_SENT, EMAIL_FAILED, DECK_IMPORT_FAILED
    }
    public record Actor(String id, String name, String role) {}

    @Id
    private String id;
    private Instant timestamp;
    private Actor actor;
    private String targetUserId;
    private String targetUserName;
    private Action action;
    private String details;
    private Map<String, Object> metadata;
}
