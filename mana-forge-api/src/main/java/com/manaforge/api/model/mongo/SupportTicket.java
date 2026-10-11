package com.manaforge.api.model.mongo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "support_tickets")
public class SupportTicket {
    public enum Status { OPEN, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED }
    public enum Priority { LOW, MEDIUM, HIGH, URGENT }
    public enum Category { DECK_BUILDER, AI_ANALYSIS, RULES_FORMAT, ACCOUNT, OTHER }
    public enum Sender { OPERATOR, USER, SYSTEM }
    public enum Origin { SUPPORT_WEB, CONTACT_FORM, FRONTDESK, UNKNOWN }
    public enum Channel { WEB, EMAIL }
    public enum WebUnavailableReason { NOT_CUSTOMER_VISIBLE, NO_OWNER, OWNER_NOT_FOUND, OWNER_INACTIVE, OWNER_UNVERIFIED }

    @Id
    private String id;
    @Version
    private Long version;
    private String userId;
    // Keep raw values so future/legacy origins never break reads or get rewritten as UNKNOWN.
    private String origin;

    public Origin effectiveOrigin() {
        try { return origin == null ? Origin.UNKNOWN : Origin.valueOf(origin); }
        catch (IllegalArgumentException ignored) { return Origin.UNKNOWN; }
    }
    // Only explicitly authenticated/assigned tickets belong in the customer's inbox.
    // Anonymous contact email matching must never grant access to a conversation.
    private Boolean customerVisible = false;

    public boolean isCustomerVisible() { return Boolean.TRUE.equals(customerVisible); }
    private String userEmail; // Encrypted with the same lookup scheme as users.email.
    private String userName;
    private String subject;
    private Category category = Category.OTHER;
    private Priority priority = Priority.MEDIUM;
    private Status status = Status.OPEN;
    private String assignedOperatorId;
    private String assignedOperatorName;
    private List<Message> messages = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;
    private Metadata metadata;

    public record Message(String id, Sender sender, String senderId, String senderName,
                          String content, Instant createdAt, boolean isInternalNote) {}
    public record Metadata(@Size(max = 100) String deckId, @Size(max = 200) String deckTitle,
                           @Size(max = 100) String format) {}
}
