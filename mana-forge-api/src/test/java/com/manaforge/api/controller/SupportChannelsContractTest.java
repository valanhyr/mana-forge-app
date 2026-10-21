package com.manaforge.api.controller;

import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.*;
import com.manaforge.api.repository.*;
import com.manaforge.api.service.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real ticket service/DTO serialization; auth and CSRF are covered by the security slices. */
class SupportChannelsContractTest {
    private final SupportTicketRepository repository = mock(SupportTicketRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final FrontdeskAuditService audit = mock(FrontdeskAuditService.class);
    private final FrontdeskAccessService access = mock(FrontdeskAccessService.class);
    private final AccountAccessService accountAccess = mock(AccountAccessService.class);
    private final FrontdeskQueryService queries = mock(FrontdeskQueryService.class);
    private final FrontdeskEmailService emails = mock(FrontdeskEmailService.class);
    private final SupportTicketService service = new SupportTicketService(repository, users, encryption, audit, access);
    private MockMvc mvc;
    private SupportTicket ticket;

    @BeforeEach void setUp() {
        User owner = new User(); owner.setId("u1"); owner.setValidated(true);
        owner.setUsername("Customer"); owner.setEmail("encrypted");
        when(users.findById("u1")).thenReturn(Optional.of(owner));
        when(accountAccess.requireAccount(any())).thenReturn(owner);
        User operator = new User(); operator.setId("op1"); operator.setUsername("Operator");
        when(access.requireOperator(any())).thenReturn(operator);
        when(encryption.decrypt("encrypted")).thenReturn("contact@example.com");
        ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("u1"); ticket.setUserEmail("encrypted");
        ticket.setSubject("Help"); ticket.setOrigin("CONTACT_FORM");
        when(repository.findById("t1")).thenReturn(Optional.of(ticket));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(repository.findByIdAndUserIdAndCustomerVisibleTrue("t1", "u1"))
                .thenAnswer(call -> ticket.isCustomerVisible() ? Optional.of(ticket) : Optional.empty());
        when(queries.tickets(any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenAnswer(call -> new PageResult<>(List.of(service.view(ticket)), 0, 25, 1));
        mvc = MockMvcBuilders.standaloneSetup(
                new FrontdeskController(access, queries, service, mock(FrontdeskUserService.class),
                        mock(DirectusEmailTemplateService.class), emails, mock(NewsletterService.class), mock(NewsletterCampaignService.class),
                        mock(AnnouncementService.class), mock(AnnouncementCampaignService.class)),
                new SupportController(accountAccess, service))
                .setControllerAdvice(new FrontdeskExceptionHandler(), new com.manaforge.api.config.ApiExceptionHandler()).build();
    }

    @Test void hiddenContactIsExplicitAndPublicWriteHasNoEffects() throws Exception {
        mvc.perform(get("/api/frontdesk/tickets")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].origin").value("CONTACT_FORM"))
                .andExpect(jsonPath("$.items[0].customerVisible").value(false))
                .andExpect(jsonPath("$.items[0].availableChannels[0]").value("EMAIL"));
        mvc.perform(get("/api/frontdesk/tickets/t1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.webUnavailableReason").value("NOT_CUSTOMER_VISIBLE"));
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Unreachable\",\"customerVisible\":true,\"availableChannels\":[\"WEB\"]}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("WEB_CHANNEL_UNAVAILABLE"));
        mvc.perform(get("/api/support/tickets/t1")).andExpect(status().isNotFound());
        verify(repository, never()).save(any()); verifyNoInteractions(audit, emails);
    }

    @Test void publicReplyAndPrivateNoteKeepCustomerContractPrivate() throws Exception {
        ticket.setCustomerVisible(true); ticket.setOrigin(null);
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Visible reply\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.origin").value("UNKNOWN"))
                .andExpect(jsonPath("$.availableChannels[0]").value("WEB"));
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Private investigation\",\"isInternalNote\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages[1].isInternalNote").value(true));
        mvc.perform(get("/api/support/tickets/t1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].content").value("Visible reply"))
                .andExpect(jsonPath("$.origin").doesNotExist()).andExpect(jsonPath("$.availableChannels").doesNotExist())
                .andExpect(jsonPath("$.userEmail").doesNotExist()).andExpect(jsonPath("$.assignedOperatorId").doesNotExist());
        verifyNoInteractions(emails);
    }
}
