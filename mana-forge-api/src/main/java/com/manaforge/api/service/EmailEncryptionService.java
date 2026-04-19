package com.manaforge.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Deterministic AES-256-ECB encryption for email addresses.
 * Same input always produces the same ciphertext, which allows MongoDB
 * queries with findByEmail(encrypt(email)) to work correctly.
 * Key must be a Base64-encoded 256-bit (32-byte) secret loaded from EMAIL_ENCRYPTION_KEY.
 */
@Service
public class EmailEncryptionService {

    private final SecretKeySpec secretKey;

    public EmailEncryptionService(@Value("${email.encryption.key}") String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException("EMAIL_ENCRYPTION_KEY must be a Base64-encoded 256-bit (32-byte) key");
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plainEmail) {
        if (plainEmail == null || plainEmail.isEmpty()) return plainEmail;
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] encrypted = cipher.doFinal(plainEmail.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Email encryption failed", e);
        }
    }

    public String decrypt(String encryptedEmail) {
        if (encryptedEmail == null || encryptedEmail.isEmpty()) return encryptedEmail;
        try {
            Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(encryptedEmail));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Email decryption failed", e);
        }
    }
}
