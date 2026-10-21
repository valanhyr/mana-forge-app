package com.manaforge.api.dto;

import com.manaforge.api.model.mongo.SupportTicket;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Customer DTOs deliberately omit email, assignments, priority and internal messages. */
public final class SupportDtos {
    private SupportDtos() {}
    public record Create(@NotBlank @Size(max = 200) String subject,
                         @NotNull SupportTicket.Category category,
                         @NotBlank @Size(max = 8000) String content) {}
    public record Reply(@NotBlank @Size(max = 8000) String content) {}
    public record Message(String id, SupportTicket.Sender sender, String content, Instant createdAt) {}
    public record Ticket(String id, String subject, SupportTicket.Category category, SupportTicket.Status status,
                         Instant createdAt, Instant updatedAt, List<Message> messages) {}
}
