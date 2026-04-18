package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
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
}
