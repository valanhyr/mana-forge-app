package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.mongo.Feedback;
import com.manaforge.api.repository.FeedbackRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FeedbackController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeedbackRepository feedbackRepository;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @MockitoBean
    private UserRepository userRepository;

    private UsernamePasswordAuthenticationToken mockAuth() {
        return new UsernamePasswordAuthenticationToken(
                "testuser", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private static final String VALID_BODY = """
            {"category":"BUG","summary":"Test bug","description":"Detailed description"}
            """;

    @Test
    void submitFeedback_withAuth_returns200() throws Exception {
        mockMvc.perform(post("/api/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .with(authentication(mockAuth())))
                .andExpect(status().isOk());
    }

    @Test
    void submitFeedback_savesFeedbackToRepository() throws Exception {
        mockMvc.perform(post("/api/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .with(authentication(mockAuth())));

        verify(feedbackRepository).save(any(Feedback.class));
    }

    @Test
    void submitFeedback_capturesUserAgent() throws Exception {
        ArgumentCaptor<Feedback> captor = ArgumentCaptor.forClass(Feedback.class);

        mockMvc.perform(post("/api/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY)
                .header("User-Agent", "TestBrowser/2.0")
                .with(authentication(mockAuth())));

        verify(feedbackRepository).save(captor.capture());
        assertThat(captor.getValue().getUserAgent()).isEqualTo("TestBrowser/2.0");
    }

    @Test
    void submitFeedback_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/feedback")
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_BODY))
                .andExpect(status().isUnauthorized());
    }
}
