package com.manaforge.api.controller;

import com.manaforge.api.service.PasswordResetService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthPasswordController {
    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotRequest req) {
        // Always return 200 to avoid enumeration
        passwordResetService.createPasswordResetForEmail(req.getEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetRequest req) {
        try {
            passwordResetService.consumeTokenAndResetPassword(req.getToken(), req.getPassword());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body("invalid_or_expired");
        }
    }

    @Data
    public static class ForgotRequest {
        private String email;
    }

    @Data
    public static class ResetRequest {
        private String token;
        private String password;
    }
}
