package com.manaforge.api.service;

import java.util.Optional;
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
}
