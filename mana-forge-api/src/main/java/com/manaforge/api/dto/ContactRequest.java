package com.manaforge.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ContactRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 120)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 254)
    private String email;

    @NotBlank(message = "Subject is required")
    @Size(max = 100)
    private String subject;

    @NotBlank(message = "Message is required")
    @Size(min = 10, max = 2000, message = "Message must be between 10 and 2000 characters")
    private String message;

    // ── Anti-spam ─────────────────────────────────────────────────────────────
    // Deliberately NOT annotated as @NotBlank: a blank token is the normal case
    // when Turnstile is disabled, and the controller decides what to do with it.

    /** Cloudflare Turnstile proof. Worthless unless verified server-side. */
    private String turnstileToken;

    /**
     * Honeypot. The field is hidden from humans, so a submission that fills it
     * is automated. Kept out of the bean validation so the controller can answer
     * with a specific code instead of a generic 400.
     */
    @Size(max = 200, message = "Unexpected value")
    private String website;

    /**
     * Epoch millis of the moment the form was rendered, used to drop submissions
     * that arrive implausibly fast. Client-supplied, so it is a heuristic, not a
     * proof: a bot that only fetches the page and replays the form still trips it.
     */
    private Long formRenderedAt;
}
