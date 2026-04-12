package com.manaforge.api.controller;

import com.manaforge.api.dto.ContactRequest;
import com.manaforge.api.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    private final EmailService emailService;

    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody ContactRequest request) {
        log.info("Contact form submission from {} <{}>  subject: {}", request.getName(), request.getEmail(), request.getSubject());
        emailService.sendContactConfirmation(request);
        emailService.sendContactNotification(request);
        return ResponseEntity.ok().build();
    }
}
