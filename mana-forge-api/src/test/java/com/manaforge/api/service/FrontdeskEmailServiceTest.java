package com.manaforge.api.service;

import java.util.Properties;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.*;
import com.manaforge.api.repository.EmailDeliveryRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FrontdeskEmailServiceTest {
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final EmailDeliveryRepository deliveries = mock(EmailDeliveryRepository.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final FrontdeskAuditService audit = mock(FrontdeskAuditService.class);
    private final SupportTicketService tickets = mock(SupportTicketService.class);
    private final DirectusEmailTemplateService templates = mock(DirectusEmailTemplateService.class);
    private final FrontdeskEmailService service = new FrontdeskEmailService(sender, deliveries, encryption, audit,
            tickets, templates, "support@example.com");
    private User operator;
    private MimeMessage message;

    @BeforeEach
    void setUp() {
        operator = new User();
        operator.setId("op1");
        operator.setUsername("operator");
        message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        when(encryption.encrypt("user@example.com")).thenReturn("encrypted");
        when(deliveries.save(any())).thenAnswer(invocation -> {
            EmailDelivery delivery = invocation.getArgument(0);
            delivery.setId("delivery-1");
            return delivery;
        });
    }

    private SendEmail request(String subject, String body, String ticketId) {
        return new SendEmail("user@example.com", "Customer", subject, body, null, ticketId);
    }

    @Test
    void smtpSuccessIsTrackedWithEncryptedRecipientAndPlainTextBody() throws Exception {
        doAnswer(invocation -> { message.saveChanges(); return null; }).when(sender).send(any(MimeMessage.class));
        EmailResult result = service.send(request("Help", "<script>not HTML</script>", null), operator);
        assertThat(result.success()).isTrue();
        assertThat(result.messageId()).isNotBlank();
        assertThat(result.deliveryId()).isEqualTo("delivery-1");
        assertThat(message.getContentType()).startsWith("text/plain");
        var order = inOrder(deliveries, sender);
        order.verify(deliveries).save(argThat(delivery -> "encrypted".equals(delivery.getRecipientEmail())));
        order.verify(sender).createMimeMessage();
        order.verify(sender).send(any(MimeMessage.class));
        order.verify(deliveries).save(argThat(delivery -> delivery.getStatus() == EmailDelivery.Status.SENT));
        verify(audit).record(same(operator), isNull(), isNull(), eq(AuditEvent.Action.EMAIL_SENT), anyString(), anyMap());
    }

    @Test
    void smtpFailureIsPersistedAndReportedWithoutLeakingProviderError() {
        doThrow(new MailSendException("password=secret user@example.com")).when(sender).send(any(MimeMessage.class));
        assertThatThrownBy(() -> service.send(request("Help", "Body", null), operator))
                .isInstanceOf(ResponseStatusException.class).hasMessageNotContaining("secret");
        verify(deliveries, times(2)).save(any());
        verify(deliveries, atLeastOnce()).save(argThat(delivery -> delivery.getStatus() == EmailDelivery.Status.FAILED
                && "SMTP_SEND_FAILED".equals(delivery.getError())));
        verify(audit).record(same(operator), isNull(), isNull(), eq(AuditEvent.Action.EMAIL_FAILED), anyString(), anyMap());
    }

    @Test
    void recipientMustMatchLinkedTicket() {
        SupportTicket ticket = new SupportTicket();
        ticket.setUserEmail("other-encrypted-email");
        when(tickets.requireTicket("t1")).thenReturn(ticket);
        assertThatThrownBy(() -> service.send(request("Help", "Body", "t1"), operator))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(sender, deliveries);
    }

    @Test
    void hiddenContactEmailUsesItsStoredAddressAndTicketReferenceWithoutPublishingConversation() throws Exception {
        SupportTicket ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("email-matched-user");
        ticket.setUserEmail("encrypted"); ticket.setOrigin("CONTACT_FORM");
        ticket.getMessages().add(new SupportTicket.Message("private", SupportTicket.Sender.OPERATOR,
                "op1", "Operator", "SECRET NOTE", java.time.Instant.now(), true));
        when(tickets.requireTicket("t1")).thenReturn(ticket);
        service.send(request("Reply", "Explicit email answer", "t1"), operator);
        assertThat(message.getContent()).isEqualTo("Explicit email answer");
        assertThat(ticket.isCustomerVisible()).isFalse();
        assertThat(ticket.getStatus()).isEqualTo(SupportTicket.Status.OPEN);
        assertThat(ticket.getMessages()).hasSize(1);
        verify(deliveries, atLeastOnce()).save(argThat(delivery -> "t1".equals(delivery.getTicketId())));
    }

    @Test
    void headerInjectionAndUnresolvedMacrosCannotSend() {
        assertThatThrownBy(() -> service.send(request("Help\r\nBcc: victim@example.com", "Body", null), operator))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.send(request("Help", "Hi {{user.name}}", null), operator))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(sender, deliveries);
    }

    @Test
    void newsletterAddsUnsubscribeHeaderAndCampaignTracking() throws Exception {
        String url = "https://example.com/newsletter/unsubscribe#token";
        service.sendNewsletter(request("News", "Body\n" + url, null), operator, url, "c1");
        assertThat(message.getHeader("List-Unsubscribe", null)).isEqualTo("<" + url + ">");
        verify(deliveries, atLeastOnce()).save(argThat(delivery -> "c1".equals(delivery.getCampaignId())));
    }

    @Test
    void announcementHasNoUnsubscribeHeaderAndKeepsCampaignTracking() throws Exception {
        service.sendAnnouncement(request("Notice", "Body", null), operator, "c1");
        assertThat(message.getHeader("List-Unsubscribe", null)).isNull();
        verify(deliveries, atLeastOnce()).save(argThat(delivery -> "c1".equals(delivery.getCampaignId())));
        verify(sender).send(any(MimeMessage.class));
    }

    @Test
    void announcementChannelAcceptsOnlyAnnouncementTemplates() {
        when(templates.get("news")).thenReturn(new EmailTemplate("news", "News", "BROADCAST", "News", "Body", java.util.List.of()));
        when(templates.get("support")).thenReturn(new EmailTemplate("support", "Help", "SUPPORT", "Help", "Body", java.util.List.of()));
        for (String id : java.util.List.of("news", "support")) {
            assertThatThrownBy(() -> service.sendAnnouncement(new SendEmail("user@example.com", "Customer", "Notice", "Body", id, null), operator, "c1"))
                    .isInstanceOf(ResponseStatusException.class);
        }
        verifyNoInteractions(sender, deliveries);
    }

    @Test
    void announcementTemplateIsAcceptedByTheAnnouncementChannelOnly() {
        when(templates.get("notice")).thenReturn(new EmailTemplate("notice", "Notice", "ANNOUNCEMENT", "Notice", "Body", java.util.List.of()));
        var request = new SendEmail("user@example.com", "Customer", "Notice", "Body", "notice", null);
        assertThat(service.sendAnnouncement(request, operator, "c1").success()).isTrue();
        assertThatThrownBy(() -> service.send(request, operator)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.sendNewsletter(request, operator, "https://example.com/u#t", "c2"))
                .isInstanceOf(ResponseStatusException.class);
        verify(sender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void announcementRejectsHeaderInjectionAndUnresolvedMacros() {
        assertThatThrownBy(() -> service.sendAnnouncement(request("Notice\r\nBcc: victim@example.com", "Body", null), operator, "c1"))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.sendAnnouncement(request("Notice", "Hi {{user.name}}", null), operator, "c1"))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(sender, deliveries);
    }

    @Test
    void operationalChannelCannotBypassNewsletterConsentWithABroadcastTemplate() {
        when(templates.get("news")).thenReturn(new EmailTemplate("news", "News", "BROADCAST", "News", "Body", java.util.List.of()));
        assertThatThrownBy(() -> service.send(new SendEmail("user@example.com", "Customer", "News", "Body", "news", null), operator))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(sender, deliveries);
    }
}
