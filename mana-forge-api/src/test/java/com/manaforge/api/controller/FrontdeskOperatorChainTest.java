package com.manaforge.api.controller;

import java.util.Optional;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.frontdesk.FrontdeskOperator;
import com.manaforge.api.frontdesk.FrontdeskOperatorRepository;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import com.manaforge.api.frontdesk.OperatorSessionCookie;
import com.manaforge.api.frontdesk.OperatorSessionService;
import com.manaforge.api.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Exercises the real operator cookie filter and the session-derived CSRF token. Kept apart from
 * FrontdeskControllerTest on purpose: its csrf() post-processor permanently swaps the CSRF repository
 * of a shared Spring context, and the distinct property below gives this class its own context.
 */
@WebMvcTest(FrontdeskController.class)
@Import({SecurityConfig.class, FrontdeskAccessService.class})
@ActiveProfiles("test")
@TestPropertySource(properties = {"frontdesk.url=http://localhost:5174", "test.context=operator-cookie-chain"})
class FrontdeskOperatorChainTest {
    private static final String TOKEN_HEADER = "X-CSRF-TOKEN";

    @Autowired MockMvc mvc;
    @MockitoBean OperatorSessionService sessions;
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

    private final OperatorPrincipal principal = new OperatorPrincipal("op-1", "op@example.com");

    private Cookie session(String token) {
        return new Cookie(OperatorSessionCookie.NAME, token);
    }

    @BeforeEach
    void setUp() {
        FrontdeskOperator operator = new FrontdeskOperator();
        operator.setId("op-1");
        operator.setEmail("op@example.com");
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        when(operators.findById("op-1")).thenReturn(Optional.of(operator));
        when(sessions.authenticate("good")).thenReturn(Optional.of(principal));
        when(sessions.authenticate("other")).thenReturn(Optional.of(principal));
    }

    @Test
    void aValidOperatorCookieAuthenticatesBackofficeRequests() throws Exception {
        mvc.perform(get("/api/frontdesk/me").cookie(session("good")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("op-1"))
                .andExpect(jsonPath("$.name").value("op@example.com"));
    }

    @Test
    void missingUnknownOrRevokedCookiesAreUnauthorized() throws Exception {
        mvc.perform(get("/api/frontdesk/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/frontdesk/me").cookie(session("revoked"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/frontdesk/users").cookie(session("revoked"))).andExpect(status().isUnauthorized());
        verifyNoInteractions(queries, users);
    }

    @Test
    void aPublicUserSessionOrForeignCookiesNeverOpenTheBackoffice() throws Exception {
        mvc.perform(get("/api/frontdesk/me").with(user("op-1").roles("FRONTDESK_OPERATOR"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/frontdesk/me").cookie(new Cookie("JSESSIONID", "good"), new Cookie("SESSION", "good")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theBackofficeNeverCreatesAServletSession() throws Exception {
        var result = mvc.perform(get("/api/frontdesk/csrf").cookie(session("good"))).andExpect(status().isOk()).andReturn();
        org.assertj.core.api.Assertions.assertThat(result.getRequest().getSession(false)).isNull();
    }

    @Test
    void mutationsNeedTheTokenDerivedFromTheSameSessionCookie() throws Exception {
        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").cookie(session("good"))).andExpect(status().isForbidden());
        verifyNoInteractions(users);

        var result = mvc.perform(get("/api/frontdesk/csrf").cookie(session("good"))).andExpect(status().isOk()).andReturn();
        var json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString());
        org.assertj.core.api.Assertions.assertThat(json.path("headerName").asText()).isEqualTo(TOKEN_HEADER);

        mvc.perform(post("/api/frontdesk/users/u1/ai-quota/reset").cookie(session("good"))
                .header(TOKEN_HEADER, json.path("token").asText())).andExpect(status().isOk());
        verify(users).resetQuota("u1", principal);

        // A valid operator in a different session cannot reuse this session's token.
        mvc.perform(post("/api/frontdesk/users/u2/ai-quota/reset").cookie(session("other"))
                .header(TOKEN_HEADER, json.path("token").asText())).andExpect(status().isForbidden());
        verify(users, never()).resetQuota(eq("u2"), any());
    }

    @Test
    void anOperatorSessionDoesNotAuthenticateTheRestOfThePublicApi() throws Exception {
        mvc.perform(post("/api/support/tickets").cookie(session("good"))).andExpect(status().is4xxClientError());
        verify(sessions, never()).authenticate(any());
    }
}
