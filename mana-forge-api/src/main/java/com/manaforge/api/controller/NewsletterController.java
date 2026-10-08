package com.manaforge.api.controller;

import com.manaforge.api.service.AccountAccessService;
import com.manaforge.api.service.NewsletterService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/newsletter")
@RequiredArgsConstructor
public class NewsletterController {
    public record Preference(@NotNull Boolean subscribed) {}
    private final NewsletterService newsletter;
    private final AccountAccessService access;

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PatchMapping("/preference")
    public Preference preference(@Valid @RequestBody Preference request, Authentication authentication) {
        newsletter.setPreference(access.requireAccount(authentication), request.subscribed());
        return request;
    }

    @PostMapping("/unsubscribe")
    public void unsubscribe(@RequestBody Map<String, String> request) { newsletter.unsubscribe(request.get("token")); }
}
