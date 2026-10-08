package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import com.manaforge.api.service.TurnstileService;
import com.manaforge.api.service.SupportTicketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContactController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class ContactControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private TurnstileService turnstileService;

    @MockitoBean
    private SupportTicketService supportTicketService;

    @BeforeEach
    void resetTurnstile() {
        // Turnstile is off by default; each test opts into what it needs.
        when(turnstileService.isEnabled()).thenReturn(false);
    }

    /** Same payload as {@link #VALID_BODY} plus a render timestamp old enough to pass the speed check. */
    private String bodyWithRenderedAt(long renderedAt) {
        return """
                {
                  "name": "Ada Lovelace",
                  "email": "ada@example.com",
                  "subject": "general",
                  "message": "This is a valid test message.",
                  "formRenderedAt": %d
                }
                """.formatted(renderedAt);
    }

    private static final String VALID_BODY = """
            {
              "name": "Ada Lovelace",
              "email": "ada@example.com",
              "subject": "general",
              "message": "This is a valid test message."
            }
            """;

    @Test
    void submit_withValidBody_returns200() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY))
                .andExpect(status().isOk());
    }

    @Test
    void submit_isPublic_noAuthRequired() throws Exception {
        // No authentication set — must still return 200
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY))
                .andExpect(status().isOk());
    }

    @Test
    void submit_triggersConfirmationAndNotificationEmails() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY));

        verify(emailService).sendContactConfirmation(any());
        verify(emailService).sendContactNotification(any());
        verify(supportTicketService).createFromContact(any());
    }

    @Test
    void submit_withMissingName_returns400() throws Exception {
        String body = """
                {"email":"ada@example.com","subject":"general","message":"Long enough message here."}
                """;
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submit_withInvalidEmail_returns400() throws Exception {
        String body = """
                {"name":"Ada","email":"not-an-email","subject":"general","message":"Long enough message here."}
                """;
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submit_withMessageTooShort_returns400() throws Exception {
        String body = """
                {"name":"Ada","email":"ada@example.com","subject":"general","message":"Short"}
                """;
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submit_withEmptyBody_returns400() throws Exception {
        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── Anti-spam ────────────────────────────────────────────────────────────

    @Test
    void submit_withHoneypotFilled_returns403_andSendsNoEmail() throws Exception {
        String body = """
                {"name":"Bot","email":"bot@spam.example","subject":"other",
                 "message":"Buy cheap things at my site right now.","website":"http://spam.example"}
                """;

        mockMvc.perform(post("/api/contact")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORM_REJECTED"));

        verify(emailService, never()).sendContactNotification(any());
        verifyNoInteractions(supportTicketService);
        verify(emailService, never()).sendContactConfirmation(any());
    }

    @Test
    void submit_tooFast_returns403_andSendsNoEmail() throws Exception {
        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithRenderedAt(System.currentTimeMillis())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORM_REJECTED"));

        verify(emailService, never()).sendContactNotification(any());
        verifyNoInteractions(supportTicketService);
    }

    @Test
    void submit_withSlowButPlausibleTimestamp_isAccepted() throws Exception {
        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithRenderedAt(System.currentTimeMillis() - 5_000)))
                .andExpect(status().isOk());

        verify(emailService).sendContactNotification(any());
    }

    @Test
    void submit_withFutureTimestamp_isNotRejected() throws Exception {
        // A skewed client clock must not lock a real user out of the form.
        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyWithRenderedAt(System.currentTimeMillis() + 60_000)))
                .andExpect(status().isOk());
    }

    @Test
    void submit_whenTurnstileEnabledAndTokenValid_returns200() throws Exception {
        when(turnstileService.isEnabled()).thenReturn(true);
        when(turnstileService.verify(any(), any())).thenReturn(true);

        String body = """
                {"name":"Ada Lovelace","email":"ada@example.com","subject":"general",
                 "message":"This is a valid test message.","turnstileToken":"proof-token"}
                """;

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verify(emailService).sendContactNotification(any());
    }

    @Test
    void submit_whenTurnstileEnabledAndTokenInvalid_returns403_andSendsNoEmail() throws Exception {
        when(turnstileService.isEnabled()).thenReturn(true);
        when(turnstileService.verify(any(), any())).thenReturn(false);

        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("TURNSTILE_FAILED"));

        verify(emailService, never()).sendContactNotification(any());
    }

    @Test
    void submit_whenTurnstileDisabled_ignoresAMissingToken() throws Exception {
        // Failing closed only applies while the challenge is enabled; otherwise
        // every contact from an unconfigured deployment would be dropped.
        mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isOk());

        verify(emailService).sendContactNotification(any());
    }
}
