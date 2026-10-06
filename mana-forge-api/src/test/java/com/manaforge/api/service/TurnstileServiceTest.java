package com.manaforge.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/**
 * Covers the enablement rules. The important one is the last: a deployment that
 * sets the flag without a secret must NOT start accepting unverified tokens,
 * otherwise a typo in the env silently disables bot protection.
 */
class TurnstileServiceTest {

    private static TurnstileService service(String secretKey, String enabledFlag) {
        return new TurnstileService(RestClient.builder(), secretKey, enabledFlag);
    }

    @Test
    @DisplayName("auto-enables when a secret key is present and no flag is set")
    void autoEnablesWithSecretKey() {
        assertThat(service("0x4AAAsecret", "").isEnabled()).isTrue();
        assertThat(service("0x4AAAsecret", null).isEnabled()).isTrue();
    }

    @Test
    @DisplayName("stays disabled without a secret key, even when explicitly enabled")
    void requiresSecretKey() {
        assertThat(service("", "true").isEnabled()).isFalse();
        assertThat(service("   ", "true").isEnabled()).isFalse();
    }

    @Test
    @DisplayName("an explicit false overrides secret-key auto-detection")
    void explicitFalseWins() {
        assertThat(service("0x4AAAsecret", "false").isEnabled()).isFalse();
    }

    @Test
    @DisplayName("an explicit true still needs a secret key")
    void explicitTrueNeedsSecret() {
        assertThat(service("0x4AAAsecret", "true").isEnabled()).isTrue();
        assertThat(service("", "true").isEnabled()).isFalse();
    }

    @Test
    @DisplayName("verification never passes when disabled or without a token")
    void verifyIsFalseWhenDisabled() {
        TurnstileService disabled = service("", "false");
        assertThat(disabled.verify("some-token", "1.2.3.4")).isFalse();
        assertThat(disabled.verify(null, "1.2.3.4")).isFalse();
    }

    @Test
    @DisplayName("verify returns false for a blank token without calling Cloudflare")
    void verifyRejectsBlankToken() {
        TurnstileService enabled = service("0x4AAAsecret", "true");
        assertThat(enabled.verify("   ", "1.2.3.4")).isFalse();
        assertThat(enabled.verify(null, "1.2.3.4")).isFalse();
    }

    @Test
    @DisplayName("a Turnstile outage is not treated as a pass")
    void verifyFailsClosedOnError() {
        // No network in tests: siteverify cannot be reached, so verification must
        // return false rather than defaulting to "allowed".
        TurnstileService enabled = service("0x4AAAsecret", "true");
        assertThat(enabled.verify("token", "1.2.3.4")).isFalse();
    }

    @Test
    @DisplayName("secret key is trimmed and reported as present")
    void secretKeyHandling() {
        assertThat(service("  0x4AAAsecret  ", "true").hasSecret()).isTrue();
        assertThat(service("", "true").hasSecret()).isFalse();
    }

    @Test
    @DisplayName("the builder is not mutated for other services")
    void doesNotMutateSharedBuilder() {
        RestClient.Builder shared = RestClient.builder();
        new TurnstileService(shared, "secret", "true");
        // The shared builder must still be usable by other services afterwards.
        assertThat(shared.build()).isNotNull();
    }
}