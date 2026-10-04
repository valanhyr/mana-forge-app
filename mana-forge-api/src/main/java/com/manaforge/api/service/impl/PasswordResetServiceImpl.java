package com.manaforge.api.service.impl;

import com.manaforge.api.model.mongo.PasswordReset;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.PasswordResetRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.PasswordResetService;
import lombok.RequiredArgsConstructor;
import java.security.MessageDigest;import java.security.NoSuchAlgorithmException;import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] b = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte x : b) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
    private final PasswordResetRepository passwordResetRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom random = new SecureRandom();

    @Override
    @Transactional
    public void createPasswordResetForEmail(String email) {
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            // Do nothing (prevent enumeration)
            return;
        }
        User user = opt.get();

        // generate high-entropy token (url-safe)
        byte[] tokenBytes = new byte[48];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        String hash = sha256Hex(token);

        PasswordReset pr = new PasswordReset();
        pr.setUserId(user.getId());
        pr.setTokenHash(hash);
        pr.setExpiresAt(Instant.now().plusSeconds(3600));
        passwordResetRepository.save(pr);

        // send email with raw token
        String link = String.format("%s/reset-password?token=%s", System.getenv().getOrDefault("FRONTEND_URL","https://app.example.com"), token);
        String subject = "Reset your Mana Forge password";
                String body = String.format("<p>Hi %s,</p><p>Click <a href=\"%s\">here</a> to reset your password. The link expires in 1 hour.</p>", user.getName(), link);
                // decrypt stored email if necessary - EmailService expects encrypted inputs in its helpers; use sendHtml
                emailService.sendHtml(user.getEmail(), subject, body);
    }

    @Override
    public PasswordReset validateToken(String token) {
        String hash = sha256Hex(token);
        Optional<PasswordReset> opt = passwordResetRepository.findByTokenHash(hash);
        if (opt.isEmpty()) return null;
        PasswordReset pr = opt.get();
        if (pr.isUsed()) return null;
        if (pr.getExpiresAt() == null || pr.getExpiresAt().isBefore(Instant.now())) return null;
        return pr;
    }

    @Override
    @Transactional
    public void consumeTokenAndResetPassword(String token, String newPassword) {
        PasswordReset pr = validateToken(token);
        if (pr == null) throw new IllegalArgumentException("Invalid or expired token");
        Optional<User> optUser = userRepository.findById(pr.getUserId());
        if (optUser.isEmpty()) throw new IllegalStateException("User not found");
        User user = optUser.get();

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(java.time.Instant.now());
        userRepository.save(user);

        pr.setUsed(true);
        passwordResetRepository.save(pr);

        // Sessions will be invalidated by SessionRevocationFilter on next request
    }
}
