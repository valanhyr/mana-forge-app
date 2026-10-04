package com.manaforge.api.service;

import com.manaforge.api.model.mongo.PasswordReset;

public interface PasswordResetService {
    // request a reset for an existing user's email; returns true if email existed (but controller will hide this)
    void createPasswordResetForEmail(String email);

    PasswordReset validateToken(String token);

    void consumeTokenAndResetPassword(String token, String newPassword);
}
