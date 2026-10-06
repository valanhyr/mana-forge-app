package com.manaforge.api.service;

import java.time.Duration;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Verifies Cloudflare Turnstile tokens.
 *
 * Turnstile is the first line of defence for the public AI analysis endpoint:
 * it is free, invisible to legitimate users, and filters out the bulk of
 * automated traffic before a request ever reaches the AI provider.
 *
 * IMPORTANT: the browser-side widget only proves "a human-ish interaction
 * happened". The token is worthless unless verified server-side, which is what
 * this service does. Callers must treat {@link #isEnabled()} == false as
 * "verification unavailable" and decide explicitly whether to fail open.
 */
@Service
public class TurnstileService {

    private static final Logger logger = LoggerFactory.getLogger(TurnstileService.class);

    /** Siteverify must be fast; a slow challenge should not hold a request open. */
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final RestClient restClient;
    private final boolean enabled;
    private final String secretKey;

    public TurnstileService(
            RestClient.Builder builder,
            @Value("${cloudflare.turnstile.secret-key:}") String secretKey,
            @Value("${cloudflare.turnstile.enabled:}") String enabledFlag) {
        this.secretKey = secretKey == null ? "" : secretKey.trim();

        // An explicit flag wins; an empty flag auto-enables whenever a secret is
        // configured, so production is protected by default. Either way a secret
        // is mandatory: a half-configured deployment must not silently accept
        // unverified tokens.
        boolean requested = enabledFlag == null || enabledFlag.isBlank()
                ? !this.secretKey.isEmpty()
                : Boolean.parseBoolean(enabledFlag.trim());
        this.enabled = requested && !this.secretKey.isEmpty();

        // NOTE: a dedicated client, not the shared builder — that one carries a
        // baseUrl pointing at Directus and short timeouts meant for CMS calls.
        this.restClient = builder
                .clone()
                .requestFactory(turnstileRequestFactory())
                .build();

        if (requested && this.secretKey.isEmpty()) {
            logger.warn("Cloudflare Turnstile is enabled but no secret key is configured. "
                    + "Anonymous AI analysis will be rejected until cloudflare.turnstile.secret-key is set.");
        }
        logger.info("Cloudflare Turnstile: {}", this.enabled ? "enabled" : "disabled");
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Verifies a token against the siteverify endpoint.
     *
     * @param token     the {@code cf-turnstile-response} value from the client
     * @param remoteIp  caller IP, optional but lets Cloudflare score better
     * @return true when Cloudflare reports the token as valid
     */
    public boolean verify(String token, String remoteIp) {
        if (!enabled) return false;
        if (token == null || token.isBlank()) return false;

        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secretKey);
            form.add("response", token.trim());
            if (remoteIp != null && !remoteIp.isBlank()) {
                form.add("remoteip", remoteIp.trim());
            }

            Map<String, Object> response = restClient.post()
                    .uri("https://challenges.cloudflare.com/turnstile/v0/siteverify")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                logger.warn("Turnstile siteverify returned an empty body");
                return false;
            }

            boolean success = Boolean.TRUE.equals(response.get("success"));
            if (!success) {
                String codes = String.valueOf(response.get("error-codes"));
                logger.info("Turnstile verification rejected. codes={}", codes);
            }
            return success;
        } catch (Exception e) {
            // A Turnstile outage must not become an outage of the whole product,
            // but it also must not be treated as a pass.
            logger.error("Turnstile verification failed: {}", e.getMessage());
            return false;
        }
    }

    /** Exposed for tests / health checks. */
    public boolean hasSecret() {
        return !secretKey.isEmpty();
    }

    private static SimpleClientHttpRequestFactory turnstileRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) TIMEOUT.toMillis());
        factory.setReadTimeout((int) TIMEOUT.toMillis());
        return factory;
    }
}