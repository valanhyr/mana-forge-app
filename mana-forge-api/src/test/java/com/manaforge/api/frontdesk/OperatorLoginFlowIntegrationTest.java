package com.manaforge.api.frontdesk;

import java.time.Instant;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Real stack (embedded Mongo, real filters, real cookies): password, TOTP, session cookie,
 * derived CSRF, logout, lockout and revocation, with no test-injected authentication.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {"spring.redis.host=localhost", "spring.redis.port=6380",
        "frontdesk.totp.key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
class OperatorLoginFlowIntegrationTest {
    private static final String SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    private static final String PASSWORD = "a long unique operator passphrase";
    private static final String COOKIE = OperatorSessionCookie.NAME;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FrontdeskOperatorRepository operators;
    @Autowired FrontdeskOperatorSessionRepository sessions;
    @Autowired FrontdeskLoginChallengeRepository challenges;
    @Autowired TotpSecretCipher cipher;
    @MockitoBean ScryfallService scryfallService;
    @MockitoBean AiService aiService;
    @MockitoBean ContentService contentService;
    @MockitoBean FormatService formatService;
    @MockitoBean EmailService emailService;
    @MockitoBean CardBulkLoadService cardBulkLoadService;

    private FrontdeskOperator operator;

    @BeforeEach
    void setUp() {
        operators.deleteAll();
        sessions.deleteAll();
        challenges.deleteAll();
        operator = new FrontdeskOperator();
        operator.setId("op-flow");
        operator.setEmail("owner@example.com");
        operator.setPasswordHash(new BCryptPasswordEncoder(4).encode(PASSWORD));
        operator.setStatus(FrontdeskOperator.Status.ACTIVE);
        operator.setTotpEnabled(true);
        operator.setTotpSecretEncrypted(cipher.encrypt(SECRET));
        operator.setCreatedAt(Instant.now());
        operators.save(operator);
    }

    private String totpNow() {
        return new TotpService().codeAt(SECRET, Instant.now());
    }

    private String body(String... pairs) throws Exception {
        var node = json.createObjectNode();
        for (int i = 0; i < pairs.length; i += 2) node.put(pairs[i], pairs[i + 1]);
        return json.writeValueAsString(node);
    }

    private String loginChallenge(String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/frontdesk/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body("email", "owner@example.com", "password", password))).andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).path("challenge").asText();
    }

    private Cookie signIn() throws Exception {
        MvcResult result = mvc.perform(post("/api/frontdesk/auth/totp").contentType(MediaType.APPLICATION_JSON)
                .content(body("challenge", loginChallenge(PASSWORD), "code", totpNow()))).andExpect(status().isOk()).andReturn();
        Cookie cookie = result.getResponse().getCookie(COOKIE);
        assertThat(cookie).isNotNull();
        return cookie;
    }

    @Test
    void fullSignInUseAndSignOutFlow() throws Exception {
        mvc.perform(get("/api/frontdesk/me")).andExpect(status().isUnauthorized());

        MvcResult login = mvc.perform(post("/api/frontdesk/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body("email", "owner@example.com", "password", PASSWORD)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("TOTP_REQUIRED")).andReturn();
        assertThat(login.getResponse().getCookie(COOKIE)).as("the password alone never grants a session").isNull();
        String challenge = json.readTree(login.getResponse().getContentAsString()).path("challenge").asText();
        mvc.perform(get("/api/frontdesk/me")).andExpect(status().isUnauthorized());

        MvcResult totp = mvc.perform(post("/api/frontdesk/auth/totp").contentType(MediaType.APPLICATION_JSON)
                .content(body("challenge", challenge, "code", totpNow()))).andExpect(status().isOk()).andReturn();
        Cookie cookie = totp.getResponse().getCookie(COOKIE);
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/frontdesk");
        assertThat(totp.getResponse().getHeader("Set-Cookie")).contains("SameSite=Strict");
        assertThat(sessions.count()).isEqualTo(1);
        assertThat(sessions.findById(cookie.getValue())).as("only the hash is stored").isEmpty();

        mvc.perform(get("/api/frontdesk/me").cookie(cookie)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("op-flow")).andExpect(jsonPath("$.name").value("owner@example.com"));

        String ticket = """
                {"userEmail":"customer@example.com","userName":"Customer","subject":"Help",
                "category":"ACCOUNT","priority":"MEDIUM","initialMessage":"Initial support message"}
                """;
        mvc.perform(post("/api/frontdesk/tickets").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(ticket))
                .andExpect(status().isForbidden());
        JsonNode csrf = json.readTree(mvc.perform(get("/api/frontdesk/csrf").cookie(cookie)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/frontdesk/tickets").cookie(cookie).header(csrf.path("headerName").asText(), csrf.path("token").asText())
                .contentType(MediaType.APPLICATION_JSON).content(ticket)).andExpect(status().isCreated());

        mvc.perform(post("/api/frontdesk/auth/logout").cookie(cookie).header(csrf.path("headerName").asText(), csrf.path("token").asText()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/frontdesk/me").cookie(cookie)).andExpect(status().isUnauthorized());
        assertThat(sessions.count()).isZero();
    }

    @Test
    void aTotpCodeCannotBeReplayedEvenWithANewPasswordStep() throws Exception {
        String code = totpNow();
        mvc.perform(post("/api/frontdesk/auth/totp").contentType(MediaType.APPLICATION_JSON)
                .content(body("challenge", loginChallenge(PASSWORD), "code", code))).andExpect(status().isOk());
        mvc.perform(post("/api/frontdesk/auth/totp").contentType(MediaType.APPLICATION_JSON)
                .content(body("challenge", loginChallenge(PASSWORD), "code", code))).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordsLockTheAccountEvenForTheRightOne() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/frontdesk/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content(body("email", "owner@example.com", "password", "wrong-" + i))).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/frontdesk/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body("email", "owner@example.com", "password", PASSWORD)))
                .andExpect(status().isUnauthorized()).andExpect(content().string(""));
        assertThat(operators.findById("op-flow").orElseThrow().getLockedUntil()).isNotNull();
    }

    @Test
    void disablingTheOperatorEndsAnOpenSessionImmediately() throws Exception {
        Cookie cookie = signIn();
        mvc.perform(get("/api/frontdesk/me").cookie(cookie)).andExpect(status().isOk());
        operator = operators.findById("op-flow").orElseThrow();
        operator.setStatus(FrontdeskOperator.Status.DISABLED);
        operators.save(operator);
        mvc.perform(get("/api/frontdesk/me").cookie(cookie)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/frontdesk/users").cookie(cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void aForgedOrUnknownCookieGivesNothing() throws Exception {
        mvc.perform(get("/api/frontdesk/me").cookie(new Cookie(COOKIE, "forged"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/frontdesk/audit").cookie(new Cookie("JSESSIONID", "anything"))).andExpect(status().isUnauthorized());
    }
}
