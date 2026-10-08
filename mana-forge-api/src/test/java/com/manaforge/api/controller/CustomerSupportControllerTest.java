package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.mongo.SupportTicket;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.SupportTicketRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.*;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({SupportController.class, NewsletterController.class})
@Import({SecurityConfig.class, FrontdeskAccessService.class, AccountAccessService.class, SupportTicketService.class})
@ActiveProfiles("test")
class CustomerSupportControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean UserRepository users;
    @MockitoBean SupportTicketRepository tickets;
    @MockitoBean EmailEncryptionService encryption;
    @MockitoBean FrontdeskAuditService audit;
    @MockitoBean OAuth2LoginSuccessHandler oauth;
    @MockitoBean NewsletterService newsletter;
    private User customer;
    private SupportTicket ticket;

    @BeforeEach void setUp() {
        customer = new User(); customer.setId("u1"); customer.setUsername("customer");
        customer.setValidated(true); customer.setEmail("encrypted");
        when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
        ticket = new SupportTicket(); ticket.setId("t1"); ticket.setUserId("u1"); ticket.setCustomerVisible(true);
        ticket.setSubject("Help");
        ticket.getMessages().add(new SupportTicket.Message("m1", SupportTicket.Sender.OPERATOR, "op", "Operator", "Public reply", Instant.now(), false));
        ticket.getMessages().add(new SupportTicket.Message("m2", SupportTicket.Sender.OPERATOR, "op", "Operator", "Secret internal note", Instant.now(), true));
        when(tickets.findByIdAndUserIdAndCustomerVisibleTrue("t1", "u1")).thenReturn(Optional.of(ticket));
        when(tickets.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test void anonymousReadsAreNotCoveredByThePublicGetRule() throws Exception {
        for (String path : new String[]{"/api/support/tickets", "/api/support/tickets/t1", "/api/support/csrf", "/api/newsletter/csrf"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(tickets, newsletter);
    }

    @Test void customerDtoNeverExposesNotesOrOperatorMetadata() throws Exception {
        mvc.perform(get("/api/support/tickets/t1").with(user("customer")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].content").value("Public reply"))
                .andExpect(jsonPath("$.messages[0].senderId").doesNotExist())
                .andExpect(jsonPath("$.userEmail").doesNotExist()).andExpect(jsonPath("$.assignedOperatorId").doesNotExist());
        verify(tickets).findByIdAndUserIdAndCustomerVisibleTrue("t1", "u1");
        verify(tickets, never()).findById(anyString());
    }

    @Test void anotherAccountsTicketIsNotAccessible() throws Exception {
        mvc.perform(get("/api/support/tickets/other").with(user("customer"))).andExpect(status().isNotFound());
        mvc.perform(post("/api/support/tickets/other/messages").with(user("customer")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Forged reply\"}"))
                .andExpect(status().isNotFound());
        verify(tickets, never()).save(any());
    }

    @Test void writesRequireCsrfAndCannotForgeIdentityOrInternalNotes() throws Exception {
        String body = "{\"content\":\"My reply\",\"senderId\":\"op\",\"isInternalNote\":true}";
        mvc.perform(post("/api/support/tickets/t1/messages").with(user("customer"))
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/support/tickets/t1/messages").with(user("customer")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.messages[1].sender").value("USER"));
        verify(tickets).save(argThat(saved -> saved.getMessages().getLast().senderId().equals("u1")
                && !saved.getMessages().getLast().isInternalNote() && saved.getStatus() == SupportTicket.Status.OPEN));
    }

    @Test void suspendedAndUnverifiedAccountsAreDenied() throws Exception {
        customer.setValidated(false);
        mvc.perform(get("/api/support/tickets/t1").with(user("customer"))).andExpect(status().isForbidden());
        customer.setValidated(true); customer.setStatus(User.AccountStatus.BANNED);
        mvc.perform(get("/api/support/tickets/t1").with(user("customer"))).andExpect(status().isForbidden());
    }

    @Test void preferenceNeedsCsrfAndExplicitBooleanConsent() throws Exception {
        mvc.perform(patch("/api/newsletter/preference").with(user("customer"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"subscribed\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/newsletter/preference").with(user("customer")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/newsletter/preference").with(user("customer")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"subscribed\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.subscribed").value(true));
        verify(newsletter).setPreference(customer, true);
    }

    @Test void unsubscribeWorksWithoutALoginButDoesNotMutateOnGet() throws Exception {
        mvc.perform(post("/api/newsletter/unsubscribe").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"opaque-token\"}" )).andExpect(status().isOk());
        verify(newsletter).unsubscribe("opaque-token");
        mvc.perform(get("/api/newsletter/unsubscribe")).andExpect(status().isMethodNotAllowed());
    }
}
