package com.manaforge.api.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailEncryptionServiceTest {

    // manaforge-test-key-32-bytes-1234 (32 bytes) Base64-encoded
    private static final String TEST_KEY = "bWFuYWZvcmdlLXRlc3Qta2V5LTMyLWJ5dGVzLTEyMzQ=";

    private EmailEncryptionService service;

    @BeforeEach
    void setUp() {
        service = new EmailEncryptionService(TEST_KEY);
    }

    @Test
    void encrypt_thenDecrypt_returnsOriginalEmail() {
        String plain = "user@example.com";
        assertThat(service.decrypt(service.encrypt(plain))).isEqualTo(plain);
    }

    @Test
    void encrypt_isDeterministic_sameInputProducesSameOutput() {
        String plain = "deterministic@test.com";
        assertThat(service.encrypt(plain)).isEqualTo(service.encrypt(plain));
    }

    @Test
    void encrypt_differentEmails_produceDifferentCiphertexts() {
        assertThat(service.encrypt("alice@example.com"))
                .isNotEqualTo(service.encrypt("bob@example.com"));
    }

    @Test
    void encrypt_outputDoesNotContainAtSign() {
        String encrypted = service.encrypt("user@example.com");
        assertThat(encrypted).doesNotContain("@");
    }

    @Test
    void encrypt_null_returnsNull() {
        assertThat(service.encrypt(null)).isNull();
    }

    @Test
    void encrypt_emptyString_returnsEmpty() {
        assertThat(service.encrypt("")).isEmpty();
    }

    @Test
    void decrypt_null_returnsNull() {
        assertThat(service.decrypt(null)).isNull();
    }

    @Test
    void decrypt_emptyString_returnsEmpty() {
        assertThat(service.decrypt("")).isEmpty();
    }

    @Test
    void decrypt_invalidBase64_throwsRuntimeException() {
        assertThatThrownBy(() -> service.decrypt("not-valid-base64!!!"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email decryption failed");
    }

    @Test
    void constructor_withInvalidKeyLength_throwsIllegalArgumentException() {
        // Base64 of "short" (5 bytes) — not 32 bytes
        String shortKey = java.util.Base64.getEncoder().encodeToString("short".getBytes());
        assertThatThrownBy(() -> new EmailEncryptionService(shortKey))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256-bit");
    }
}
