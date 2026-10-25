package com.manaforge.api.controller;

import java.util.List;
import java.util.Map;
import com.manaforge.api.frontdesk.OperatorAuthException;
import com.manaforge.api.frontdesk.OperatorAuthService;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import com.manaforge.api.frontdesk.OperatorSessionCookie;
import com.manaforge.api.frontdesk.OperatorSessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Operator sign-in. Every failure is the same empty 401; nothing here reveals why authentication failed. */
@RestController
@RequestMapping("/api/frontdesk/auth")
@ConditionalOnExpression("!'${frontdesk.totp.key:}'.isEmpty()")
public class OperatorAuthController {
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record CodeRequest(@NotBlank String challenge, @NotBlank String code) {}
    public record ChallengeRequest(@NotBlank String challenge) {}
    public record ChallengeResponse(String status, String challenge) {}
    public record EnrollmentStartResponse(String secret, String otpauthUri) {}

    private final OperatorAuthService auth;
    private final OperatorSessionService sessions;
    private final boolean secureCookie;

    public OperatorAuthController(OperatorAuthService auth, OperatorSessionService sessions,
                                  @Value("${frontdesk.session.cookie-secure:true}") boolean secureCookie) {
        this.auth = auth;
        this.sessions = sessions;
        this.secureCookie = secureCookie;
    }

    @PostMapping("/login")
    public ResponseEntity<ChallengeResponse> login(@Valid @RequestBody LoginRequest request) {
        OperatorAuthService.Challenge challenge = auth.login(request.email(), request.password());
        return noStore().body(new ChallengeResponse(challenge.type().name(), challenge.token()));
    }

    @PostMapping("/totp")
    public ResponseEntity<Map<String, Object>> totp(@Valid @RequestBody CodeRequest request) {
        return signedIn(auth.verifyTotp(request.challenge(), request.code()), null);
    }

    @PostMapping("/recovery")
    public ResponseEntity<Map<String, Object>> recovery(@Valid @RequestBody CodeRequest request) {
        return signedIn(auth.verifyRecovery(request.challenge(), request.code()), null);
    }

    @PostMapping("/enroll/start")
    public ResponseEntity<EnrollmentStartResponse> enrollStart(@Valid @RequestBody ChallengeRequest request) {
        OperatorAuthService.EnrollmentStart start = auth.startEnrollment(request.challenge());
        return noStore().body(new EnrollmentStartResponse(start.secret(), start.otpauthUri()));
    }

    @PostMapping("/enroll/confirm")
    public ResponseEntity<Map<String, Object>> enrollConfirm(@Valid @RequestBody CodeRequest request) {
        OperatorAuthService.EnrollmentResult result = auth.confirmEnrollment(request.challenge(), request.code());
        return signedIn(result.principal(), result.recoveryCodes());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = OperatorSessionCookie.NAME, required = false) String token) {
        sessions.revoke(token);
        return noStore().header(HttpHeaders.SET_COOKIE, OperatorSessionCookie.clear(secureCookie).toString()).build();
    }

    @ExceptionHandler(OperatorAuthException.class)
    public ResponseEntity<Void> failed() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).cacheControl(CacheControl.noStore()).build();
    }

    private ResponseEntity<Map<String, Object>> signedIn(OperatorPrincipal principal, List<String> recoveryCodes) {
        OperatorSessionService.Issued issued = sessions.create(principal.id());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("id", principal.id());
        body.put("name", principal.name());
        body.put("role", "OPERATOR");
        if (recoveryCodes != null) body.put("recoveryCodes", recoveryCodes);
        return noStore().header(HttpHeaders.SET_COOKIE, OperatorSessionCookie.issue(issued.token(), issued.expiresAt(), secureCookie).toString())
                .body(body);
    }

    private static ResponseEntity.BodyBuilder noStore() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore());
    }
}
