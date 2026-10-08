package com.manaforge.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Explicit backoffice contracts: never serialize a raw User document. */
public final class FrontdeskDtos {
    private FrontdeskDtos() {}

    public record PageResult<T>(List<T> items, int page, int size, long total) {}
    public record TicketView(String id, String userId, String userEmail, String userName,
                             String subject, SupportTicket.Category category, SupportTicket.Priority priority,
                             SupportTicket.Status status, String assignedOperatorId, String assignedOperatorName,
                             List<SupportTicket.Message> messages, Instant createdAt, Instant updatedAt,
                             SupportTicket.Metadata metadata) {}
    public record CreateTicket(@Size(max = 100) String userId,
                               @NotBlank @Email @Size(max = 254) String userEmail,
                               @NotBlank @Size(max = 120) String userName,
                               @NotBlank @Size(max = 200) String subject,
                               @NotNull SupportTicket.Category category,
                               @NotNull SupportTicket.Priority priority,
                               @NotBlank @Size(max = 8000) String initialMessage,
                               @Valid SupportTicket.Metadata metadata) {}
    public record AddMessage(@NotBlank @Size(max = 8000) String content, Boolean isInternalNote) {
        public AddMessage { isInternalNote = Boolean.TRUE.equals(isInternalNote); }
    }
    public record TicketStatusUpdate(@NotNull SupportTicket.Status status) {}
    public record AssignOperator(@NotBlank @Size(max = 100) String operatorId) {}
    public record UserStatusUpdate(@NotNull User.AccountStatus status) {}
    public record UserStats(long totalDecks, Integer aiQueriesToday, Integer aiQuotaLimit,
                            String aiQuotaPeriod, Instant aiQuotaResetsAt,
                            Integer aiQueriesThisMonth, Integer failedImportsCount) {}
    public record DeckSummary(String id, String name, String format, int cardCount, Instant updatedAt) {}
    public record UserView(String id, String email, String username, String avatarUrl, User.Tier tier,
                           Instant createdAt, Instant lastLoginAt, User.AccountStatus status,
                           UserStats stats, List<DeckSummary> recentDecks, long openTicketsCount) {}
    public record EmailTemplate(String id, String title, String category, String subject,
                                String bodyTemplate, List<String> availableMacros) {}
    public record RenderTemplate(@NotNull @Size(max = 30) Map<@Size(max = 100) String,
                                 @Size(max = 2000) String> variables) {}
    public record RenderedTemplate(String subject, String body) {}
    public record SendEmail(@NotBlank @Email @Size(max = 254) String to,
                            @NotBlank @Size(max = 120) String recipientName,
                            @NotBlank @Size(max = 200) String subject,
                            @NotBlank @Size(max = 50000) String body,
                            @Size(max = 100) String templateId, @Size(max = 100) String ticketId) {}
    public record EmailResult(boolean success, String messageId, String deliveryId) {}
}
