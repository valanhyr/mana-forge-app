package com.manaforge.api.frontdesk;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;

/**
 * CSRF token bound to the operator session cookie, so it needs no servlet session. The cookie is
 * HttpOnly, hence a cross-site attacker can neither read it nor compute the derived token.
 */
public class OperatorCsrfTokenRepository implements CsrfTokenRepository {
    private static final String HEADER = "X-CSRF-TOKEN";
    private static final String PARAMETER = "_csrf";
    private final SecureRandom random = new SecureRandom();

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        // With a session the token is always the derived one: Spring replaces the request token with a
        // freshly generated one after authentication, and that must not diverge from loadToken.
        CsrfToken derived = loadToken(request);
        if (derived != null) return derived;
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return new DefaultCsrfToken(HEADER, PARAMETER, Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        // Derived from the session on every request: nothing to persist.
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (OperatorSessionCookie.NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return new DefaultCsrfToken(HEADER, PARAMETER, derive(cookie.getValue()));
            }
        }
        return null;
    }

    private static String derive(String sessionToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(("mana-forge-frontdesk-csrf:" + sessionToken).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
