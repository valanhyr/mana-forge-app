package com.manaforge.api.controller;

import com.manaforge.api.dto.ContactRequest;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.TurnstileService;
import com.manaforge.api.util.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    /**
     * Nobody fills in name, email, subject and a real message in under two
     * seconds. Submissions faster than this come from a script that scraped the
     * page and replayed the fields.
     *
     * <p>Heuristic only: {@code formRenderedAt} is client-supplied, so a
     * determined bot can forge it. It costs the spammer nothing to defeat and
     * filters the large majority of the naive ones, so it is not worth a server
     * side session or a signed token.
     */
    private static final long MIN_FILL_MILLIS = 2_000L;

    /** Upper bound on the client clock's contribution. Beyond this we stop trusting it. */
    private static final long MAX_PLAUSIBLE_AGE_MILLIS = 24L * 60 * 60 * 1000;

    private final EmailService emailService;
    private final TurnstileService turnstileService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> submit(
            @Valid @RequestBody ContactRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = ClientIpResolver.resolve(httpRequest);

        // 1. Honeypot. The field is hidden from humans, so anything in it is a bot
        //    that filled every input it found. Reject before doing any work.
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            log.warn("Contact submission rejected: honeypot filled. ip={} email={}",
                    clientIp, request.getEmail());
            return error(HttpStatus.FORBIDDEN, "FORM_REJECTED",
                    "Your submission was flagged as automated.");
        }

        // 2. Implausible fill time.
        if (submittedTooFast(request.getFormRenderedAt())) {
            log.warn("Contact submission rejected: filled in under {}ms. ip={} email={}",
                    MIN_FILL_MILLIS, clientIp, request.getEmail());
            return error(HttpStatus.FORBIDDEN, "FORM_REJECTED",
                    "Your submission was flagged as automated.");
        }

        // 3. Turnstile. The endpoint is anonymous by nature, so there is no
        //    authenticated bypass: every caller must prove the challenge.
        //    A failed verification is NOT a pass — that is deliberate, see
        //    TurnstileService.
        if (turnstileService.isEnabled()
                && !turnstileService.verify(request.getTurnstileToken(), clientIp)) {
            log.info("Contact submission rejected: Turnstile verification failed. ip={} email={}",
                    clientIp, request.getEmail());
            return error(HttpStatus.FORBIDDEN, "TURNSTILE_FAILED",
                    "Human verification required. Please reload and try again.");
        }

        // The proof token is not part of the message; strip it so it cannot
        // reach the email templates even if a field is added later.
        request.setTurnstileToken(null);
        request.setWebsite(null);
        request.setFormRenderedAt(null);

        log.info("Contact form submission from {} <{}>  subject: {}",
                request.getName(), request.getEmail(), request.getSubject());
        emailService.sendContactConfirmation(request);
        emailService.sendContactNotification(request);
        return ResponseEntity.ok().build();
    }

    /**
     * True when the client claims a render time that leaves no room for a human.
     * A missing or nonsensical timestamp is not rejected: old clients and curl
     * calls would otherwise be locked out over a field they never send.
     */
    private boolean submittedTooFast(Long renderedAt) {
        if (renderedAt == null || renderedAt <= 0) return false;
        long elapsed = System.currentTimeMillis() - renderedAt;
        // Clock skew puts `renderedAt` in the future: unknowable, so do not judge.
        if (elapsed < 0 || elapsed > MAX_PLAUSIBLE_AGE_MILLIS) return false;
        return elapsed < MIN_FILL_MILLIS;
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}