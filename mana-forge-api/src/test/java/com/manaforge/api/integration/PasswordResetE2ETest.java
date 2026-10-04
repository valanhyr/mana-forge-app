package com.manaforge.api.integration;

import com.manaforge.api.model.mongo.PasswordReset;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.PasswordResetRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PasswordResetE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetRepository passwordResetRepository;

    @MockBean
    private EmailService emailService;

    @Captor
    ArgumentCaptor<String> toCaptor;
    @Captor
    ArgumentCaptor<String> subjectCaptor;
    @Captor
    ArgumentCaptor<String> bodyCaptor;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        passwordResetRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void fullPasswordResetFlow_capturesToken_and_resetsPassword() throws Exception {
        // create user
        User u = new User();
        u.setUsername("e2euser");
        u.setEmail("e2e@example.com");
        u.setName("E2E");
        u.setPassword("old");
        userRepository.save(u);

        // capture token sent in email via sendHtml
        final String[] capturedToken = new String[1];
        doAnswer(invocation -> {
            String body = invocation.getArgument(2, String.class);
            // extract token param from link
            int idx = body.indexOf("token=");
            if (idx >= 0) {
                String t = body.substring(idx + 6).split('"')[0];
                capturedToken[0] = t;
            }
            return null;
        }).when(emailService).sendHtml(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());

        // call forgot-password
        String url = "http://localhost:" + port + "/api/auth/forgot-password";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String,String>> req = new HttpEntity<>(Map.of("email","e2e@example.com"), headers);
        ResponseEntity<Void> resp = restTemplate.postForEntity(url, req, Void.class);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();

        // ensure token created in DB
        Thread.sleep(100); // give async emailService a moment
        assertThat(capturedToken[0]).isNotNull();

        // call reset endpoint with token
        String resetUrl = "http://localhost:" + port + "/api/auth/reset-password";
        HttpEntity<Map<String,String>> resetReq = new HttpEntity<>(Map.of("token", capturedToken[0], "password", "NewPass123!"), headers);
        ResponseEntity<Void> resetResp = restTemplate.postForEntity(resetUrl, resetReq, Void.class);
        assertThat(resetResp.getStatusCode().is2xxSuccessful()).isTrue();

        // verify user updated
        Optional<User> updated = userRepository.findByUsername("e2euser");
        assertThat(updated).isPresent();
        assertThat(updated.get().getPasswordChangedAt()).isNotNull();

        // verify password reset marked used
        PasswordReset pr = passwordResetRepository.findAll().stream().filter(p -> p.getUserId().equals(updated.get().getId())).findFirst().orElse(null);
        assertThat(pr).isNotNull();
        assertThat(pr.isUsed()).isTrue();
    }
}
