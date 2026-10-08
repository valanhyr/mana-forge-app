package com.manaforge.api.service;

import java.time.Instant;
import java.util.Map;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.AuditEvent;
import com.manaforge.api.model.mongo.EmailDelivery;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.EmailDeliveryRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FrontdeskEmailService {
    private final JavaMailSender sender;
    private final EmailDeliveryRepository deliveries;
    private final EmailEncryptionService encryption;
    private final FrontdeskAuditService audit;
    private final SupportTicketService tickets;
    private final DirectusEmailTemplateService templates;
    private final String from;

    public FrontdeskEmailService(JavaMailSender sender, EmailDeliveryRepository deliveries,
                                EmailEncryptionService encryption, FrontdeskAuditService audit,
                                SupportTicketService tickets, DirectusEmailTemplateService templates,
                                @Value("${mail.from}") String from) {
        this.sender = sender;
        this.deliveries = deliveries;
        this.encryption = encryption;
        this.audit = audit;
        this.tickets = tickets;
        this.templates = templates;
        this.from = from;
    }

    public EmailResult send(SendEmail request, User operator) {
        return send(request, operator, null, null);
    }

    public EmailResult sendNewsletter(SendEmail request, User operator, String unsubscribeUrl, String campaignId) {
        return send(request, operator, unsubscribeUrl, campaignId);
    }

    private EmailResult send(SendEmail request, User operator, String unsubscribeUrl, String campaignId) {
        if (request.subject().contains("\r") || request.subject().contains("\n")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid email subject");
        }
        if (request.body().matches("(?s).*\\{\\{[a-zA-Z0-9_.-]+}}.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unresolved template macros");
        }
        SupportTicket ticket = request.ticketId() == null ? null : tickets.requireTicket(request.ticketId());
        String email = encryption.encrypt(request.to());
        if (ticket != null && !email.equals(ticket.getUserEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient does not match the ticket");
        }
        if (request.templateId() != null) {
            var template = templates.get(request.templateId());
            if ("BROADCAST".equals(template.category()) != (unsubscribeUrl != null)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use the newsletter channel for newsletter templates");
            }
        }

        EmailDelivery delivery = new EmailDelivery();
        delivery.setRecipientEmail(email);
        delivery.setRecipientName(request.recipientName());
        delivery.setSubject(request.subject());
        delivery.setTemplateId(request.templateId());
        delivery.setTicketId(request.ticketId());
        delivery.setCampaignId(campaignId);
        delivery.setOperatorId(operator.getId());
        delivery.setCreatedAt(Instant.now());
        delivery = deliveries.save(delivery); // Persist intent before contacting SMTP.

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(request.to());
            helper.setSubject(request.subject());
            helper.setText(request.body(), false); // Plain text: operator/macros cannot inject active HTML.
            if (unsubscribeUrl != null) message.setHeader("List-Unsubscribe", "<" + unsubscribeUrl + ">");
            sender.send(message);
            delivery.setMessageId(message.getMessageID());
        } catch (Exception exception) {
            delivery.setStatus(EmailDelivery.Status.FAILED);
            delivery.setError("SMTP_SEND_FAILED");
            deliveries.save(delivery);
            record(operator, ticket, delivery, AuditEvent.Action.EMAIL_FAILED);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Email could not be sent");
        }
        delivery.setStatus(EmailDelivery.Status.SENT);
        delivery.setSentAt(Instant.now());
        deliveries.save(delivery);
        record(operator, ticket, delivery, AuditEvent.Action.EMAIL_SENT);
        return new EmailResult(true, delivery.getMessageId(), delivery.getId());
    }

    private void record(User operator, SupportTicket ticket, EmailDelivery delivery, AuditEvent.Action action) {
        audit.record(operator, ticket == null ? null : ticket.getUserId(),
                ticket == null ? null : ticket.getUserName(), action,
                action == AuditEvent.Action.EMAIL_SENT ? "SMTP accepted email" : "SMTP send failed",
                Map.of("deliveryId", delivery.getId()));
    }
}
