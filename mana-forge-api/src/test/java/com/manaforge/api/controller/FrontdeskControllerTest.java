package com.manaforge.api.controller;

import java.util.List;
import java.util.Optional;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FrontdeskController.class)
@Import({SecurityConfig.class, FrontdeskAccessService.class})
@ActiveProfiles("test")
@TestPropertySource(properties = {"frontdesk.operator-ids=operator-id", "frontdesk.url=http://localhost:5174"})
class FrontdeskControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean UserRepository repository;
    @MockitoBean EmailEncryptionService encryption;
    @MockitoBean OAuth2LoginSuccessHandler oauth;
    @MockitoBean FrontdeskQueryService queries;
    @MockitoBean SupportTicketService tickets;
    @MockitoBean FrontdeskUserService users;
    @MockitoBean DirectusEmailTemplateService templates;
    @MockitoBean FrontdeskEmailService emails;
    @MockitoBean NewsletterService newsletter;
    @MockitoBean NewsletterCampaignService campaigns;
    private User operator;

    @BeforeEach
    void setUp() {
        operator = new User();
        operator.setId("operator-id");
        operator.setUsername("operator");
        operator.setValidated(true);
        when(repository.findByUsername("operator")).thenReturn(Optional.of(operator));
    }

    @Test
    void allBackofficeReadsArePrivate() throws Exception {
        for (String path : List.of("/me", "/csrf", "/users", "/users/u1", "/tickets", "/tickets/t1",
                "/audit", "/email-templates", "/emails", "/newsletter/subscribers", "/newsletter/campaigns", "/newsletter/campaigns/c1")) {
            mvc.perform(get("/api/frontdesk" + path)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/frontdesk" + path).with(user("ordinary").roles("OPERATOR")))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(queries, tickets, users, templates, emails, newsletter, campaigns);
    }

    @Test
    void allowlistedAccountCanReadWithoutAnOperatorAuthority() throws Exception {
        mvc.perform(get("/api/frontdesk/me").with(user("operator")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("operator-id"))
                .andExpect(jsonPath("$.role").value("OPERATOR"));
    }

    @Test
    void ticketCategoryAndPaginationAreForwardedToBackendQuery() throws Exception {
        mvc.perform(get("/api/frontdesk/tickets").with(user("operator"))
                .param("category", "ACCOUNT").param("page", "2").param("size", "25"))
                .andExpect(status().isOk());
        verify(queries).tickets(isNull(), isNull(), eq(com.manaforge.api.model.mongo.SupportTicket.Category.ACCOUNT),
                isNull(), isNull(), eq(2), eq(25));
    }

    @Test
    void suspendedOperatorCannotRead() throws Exception {
        operator.setStatus(User.AccountStatus.SUSPENDED);
        mvc.perform(get("/api/frontdesk/users").with(user("operator"))).andExpect(status().isForbidden());
        verifyNoInteractions(queries);
    }

    @Test
    void mutationsRequireCsrfEvenForOperators() throws Exception {
        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").with(user("operator")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(users);
        mvc.perform(get("/api/frontdesk/csrf").with(user("operator")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void csrfEndpointTokenWorksWithTheSameSession() throws Exception {
        var result = mvc.perform(get("/api/frontdesk/csrf").with(user("operator")))
                .andExpect(status().isOk()).andReturn();
        var json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString());
        var session = (org.springframework.mock.web.MockHttpSession) result.getRequest().getSession(false);
        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").with(user("operator"))
                .session(session).header(json.path("headerName").asText(), json.path("token").asText()))
                .andExpect(status().isOk());
        verify(users).resetQuota("u1", operator);
    }

    @Test
    void internalNoteUsesAuthenticatedActorNotRequestFields() throws Exception {
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(user("operator")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Investigating\",\"isInternalNote\":true}"))
                .andExpect(status().isOk());
        verify(tickets).addMessage(eq("t1"), eq(new AddMessage("Investigating", true)), same(operator));
    }

    @Test
    void blankMessageAndUnknownStatusAreRejected() throws Exception {
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(user("operator")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/frontdesk/users/u1/status").with(user("operator")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SUPERUSER\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(tickets, users);
    }

    @Test
    void ordinaryUserCannotMutateEvenWithCsrf() throws Exception {
        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").with(user("ordinary")).with(csrf()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(users);
    }

    @Test
    void auditHasNoClientWriteEndpoint() throws Exception {
        mvc.perform(post("/api/frontdesk/audit").with(user("operator")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void userResponseDoesNotExposeCredentials() throws Exception {
        when(users.get("u1")).thenReturn(new UserView("u1", "user@example.com", "customer", "ava1.jpg",
                User.Tier.FREE, null, null, User.AccountStatus.ACTIVE,
                new UserStats(0, 2, 25, "DAILY", null, null, null), List.of(), 0));
        mvc.perform(get("/api/frontdesk/users/u1").with(user("operator")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("user@example.com"))
                .andExpect(jsonPath("$.stats.aiQuotaPeriod").value("DAILY"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.verificationToken").doesNotExist());
    }

    @Test
    void configuredOriginCanPreflightCsrfHeader() throws Exception {
        mvc.perform(options("/api/frontdesk/emails").header("Origin", "http://localhost:5174")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "X-CSRF-TOKEN, Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }

    @Test
    void concurrentTicketChangeReturnsConflict() throws Exception {
        when(tickets.addMessage(anyString(), any(), any()))
                .thenThrow(new org.springframework.dao.OptimisticLockingFailureException("stale"));
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(user("operator")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Reply\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONCURRENT_UPDATE"));
    }
}
