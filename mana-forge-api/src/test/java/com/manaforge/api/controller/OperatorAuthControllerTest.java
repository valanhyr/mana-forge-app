package com.manaforge.api.controller;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.frontdesk.FrontdeskOperator;
import com.manaforge.api.frontdesk.FrontdeskOperatorRepository;
import com.manaforge.api.frontdesk.OperatorAuthException;
import com.manaforge.api.frontdesk.OperatorAuthService;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import com.manaforge.api.frontdesk.OperatorSessionCookie;
import com.manaforge.api.frontdesk.OperatorSessionService;
import com.manaforge.api.service.FrontdeskAccessService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import jakarta.servlet.http.Cookie;
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OperatorAuthController.class)
@Import({SecurityConfig.class, FrontdeskAccessService.class})
@ActiveProfiles("test")
@TestPropertySource(properties = {"frontdesk.totp.key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "test.context=operator-auth-controller"})
class OperatorAuthControllerTest {
    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired MockMvc mvc;
    @MockitoBean OperatorAuthService auth;
    @MockitoBean OperatorSessionService sessions;
    @MockitoBean FrontdeskOperatorRepository operators;
    @MockitoBean OAuth2LoginSuccessHandler oauth;

    private final OperatorPrincipal principal = new OperatorPrincipal("op-1", "op@example.com");

    @BeforeEach
    void setUp() {
        FrontdeskOperator operator = new FrontdeskOperator();
        operator.setId("op-1");
        operator.setEmail("op@example.com");
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        when(operators.findById("op-1")).thenReturn(Optional.of(operator));
        when(sessions.create("op-1")).thenReturn(new OperatorSessionService.Issued("raw-session-token", Instant.now().plusSeconds(3600)));
    }

    @Test
    void passwordStepReturnsAChallengeAndNoCookieWithoutCsrfOrSession() throws Exception {
        when(auth.login("op@example.com", "pw")).thenReturn(new OperatorAuthService.Challenge("challenge-1", OperatorAuthService.ChallengeType.TOTP_REQUIRED));
        mvc.perform(post("/api/frontdesk/auth/login").contentType(JSON).content("{\"email\":\"op@example.com\",\"password\":\"pw\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("TOTP_REQUIRED"))
                .andExpect(jsonPath("$.challenge").value("challenge-1"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(header().doesNotExist("Set-Cookie"));
        verifyNoInteractions(sessions);
    }

    @Test
    void anyAuthenticationFailureIsAnEmptyUnauthorizedWithNoCookie() throws Exception {
        when(auth.login(any(), any())).thenThrow(new OperatorAuthException());
        mvc.perform(post("/api/frontdesk/auth/login").contentType(JSON).content("{\"email\":\"x@example.com\",\"password\":\"bad\"}"))
                .andExpect(status().isUnauthorized()).andExpect(content().string(""))
                .andExpect(header().doesNotExist("Set-Cookie"));
        when(auth.verifyTotp(any(), any())).thenThrow(new OperatorAuthException());
        mvc.perform(post("/api/frontdesk/auth/totp").contentType(JSON).content("{\"challenge\":\"c\",\"code\":\"000000\"}"))
                .andExpect(status().isUnauthorized()).andExpect(header().doesNotExist("Set-Cookie"));
        verifyNoInteractions(sessions);
    }

    @Test
    void secondFactorIssuesAHardenedSessionCookie() throws Exception {
        when(auth.verifyTotp("challenge-1", "287082")).thenReturn(principal);
        var result = mvc.perform(post("/api/frontdesk/auth/totp").contentType(JSON).content("{\"challenge\":\"challenge-1\",\"code\":\"287082\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("op-1"))
                .andExpect(jsonPath("$.name").value("op@example.com")).andExpect(jsonPath("$.role").value("OPERATOR"))
                .andReturn();
        String cookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(cookie).startsWith(OperatorSessionCookie.NAME + "=raw-session-token")
                .contains("HttpOnly").contains("Secure").contains("SameSite=Strict").contains("Path=/api/frontdesk");
        assertThat(result.getResponse().getContentAsString()).doesNotContain("raw-session-token");
    }

    @Test
    void aRecoveryCodeAlsoIssuesASession() throws Exception {
        when(auth.verifyRecovery("challenge-1", "AAAA-BBBB-CCCC-DDDD")).thenReturn(principal);
        mvc.perform(post("/api/frontdesk/auth/recovery").contentType(JSON).content("{\"challenge\":\"challenge-1\",\"code\":\"AAAA-BBBB-CCCC-DDDD\"}"))
                .andExpect(status().isOk()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.startsWith(OperatorSessionCookie.NAME + "=raw-session-token")));
    }

    @Test
    void enrollmentShowsTheSecretThenTheRecoveryCodesExactlyAtConfirmation() throws Exception {
        when(auth.startEnrollment("challenge-1")).thenReturn(new OperatorAuthService.EnrollmentStart("SECRET", "otpauth://totp/x"));
        mvc.perform(post("/api/frontdesk/auth/enroll/start").contentType(JSON).content("{\"challenge\":\"challenge-1\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.secret").value("SECRET"))
                .andExpect(jsonPath("$.otpauthUri").value("otpauth://totp/x")).andExpect(header().doesNotExist("Set-Cookie"));

        when(auth.confirmEnrollment("challenge-1", "287082")).thenReturn(new OperatorAuthService.EnrollmentResult(principal, List.of("AAAA-BBBB-CCCC-DDDD")));
        mvc.perform(post("/api/frontdesk/auth/enroll/confirm").contentType(JSON).content("{\"challenge\":\"challenge-1\",\"code\":\"287082\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.recoveryCodes[0]").value("AAAA-BBBB-CCCC-DDDD"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.startsWith(OperatorSessionCookie.NAME + "=raw-session-token")));
    }

    @Test
    void malformedRequestsNeverReachTheAuthService() throws Exception {
        mvc.perform(post("/api/frontdesk/auth/login").contentType(JSON).content("{\"email\":\" \",\"password\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/frontdesk/auth/totp").contentType(JSON).content("{}")).andExpect(status().isBadRequest());
        verifyNoInteractions(auth);
    }

    @Test
    void logoutRevokesTheSessionAndClearsTheCookie() throws Exception {
        when(sessions.authenticate("raw-session-token")).thenReturn(Optional.of(principal));
        var result = mvc.perform(post("/api/frontdesk/auth/logout").with(csrf())
                .cookie(new Cookie(OperatorSessionCookie.NAME, "raw-session-token")))
                .andExpect(status().isOk()).andReturn();
        verify(sessions).revoke("raw-session-token");
        assertThat(result.getResponse().getHeader("Set-Cookie")).startsWith(OperatorSessionCookie.NAME + "=;").contains("Max-Age=0");
    }

    @Test
    void logoutNeedsAnOperatorSessionAndCsrf() throws Exception {
        mvc.perform(post("/api/frontdesk/auth/logout").with(csrf())).andExpect(status().isUnauthorized());
        when(sessions.authenticate("raw-session-token")).thenReturn(Optional.of(principal));
        mvc.perform(post("/api/frontdesk/auth/logout").cookie(new Cookie(OperatorSessionCookie.NAME, "raw-session-token")))
                .andExpect(status().isForbidden());
        verify(sessions, never()).revoke(any());
    }
}
