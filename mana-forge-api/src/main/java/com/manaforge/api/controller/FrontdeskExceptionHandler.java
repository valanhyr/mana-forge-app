package com.manaforge.api.controller;

import java.util.Map;
import com.manaforge.api.service.WebChannelUnavailableException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {FrontdeskController.class, SupportController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FrontdeskExceptionHandler {
    @ExceptionHandler(WebChannelUnavailableException.class)
    public ResponseEntity<Map<String, String>> unavailableWebChannel() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code", "WEB_CHANNEL_UNAVAILABLE",
                "error", "The customer cannot read this conversation on the web. Reload the ticket to review its channels."));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("code", "CONCURRENT_UPDATE", "error", "Ticket changed. Reload and try again."));
    }
}
