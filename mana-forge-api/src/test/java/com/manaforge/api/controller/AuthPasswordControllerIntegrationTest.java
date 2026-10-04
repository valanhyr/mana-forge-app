package com.manaforge.api.controller;

import com.manaforge.api.service.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthPasswordController.class)
@Import(com.manaforge.api.config.SecurityConfig.class)
@org.springframework.test.context.ActiveProfiles("test")
class AuthPasswordControllerIntegrationTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    PasswordResetService passwordResetService;

    @MockitoBean
    com.manaforge.api.service.OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Test
    void forgotPassword_returns200_and_calls_service() throws Exception {
        String body = "{\"email\":\"me@example.com\"}";
        mvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("testuser").roles("USER")))
                .andExpect(status().isOk());

        Mockito.verify(passwordResetService).createPasswordResetForEmail(eq("me@example.com"));
    }

    @Test
    void resetPassword_success_returns200() throws Exception {
        String body = "{\"token\":\"tkn\",\"password\":\"NewP@ssw0rd\"}";
        mvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("testuser").roles("USER")))
                .andExpect(status().isOk());
        Mockito.verify(passwordResetService).consumeTokenAndResetPassword(eq("tkn"), eq("NewP@ssw0rd"));
    }

    @Test
    void resetPassword_invalidToken_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Invalid or expired token")).when(passwordResetService).consumeTokenAndResetPassword(eq("bad"), eq("p"));
        String body = "{\"token\":\"bad\",\"password\":\"p\"}";
        mvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("testuser").roles("USER")))
                .andExpect(status().isBadRequest());
    }
}
