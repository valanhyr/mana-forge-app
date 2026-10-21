package com.manaforge.api.service;

import java.util.Optional;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.manaforge.api.dto.SupportDtos;
import com.manaforge.api.dto.ContactRequest;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.*;
import com.manaforge.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SupportTicketServiceTest {
    private final SupportTicketRepository tickets = mock(SupportTicketRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final FrontdeskAuditService audit = mock(FrontdeskAuditService.class);
    private final FrontdeskAccessService access = mock(FrontdeskAccessService.class);
    private final SupportTicketService service = new SupportTicketService(tickets, users, encryption, audit, access);
    private User operator;

    @BeforeEach
    void setUp() {
        operator = new User();
        operator.setId("op1");
        operator.setUsername("operator");
        when(encryption.encrypt("contact@example.com")).thenReturn("encrypted");
        when(encryption.decrypt("encrypted")).thenReturn("contact@example.com");
        when(tickets.save(any())).thenAnswer(invocation -> {
            SupportTicket ticket = invocation.getArgument(0);
            ticket.setId("t1");
            return ticket;
        });
    }

    @Test
    void anonymousContactIsPersistedEncryptedAndAuditedWithoutClaimingIdentity() {
        ContactRequest contact = new ContactRequest();
        contact.setName("Contact");
        contact.setEmail("contact@example.com");
        contact.setSubject("Help");
        contact.setMessage("A sufficiently long message");
        service.createFromContact(contact);
        ArgumentCaptor<SupportTicket> captor = ArgumentCaptor.forClass(SupportTicket.class);
        verify(tickets).save(captor.capture());
        SupportTicket ticket = captor.getValue();
        assertThat(ticket.getUserId()).isNull();
        assertThat(ticket.getUserEmail()).isEqualTo("encrypted");
        assertThat(ticket.getMessages()).hasSize(1);
        assertThat(ticket.getMessages().getFirst().sender()).isEqualTo(SupportTicket.Sender.USER);
        verify(audit).record(any(AuditEvent.Actor.class), isNull(), eq("Contact"),
                eq(AuditEvent.Action.TICKET_CREATED), anyString(), anyMap());
    }

    @Test
    void registeredCustomerIdentityComesFromDatabase() {
        User customer = new User();
        customer.setId("u1");
        customer.setEmail("encrypted");
        customer.setUsername("real-name");
        when(users.findById("u1")).thenReturn(Optional.of(customer));
        TicketView result = service.create(new CreateTicket("u1", "forged@example.com", "Forged", "Help",
                SupportTicket.Category.ACCOUNT, SupportTicket.Priority.HIGH, "Initial message", null), operator);
        assertThat(result.userName()).isEqualTo("real-name");
        assertThat(result.userEmail()).isEqualTo("contact@example.com");
        assertThat(result.messages().getFirst().senderId()).isEqualTo("op1");
    }

    @Test
    void noteIsInternalAndAuthoredByOperator() {
        SupportTicket ticket = new SupportTicket();
        ticket.setUserEmail("encrypted");
        when(tickets.findById("t1")).thenReturn(Optional.of(ticket));
        TicketView result = service.addMessage("t1", new AddMessage("Private investigation", true), operator);
        assertThat(result.messages().getFirst().isInternalNote()).isTrue();
        assertThat(result.messages().getFirst().senderId()).isEqualTo("op1");
        verify(audit).record(same(operator), isNull(), isNull(), eq(AuditEvent.Action.TICKET_NOTE_ADDED), anyString(), anyMap());
    }

    @Test
    void assignmentUsesValidatedOperatorName() {
        User assignee = new User();
        assignee.setId("op2");
        assignee.setUsername("real-operator");
        when(access.operatorById("op2")).thenReturn(assignee);
        SupportTicket ticket = new SupportTicket();
        ticket.setUserEmail("encrypted");
        when(tickets.findById("t1")).thenReturn(Optional.of(ticket));
        TicketView result = service.assign("t1", "op2", operator);
        assertThat(result.assignedOperatorName()).isEqualTo("real-operator");
    }

    private Map<String, Object> fields(TicketView view) {
        return new ObjectMapper().findAndRegisterModules().convertValue(view, new TypeReference<Map<String, Object>>() {});
    }

    private User eligibleCustomer() {
        User customer = new User();
        customer.setId("u1"); customer.setUsername("customer");
        customer.setEmail("encrypted"); customer.setValidated(true);
        when(users.findById("u1")).thenReturn(Optional.of(customer));
        return customer;
    }

    @Test
    void allCreationEntrypointsDeclareOriginWithoutEmailBasedVisibility() {
        User customer = eligibleCustomer();
        service.createForCustomer(new SupportDtos.Create("Help", SupportTicket.Category.ACCOUNT, "My question"), customer);
        assertThat(fields(service.view(captureSaved())))
                .containsEntry("origin", "SUPPORT_WEB").containsEntry("customerVisible", true)
                .containsEntry("availableChannels", List.of("WEB", "EMAIL"));
        clearInvocations(tickets, audit);
        when(users.findByEmail("encrypted")).thenReturn(Optional.of(customer));
        ContactRequest contact = new ContactRequest();
        contact.setName("Unverified sender"); contact.setEmail("contact@example.com");
        contact.setSubject("Help"); contact.setMessage("Contact question");
        service.createFromContact(contact);
        SupportTicket saved = captureSaved();
        assertThat(saved.getUserId()).isEqualTo("u1");
        assertThat(saved.getMessages().getFirst().senderId()).isNull();
        assertThat(fields(service.view(saved))).containsEntry("origin", "CONTACT_FORM")
                .containsEntry("customerVisible", false).containsEntry("availableChannels", List.of("EMAIL"))
                .containsEntry("webUnavailableReason", "NOT_CUSTOMER_VISIBLE");
        clearInvocations(tickets, audit);
        TicketView explicit = service.create(new CreateTicket("u1", "forged@example.com", "Forged", "Help",
                SupportTicket.Category.ACCOUNT, SupportTicket.Priority.MEDIUM, "Question", null), operator);
        assertThat(fields(explicit)).containsEntry("origin", "FRONTDESK").containsEntry("customerVisible", true);
        TicketView anonymous = service.create(new CreateTicket(null, "contact@example.com", "Contact", "Help",
                SupportTicket.Category.ACCOUNT, SupportTicket.Priority.MEDIUM, "Question", null), operator);
        assertThat(fields(anonymous)).containsEntry("origin", "FRONTDESK").containsEntry("customerVisible", false);
    }

    private SupportTicket captureSaved() {
        ArgumentCaptor<SupportTicket> captor = ArgumentCaptor.forClass(SupportTicket.class);
        verify(tickets).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void legacyCapabilitiesDependOnExplicitVisibilityAndEligibleOwnerNotOriginOrEmail() {
        SupportTicket ticket = new SupportTicket(); ticket.setUserEmail("encrypted");
        assertThat(fields(service.view(ticket))).containsEntry("origin", "UNKNOWN")
                .containsEntry("availableChannels", List.of("EMAIL"));
        ticket.setCustomerVisible(true);
        assertThat(fields(service.view(ticket))).containsEntry("webUnavailableReason", "NO_OWNER");
        ticket.setUserId("u1");
        assertThat(fields(service.view(ticket))).containsEntry("webUnavailableReason", "OWNER_NOT_FOUND");
        User customer = eligibleCustomer();
        customer.setStatus(User.AccountStatus.SUSPENDED);
        assertThat(fields(service.view(ticket))).containsEntry("customerVisible", true)
                .containsEntry("webUnavailableReason", "OWNER_INACTIVE").containsEntry("availableChannels", List.of("EMAIL"));
        customer.setStatus(User.AccountStatus.ACTIVE); customer.setValidated(false);
        assertThat(fields(service.view(ticket))).containsEntry("webUnavailableReason", "OWNER_UNVERIFIED");
        customer.setValidated(true); ticket.setUserEmail(null);
        assertThat(fields(service.view(ticket))).containsEntry("availableChannels", List.of("WEB"))
                .containsEntry("webUnavailableReason", null);
        ticket.setUserEmail("bad-encrypted"); when(encryption.decrypt("bad-encrypted")).thenReturn("not-an-email");
        assertThat(fields(service.view(ticket))).containsEntry("availableChannels", List.of("WEB"));
        customer.setActive(false);
        assertThat(fields(service.view(ticket))).containsEntry("availableChannels", List.of());
        verify(tickets, never()).save(any());
        verify(users, never()).findByEmail(any());
    }

    @Test
    void publicReplyWithoutWebChannelIsRejectedBeforeAnyMutationEvenWhenNoteFlagIsOmitted() {
        SupportTicket ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("u1");
        ticket.setUserEmail("encrypted"); ticket.setUpdatedAt(Instant.EPOCH);
        when(tickets.findById("t1")).thenReturn(Optional.of(ticket));
        for (Boolean note : new Boolean[]{false, null}) {
            assertThatThrownBy(() -> service.addMessage("t1", new AddMessage("Unreachable reply", note), operator))
                    .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
            assertThat(ticket.getMessages()).isEmpty();
            assertThat(ticket.getStatus()).isEqualTo(SupportTicket.Status.OPEN);
            assertThat(ticket.getUpdatedAt()).isEqualTo(Instant.EPOCH);
        }
        ticket.setCustomerVisible(true);
        User customer = eligibleCustomer(); customer.setValidated(false);
        assertThatThrownBy(() -> service.addMessage("t1", new AddMessage("No access now", false), operator))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        verify(tickets, never()).save(any()); verifyNoInteractions(audit);
    }

    @Test
    void publicReplyIsReadableWithoutSmtpAndNotesNeverChangeWaitingStateOrLegacyOrigin() {
        eligibleCustomer();
        SupportTicket ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("u1");
        ticket.setCustomerVisible(true); ticket.setOrigin("FUTURE_SOURCE"); ticket.setUserEmail("encrypted");
        when(tickets.findById("t1")).thenReturn(Optional.of(ticket));
        service.addMessage("t1", new AddMessage("Public reply", false), operator);
        assertThat(ticket.getStatus()).isEqualTo(SupportTicket.Status.WAITING_USER);
        ticket.setStatus(SupportTicket.Status.IN_PROGRESS);
        service.addMessage("t1", new AddMessage("Private note", true), operator);
        assertThat(ticket.getStatus()).isEqualTo(SupportTicket.Status.IN_PROGRESS);
        assertThat(ticket.getOrigin()).isEqualTo("FUTURE_SOURCE");
        assertThat(service.customerView(ticket, true).messages()).extracting(SupportDtos.Message::content)
                .containsExactly("Public reply");
        assertThat(fields(service.view(ticket))).containsEntry("origin", "UNKNOWN");
    }

    @Test
    void pageResolvesOwnersOnceByIdAndKeepsContactHidden() {
        User customer = eligibleCustomer();
        SupportTicket visible = new SupportTicket(); visible.setUserId("u1"); visible.setCustomerVisible(true);
        SupportTicket contact = new SupportTicket(); contact.setUserId("u1"); contact.setUserEmail("encrypted");
        when(users.findAllById(List.of("u1"))).thenReturn(List.of(customer));
        clearInvocations(users);
        List<TicketView> result = service.views(List.of(visible, visible, contact));
        assertThat(fields(result.getFirst())).containsEntry("availableChannels", List.of("WEB"));
        assertThat(fields(result.getLast())).containsEntry("availableChannels", List.of("EMAIL"));
        verify(users).findAllById(List.of("u1")); verify(users, never()).findById(any());
        verify(users, never()).findByEmail(any());
    }

    @Test
    void closedAndResolvedRemainReadableAndExistingMessageLimitIsPreserved() {
        eligibleCustomer();
        SupportTicket ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("u1");
        ticket.setCustomerVisible(true);
        when(tickets.findById("t1")).thenReturn(Optional.of(ticket));
        for (SupportTicket.Status status : List.of(SupportTicket.Status.CLOSED, SupportTicket.Status.RESOLVED)) {
            ticket.setStatus(status);
            service.addMessage("t1", new AddMessage("Readable without reopening", false), operator);
            assertThat(ticket.getStatus()).isEqualTo(status);
            assertThat(fields(service.view(ticket))).containsEntry("availableChannels", List.of("WEB"));
        }
        while (ticket.getMessages().size() < 500) ticket.getMessages().add(ticket.getMessages().getFirst());
        clearInvocations(tickets, audit);
        assertThatThrownBy(() -> service.addMessage("t1", new AddMessage("Over limit", true), operator))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        verify(tickets, never()).save(any()); verifyNoInteractions(audit);
    }
}
