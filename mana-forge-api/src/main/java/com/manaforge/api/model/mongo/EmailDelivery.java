package com.manaforge.api.model.mongo;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "email_deliveries")
public class EmailDelivery {
    public enum Status { PENDING, SENT, FAILED }
    @Id
    private String id;
    private String recipientEmail; // Encrypted; message bodies are not stored here.
    private String recipientName;
    private String subject;
    private String templateId;
    private String ticketId;
    private String campaignId;
    private String operatorId;
    private Status status = Status.PENDING;
    private String messageId;
    private Instant createdAt;
    private Instant sentAt;
    private String error; // Generic code only: SMTP exception messages may contain PII.
}
