package com.manaforge.api.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manaforge.api.repository.DeckRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Full-stack integration test for the deck CRUD flow.
 *
 * Pre-conditions (applied separately):
 *  - MongoConfig must have @Profile("!test") so Flapdoodle provides the embedded MongoDB.
 *  - CacheConfig is satisfied by the mocked RedisConnectionFactory below.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DeckFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DeckRepository deckRepository;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private ScryfallService scryfallService;

    @MockitoBean
    private AiService aiService;

    @MockitoBean
    private StrapiService strapiService;

    @MockitoBean
    private FormatService formatService;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private CardBulkLoadService cardBulkLoadService;

    // Satisfies CacheConfig.cacheManager(RedisConnectionFactory) without connecting to Redis.
    @MockitoBean
    private RedisConnectionFactory redisConnectionFactory;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        deckRepository.deleteAll();
        userRepository.deleteAll();
        when(scryfallService.getCardById(any())).thenReturn(Map.of("colors", java.util.List.of("R")));
    }

    @Test
    void fullDeckCrudFlow_registerVerifyLoginCreateDeleteVerifyGone() throws Exception {
        // Step 1: Register a new user
        String registerBody = """
                {
                    "name": "Integration Tester",
                    "username": "integtest",
                    "password": "pass1234",
                    "email": "integtest@example.com"
                }
                """;

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody))
                .andExpect(status().is2xxSuccessful());

        // Capture the verification token from the email service mock
        ArgumentCaptor<com.manaforge.api.model.mongo.User> userCaptor =
                ArgumentCaptor.forClass(com.manaforge.api.model.mongo.User.class);
        verify(emailService, atLeastOnce()).sendVerificationEmail(userCaptor.capture());
        String verificationToken = userCaptor.getValue().getVerificationToken();
        assertThat(verificationToken).isNotBlank();

        // Step 2: Verify email
        mockMvc.perform(get("/api/users/verify").param("token", verificationToken))
                .andExpect(status().isOk());

        // Step 3: Login and capture session
        String loginBody = "{\"username\":\"integtest\",\"password\":\"pass1234\"}";
        MvcResult loginResult = mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) loginResult.getRequest().getSession(false);
        assertThat(session).isNotNull();

        // Step 4: Create a deck (authenticated via session)
        String createDeckBody = """
                {
                    "name": "Integration Test Deck",
                    "formatId": "fmt-premodern",
                    "cards": [],
                    "private": false
                }
                """;

        MvcResult createResult = mockMvc.perform(post("/api/decks")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createDeckBody))
                .andExpect(status().isOk())
                .andReturn();

        String createResponse = createResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> createdDeck = objectMapper.readValue(createResponse, Map.class);
        String deckId = (String) createdDeck.get("id");
        assertThat(deckId).isNotBlank();

        // Step 5: GET /api/decks/{id} — verify deck was saved
        mockMvc.perform(get("/api/decks/" + deckId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Integration Test Deck"));

        // Step 6: DELETE /api/decks/{id} (authenticated)
        mockMvc.perform(delete("/api/decks/" + deckId)
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk());

        // Step 7: GET /api/decks/{id} after delete — expect 404
        mockMvc.perform(get("/api/decks/" + deckId))
                .andExpect(status().isNotFound());
    }
}
