package com.manaforge.api.repository;

import java.time.Instant;
import java.util.List;
import com.manaforge.api.model.mongo.SupportTicket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.mongodb.test.autoconfigure.DataMongoTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.*;

@DataMongoTest
@ActiveProfiles("test")
class SupportTicketRepositoryTest {
    @Autowired SupportTicketRepository tickets;

    @BeforeEach
    void setUp() { tickets.deleteAll(); }

    @Test
    void conversationAndInternalNoteRoundTrip() {
        SupportTicket ticket = new SupportTicket();
        ticket.setUserEmail("encrypted-email");
        ticket.getMessages().add(new SupportTicket.Message("m1", SupportTicket.Sender.OPERATOR,
                "op1", "Operator", "Private note", Instant.now(), true));
        SupportTicket saved = tickets.save(ticket);
        SupportTicket loaded = tickets.findById(saved.getId()).orElseThrow();
        assertThat(loaded.getUserEmail()).isEqualTo("encrypted-email");
        assertThat(loaded.getMessages().getFirst().isInternalNote()).isTrue();
    }

    @Test
    void staleSaveCannotOverwriteAnotherOperatorsMessage() {
        SupportTicket saved = tickets.save(new SupportTicket());
        SupportTicket first = tickets.findById(saved.getId()).orElseThrow();
        SupportTicket second = tickets.findById(saved.getId()).orElseThrow();
        first.getMessages().add(new SupportTicket.Message("m1", SupportTicket.Sender.OPERATOR,
                "op1", "Operator", "First reply", Instant.now(), false));
        tickets.save(first);
        second.setStatus(SupportTicket.Status.CLOSED);
        assertThatThrownBy(() -> tickets.save(second)).isInstanceOf(OptimisticLockingFailureException.class);
        assertThat(tickets.findById(saved.getId()).orElseThrow().getMessages()).hasSize(1);
    }

    @Test
    void openCountDoesNotIncludeResolvedTickets() {
        SupportTicket open = new SupportTicket();
        open.setUserId("u1");
        tickets.save(open);
        SupportTicket resolved = new SupportTicket();
        resolved.setUserId("u1");
        resolved.setStatus(SupportTicket.Status.RESOLVED);
        tickets.save(resolved);
        assertThat(tickets.countByUserIdAndStatusIn("u1", List.of(SupportTicket.Status.OPEN,
                SupportTicket.Status.IN_PROGRESS, SupportTicket.Status.WAITING_USER))).isEqualTo(1);
    }

    @Test
    void customerQueriesExcludeOtherOwnersAndAnonymousEmailMatchedContacts() {
        SupportTicket visible = new SupportTicket(); visible.setUserId("u1"); visible.setCustomerVisible(true);
        visible = tickets.save(visible);
        SupportTicket contact = new SupportTicket(); contact.setUserId("u1"); contact = tickets.save(contact);
        SupportTicket other = new SupportTicket(); other.setUserId("u2"); other.setCustomerVisible(true); tickets.save(other);
        assertThat(tickets.findByUserIdAndCustomerVisibleTrue("u1", org.springframework.data.domain.PageRequest.of(0, 25)))
                .extracting(SupportTicket::getId).containsExactly(visible.getId());
        assertThat(tickets.findByIdAndUserIdAndCustomerVisibleTrue(contact.getId(), "u1")).isEmpty();
        assertThat(tickets.findByIdAndUserIdAndCustomerVisibleTrue(visible.getId(), "u2")).isEmpty();
    }
}
