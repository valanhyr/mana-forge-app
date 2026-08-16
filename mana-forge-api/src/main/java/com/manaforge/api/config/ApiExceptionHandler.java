package com.manaforge.api.config;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        var statusCode = ex.getStatusCode();
        int statusValue = statusCode.value();
        HttpStatus maybeStatus = HttpStatus.resolve(statusValue);
        HttpStatus status = maybeStatus != null ? maybeStatus : HttpStatus.INTERNAL_SERVER_ERROR;
        String reason = maybeStatus != null ? maybeStatus.getReasonPhrase() : statusCode.toString();

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", statusValue);
        body.put("error", reason);

        // Derive a machine-friendly code from the message when possible
        String message = ex.getReason();
        String code = "ERROR";
        if (message != null) {
            String lc = message.toLowerCase();
            if (lc.contains("correo") || lc.contains("email")) {
                code = "EMAIL_TAKEN";
            } else if (lc.contains("usuario") || lc.contains("username")) {
                code = "USERNAME_TAKEN";
            } else if (lc.contains("verif")) {
                code = "INVALID_VERIFICATION";
            } else if (status == HttpStatus.CONFLICT) {
                code = "CONFLICT";
            } else {
                code = status.name();
            }
        } else {
            code = status.name();
        }

        body.put("code", code);
        body.put("message", message == null ? status.getReasonPhrase() : message);

        log.debug("Mapped ResponseStatusException to structured body: {}", body);
        return ResponseEntity.status(status).body(body);
    }
}
