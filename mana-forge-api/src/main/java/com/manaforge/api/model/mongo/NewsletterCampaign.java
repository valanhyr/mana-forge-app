package com.manaforge.api.model.mongo;

import java.time.Instant;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "newsletter_campaigns")
public class NewsletterCampaign {
    public enum State { RUNNING, COMPLETED, FAILED }
    @Id private String id;
    private String operatorId;
    private List<String> recipientIds;
    private String subject;
    private String body;
    private String templateId;
    private State state = State.RUNNING;
    private int sent;
    private int failed;
    private int skipped;
    private Instant createdAt;
}
