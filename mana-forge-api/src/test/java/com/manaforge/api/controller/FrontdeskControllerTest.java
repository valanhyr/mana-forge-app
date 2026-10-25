package com.manaforge.api.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.dto.FrontdeskDtos.*;
import com.manaforge.api.frontdesk.FrontdeskOperator;
import com.manaforge.api.frontdesk.FrontdeskOperatorRepository;
import com.manaforge.api.frontdesk.OperatorAuthenticationToken;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
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
@TestPropertySource(properties = {"frontdesk.url=http://localhost:5174"})
class FrontdeskControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean FrontdeskOperatorRepository operators;
    @MockitoBean OAuth2LoginSuccessHandler oauth;
    @MockitoBean FrontdeskQueryService queries;
    @MockitoBean SupportTicketService tickets;
    @MockitoBean FrontdeskUserService users;
    @MockitoBean DirectusEmailTemplateService templates;
    @MockitoBean FrontdeskEmailService emails;
    @MockitoBean NewsletterService newsletter;
    @MockitoBean NewsletterCampaignService campaigns;
    @MockitoBean AnnouncementService announcementRecipients;
    @MockitoBean AnnouncementCampaignService announcements;
    private FrontdeskOperator operator;
    private final OperatorPrincipal principal = new OperatorPrincipal("operator-id", "operator@example.com");

    private RequestPostProcessor operatorAuth() {
        return authentication(new OperatorAuthenticationToken(principal));
    }

    @BeforeEach
    void setUp() {
        operator = new FrontdeskOperator();
        operator.setId("operator-id");
        operator.setEmail("operator@example.com");
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        when(operators.findById("operator-id")).thenReturn(Optional.of(operator));
    }

    @Test
    void allBackofficeReadsArePrivate() throws Exception {
        for (String path : List.of("/me", "/csrf", "/users", "/users/u1", "/tickets", "/tickets/t1",
                "/audit", "/email-templates", "/emails", "/newsletter/subscribers", "/newsletter/campaigns", "/newsletter/campaigns/c1",
                "/announcements/recipients", "/announcements", "/announcements/c1")) {
            mvc.perform(get("/api/frontdesk" + path)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/frontdesk" + path).with(user("ordinary").roles("OPERATOR")))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(queries, tickets, users, templates, emails, newsletter, campaigns, announcementRecipients, announcements);
    }

    @Test
    void announcementWritesRequireAnOperatorAndCsrf() throws Exception {
        String body = "{\"campaignId\":\"d011e05b-f0aa-4af8-bacb-aa06347844e2\",\"recipientIds\":[\"u1\"],\"subject\":\"Notice\",\"body\":\"Body\"}";
        mvc.perform(post("/api/frontdesk/announcements").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/frontdesk/announcements").with(operatorAuth())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/frontdesk/announcements").with(user("ordinary")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        verifyNoInteractions(announcements);
    }

    @Test
    void announcementRecipientsAndCampaignsAreForwardedWithTheAuthenticatedOperator() throws Exception {
        when(announcementRecipients.recipients("ali", User.Tier.PRO, 1, 10))
                .thenReturn(new PageResult<>(List.of(new AnnouncementService.Recipient("u1", "alice", "alice@example.com", User.Tier.PRO)), 1, 10, 11));
        mvc.perform(get("/api/frontdesk/announcements/recipients").with(operatorAuth())
                .param("query", "ali").param("tier", "PRO").param("page", "1").param("size", "10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].email").value("alice@example.com"))
                .andExpect(jsonPath("$.total").value(11));
        var campaign = new com.manaforge.api.dto.AnnouncementDtos.Campaign("d011e05b-f0aa-4af8-bacb-aa06347844e2",
                com.manaforge.api.model.mongo.AnnouncementCampaign.State.RUNNING, 1, 0, 0, 0);
        when(announcements.start(any(), any())).thenReturn(campaign);
        mvc.perform(post("/api/frontdesk/announcements").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"campaignId\":\"d011e05b-f0aa-4af8-bacb-aa06347844e2\",\"recipientIds\":[\"u1\"],\"subject\":\"Notice\",\"body\":\"Body\",\"operatorId\":\"forged\"}"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.state").value("RUNNING"));
        verify(announcements).start(argThat(request -> request.recipientIds().equals(List.of("u1"))), eq(principal));
        mvc.perform(get("/api/frontdesk/announcements/c1").with(operatorAuth())).andExpect(status().isOk());
        verify(announcements).get("c1");
        mvc.perform(get("/api/frontdesk/announcements").with(operatorAuth()).param("page", "2").param("size", "5"))
                .andExpect(status().isOk());
        verify(announcements).list(2, 5);
    }

    @Test
    void announcementRequestsAreValidatedBeforeTheService() throws Exception {
        String ids = "[\"" + String.join("\",\"", java.util.Collections.nCopies(101, "u")) + "\"]";
        for (String body : List.of(
                "{\"campaignId\":\"not-a-uuid\",\"recipientIds\":[\"u1\"],\"subject\":\"S\",\"body\":\"B\"}",
                "{\"campaignId\":\"d011e05b-f0aa-4af8-bacb-aa06347844e2\",\"recipientIds\":[],\"subject\":\"S\",\"body\":\"B\"}",
                "{\"campaignId\":\"d011e05b-f0aa-4af8-bacb-aa06347844e2\",\"recipientIds\":" + ids + ",\"subject\":\"S\",\"body\":\"B\"}",
                "{\"campaignId\":\"d011e05b-f0aa-4af8-bacb-aa06347844e2\",\"recipientIds\":[\"u1\"],\"subject\":\" \",\"body\":\"B\"}")) {
            mvc.perform(post("/api/frontdesk/announcements").with(operatorAuth()).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(announcements);
    }

    @Test
    void operatorSessionCanReadItsOwnIdentity() throws Exception {
        mvc.perform(get("/api/frontdesk/me").with(operatorAuth()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("operator-id"))
                .andExpect(jsonPath("$.name").value("operator@example.com"))
                .andExpect(jsonPath("$.role").value("OPERATOR"));
    }

    @Test
    void aPublicUserSessionIsNeverAnOperatorEvenIfItsNameMatchesAnOperatorId() throws Exception {
        mvc.perform(get("/api/frontdesk/me").with(user("operator-id").roles("FRONTDESK_OPERATOR")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/frontdesk/users").with(user("operator-id"))).andExpect(status().isForbidden());
        verifyNoInteractions(queries, users);
    }

    @Test
    void ticketCategoryAndPaginationAreForwardedToBackendQuery() throws Exception {
        mvc.perform(get("/api/frontdesk/tickets").with(operatorAuth())
                .param("category", "ACCOUNT").param("page", "2").param("size", "25"))
                .andExpect(status().isOk());
        verify(queries).tickets(isNull(), isNull(), eq(com.manaforge.api.model.mongo.SupportTicket.Category.ACCOUNT),
                isNull(), isNull(), eq(2), eq(25));
    }

    @Test
    void templateListForwardsAcceptLanguageAndPreservesTheResponseContract() throws Exception {
        when(templates.list("es-ES,es;q=0.9")).thenReturn(List.of(
                new EmailTemplate("tpl1", "Reply", "SUPPORT", "Hola", "Buenas", List.of("user.name"))));
        mvc.perform(get("/api/frontdesk/email-templates").with(operatorAuth())
                .header("Accept-Language", "es-ES,es;q=0.9"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].subject").value("Hola"))
                .andExpect(jsonPath("$[0].bodyTemplate").value("Buenas"))
                .andExpect(jsonPath("$[0].availableMacros[0]").value("user.name"));
        verify(templates).list("es-ES,es;q=0.9");
    }

    @Test
    void templateListWithoutLanguageUsesTheServiceDefault() throws Exception {
        mvc.perform(get("/api/frontdesk/email-templates").with(operatorAuth()))
                .andExpect(status().isOk());
        verify(templates).list(null);
    }

    @Test
    void templateRenderForwardsLanguageAndVariables() throws Exception {
        when(templates.render("tpl1", Map.of("user.name", "Cliente"), "es"))
                .thenReturn(new RenderedTemplate("Hola Cliente", "Buenas Cliente"));
        mvc.perform(post("/api/frontdesk/email-templates/tpl1/render").with(operatorAuth()).with(csrf())
                .header("Accept-Language", "es").contentType(MediaType.APPLICATION_JSON)
                .content("{\"variables\":{\"user.name\":\"Cliente\"}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.subject").value("Hola Cliente"))
                .andExpect(jsonPath("$.body").value("Buenas Cliente"));
        verify(templates).render("tpl1", Map.of("user.name", "Cliente"), "es");
    }

    @Test
    void suspendedOperatorCannotRead() throws Exception {
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        mvc.perform(get("/api/frontdesk/users").with(operatorAuth())).andExpect(status().isForbidden());
        verifyNoInteractions(queries);
    }

    @Test
    void mutationsRequireCsrfEvenForOperators() throws Exception {
        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").with(operatorAuth()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(users);
        mvc.perform(get("/api/frontdesk/csrf").with(operatorAuth()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void internalNoteUsesAuthenticatedActorNotRequestFields() throws Exception {
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Investigating\",\"isInternalNote\":true}"))
                .andExpect(status().isOk());
        verify(tickets).addMessage(eq("t1"), eq(new AddMessage("Investigating", true)), eq(principal));
    }

    @Test
    void blankMessageAndUnknownStatusAreRejected() throws Exception {
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\" \"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/frontdesk/users/u1/status").with(operatorAuth()).with(csrf())
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
        mvc.perform(post("/api/frontdesk/audit").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void userResponseDoesNotExposeCredentials() throws Exception {
        when(users.get("u1")).thenReturn(new UserView("u1", "user@example.com", "customer", "ava1.jpg",
                User.Tier.FREE, null, null, User.AccountStatus.ACTIVE,
                new UserStats(0, 2, 25, "DAILY", null, null, null), List.of(), 0, null));
        mvc.perform(get("/api/frontdesk/users/u1").with(operatorAuth()))
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
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Reply\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONCURRENT_UPDATE"));
    }

    @Test
    void channelConflictIsNotAnOperatorAccessFailure() throws Exception {
        when(tickets.addMessage(anyString(), any(), any())).thenThrow(new WebChannelUnavailableException());
        mvc.perform(post("/api/frontdesk/tickets/t1/messages").with(operatorAuth()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Reply\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("WEB_CHANNEL_UNAVAILABLE"));
    }
}
