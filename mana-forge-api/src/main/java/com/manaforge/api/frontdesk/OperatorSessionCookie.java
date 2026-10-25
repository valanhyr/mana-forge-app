package com.manaforge.api.frontdesk;

import java.time.Duration;
import java.time.Instant;
import org.springframework.http.ResponseCookie;

/** The operator session cookie: unreadable by scripts, never sent cross-site, and scoped to the backoffice API only. */
public final class OperatorSessionCookie {
    public static final String NAME = "MF_OPERATOR";
    private static final String PATH = "/api/frontdesk";

    private OperatorSessionCookie() {}

    public static ResponseCookie issue(String token, Instant expiresAt, boolean secure) {
        Duration maxAge = Duration.between(Instant.now(), expiresAt);
        return base(token, secure).maxAge(maxAge.isNegative() ? Duration.ZERO : maxAge).build();
    }

    public static ResponseCookie clear(boolean secure) {
        return base("", secure).maxAge(Duration.ZERO).build();
    }

    private static ResponseCookie.ResponseCookieBuilder base(String value, boolean secure) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Strict").path(PATH);
    }
}
