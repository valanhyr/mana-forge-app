package com.manaforge.api.service;

import java.util.List;
import java.util.regex.Pattern;
import com.manaforge.api.model.mongo.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FrontdeskQueryServiceTest {
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final SupportTicketService tickets = mock(SupportTicketService.class);
    private final FrontdeskUserService users = mock(FrontdeskUserService.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final FrontdeskQueryService service = new FrontdeskQueryService(mongo, tickets, users, encryption);

    @Test
    void paginationIsBoundedBeforeDatabaseAccess() {
        assertThatThrownBy(() -> service.users((String) null, -1, 25)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.tickets(null, null, null, null, 0, 101)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.audit(null, null, 0, 0)).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(mongo);
    }

    @Test
    void ticketListIsPagedFilteredAndDoesNotLoadConversations() {
        when(mongo.count(any(Query.class), eq(SupportTicket.class))).thenReturn(80L);
        when(mongo.find(any(Query.class), eq(SupportTicket.class))).thenReturn(List.of());
        var result = service.tickets(SupportTicket.Status.OPEN, SupportTicket.Priority.HIGH, "u1", null, 2, 25);
        assertThat(result.total()).isEqualTo(80);
        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(captor.capture(), eq(SupportTicket.class));
        Query query = captor.getValue();
        assertThat(query.getSkip()).isEqualTo(50);
        assertThat(query.getLimit()).isEqualTo(25);
        assertThat(query.getFieldsObject()).containsEntry("messages", 0);
        assertThat(query.getQueryObject().toString()).contains("OPEN", "HIGH", "u1");
    }

    @Test
    void userListDelegatesValidatedFiltersToTheUserDirectory() {
        var filters = com.manaforge.api.dto.FrontdeskUserQuery.parse(
                null, "openTickets", "desc", "PRO", "ACTIVE", null);
        when(users.list(filters, 0, 25)).thenReturn(new com.manaforge.api.dto.FrontdeskDtos.PageResult<>(List.of(), 0, 25, 0));

        var result = service.users(filters, 0, 25);

        assertThat(result.total()).isZero();
        verify(users).list(filters, 0, 25);
    }
}
