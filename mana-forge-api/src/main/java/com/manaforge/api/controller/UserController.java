package com.manaforge.api.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailEncryptionService;
import com.manaforge.api.service.EmailService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/users")
public class UserController extends BaseMongoController<User, String> {

    private static final Pattern AVATAR_FILE_PATTERN = Pattern.compile("^ava(?:[1-9]|[1-9][0-9]|10[0-5])\\.jpg$");

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailEncryptionService emailEncryptionService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @Value("${services.frontend.url}")
    private String frontendUrl;

    public UserController(UserRepository repository, EmailService emailService, EmailEncryptionService emailEncryptionService) {
        super(repository);
        this.userRepository = repository;
        this.emailService = emailService;
        this.emailEncryptionService = emailEncryptionService;
    }

    private User getAuthenticatedUser() {
        SecurityContext context = SecurityContextHolder.getContext();
        Authentication authentication = context.getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof OAuth2User oAuth2User) {
            // OAuth2: principal is the Google email (plain text) — must encrypt to search DB
            String encryptedEmail = emailEncryptionService.encrypt(oAuth2User.getAttribute("email"));
            return userRepository.findByEmail(encryptedEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        }

        String username = principal.toString();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .userId(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(emailEncryptionService.decrypt(user.getEmail()))
                .biography(user.getBiography())
                .friends(user.getFriends())
                .avatar(user.getAvatar())
                .build();
    }

    private String normalizeAvatar(String avatar) {
        if (avatar == null || avatar.isBlank()) {
            return User.DEFAULT_AVATAR;
        }
        if (!AVATAR_FILE_PATTERN.matcher(avatar).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid avatar");
        }
        return avatar;
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<User> getByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(user -> {
                    user.setEmail(emailEncryptionService.decrypt(user.getEmail()));
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        return ResponseEntity.ok(toDto(getAuthenticatedUser()));
    }

    @Override
    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        String encryptedEmail = emailEncryptionService.encrypt(user.getEmail());
        if (userRepository.findByEmail(encryptedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEmail(encryptedEmail);
        user.setValidated(false);
        user.setVerificationToken(UUID.randomUUID().toString());
        user.setAvatar(normalizeAvatar(user.getAvatar()));
        ResponseEntity<User> response = super.create(user);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            emailService.sendVerificationEmail(response.getBody());
        }
        return response;
    }

    @GetMapping("/verify")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        log.info("Verifying token: {}", token);
        var userOpt = userRepository.findByVerificationToken(token);
        log.info("User found: {}", userOpt.isPresent());
        if (userOpt.isPresent()) {
            var user = userOpt.get();
            user.setValidated(true);
            user.setVerificationToken(null);
            userRepository.save(user);
            return ResponseEntity.<Void>ok().build();
        }
        return ResponseEntity.<Void>notFound().build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        return userRepository.findByUsername(loginRequest.getUsername())
                .filter(user -> passwordEncoder.matches(loginRequest.getPassword(), user.getPassword()))
                .map(user -> {
                    if (!Boolean.TRUE.equals(user.getValidated())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "EMAIL_NOT_VERIFIED"));
                    }
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user.getUsername(), null, AuthorityUtils.createAuthorityList("ROLE_USER")
                    );
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                    securityContextRepository.saveContext(context, request, response);

                    ResponseCookie cookie = ResponseCookie.from("isLogged", "true")
                            .maxAge(30L * 24 * 60 * 60)
                            .path("/")
                            .build();

                    return ResponseEntity.ok()
                            .header(HttpHeaders.SET_COOKIE, cookie.toString())
                            .body(toDto(user));
                })
                .orElse(ResponseEntity.status(401).build());
    }

    @PatchMapping("/me")
    public ResponseEntity<UserDto> updateMe(@RequestBody UpdateMeRequest req) {
        User user = getAuthenticatedUser();

        if (req.getBiography() != null) {
            user.setBiography(req.getBiography().trim());
        }
        if (req.getAvatar() != null) {
            user.setAvatar(normalizeAvatar(req.getAvatar()));
        }
        if (req.getBetaAccepted() != null) {
            user.setBetaAccepted(req.getBetaAccepted());
        }

        userRepository.save(user);
        return ResponseEntity.ok(toDto(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        ResponseCookie cookie = ResponseCookie.from("isLogged", "").maxAge(0).path("/").build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }

        User user;
        if (authentication.getPrincipal() instanceof OAuth2User oAuth2User) {
            String encryptedEmail = emailEncryptionService.encrypt(oAuth2User.getAttribute("email"));
            user = userRepository.findByEmail(encryptedEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        } else {
            user = userRepository.findByUsername(authentication.getPrincipal().toString())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        }

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }

        if (req.getNewPassword() == null || req.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /**
     * One-time migration: encrypts all existing plain-text emails in the database.
     * Safe to run multiple times — already-encrypted emails (no '@') are skipped.
     */
    @PostMapping("/admin/migrate/encrypt-emails")
    public ResponseEntity<Map<String, Object>> migrateEncryptEmails() {
        List<User> users = userRepository.findAll();
        int migrated = 0;
        int skipped = 0;

        for (User user : users) {
            String email = user.getEmail();
            if (email == null || email.isEmpty()) {
                skipped++;
                continue;
            }
            // Plain emails always contain '@'; Base64-encoded strings never do
            if (email.contains("@")) {
                user.setEmail(emailEncryptionService.encrypt(email));
                userRepository.save(user);
                migrated++;
            } else {
                skipped++;
            }
        }

        log.info("Email migration: {} migrated, {} skipped", migrated, skipped);
        return ResponseEntity.ok(Map.of("migrated", migrated, "skipped", skipped));
    }

    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    public static class UpdateMeRequest {
        private String biography;
        private String avatar;
        private Boolean betaAccepted;

        public String getBiography() { return biography; }
        public void setBiography(String biography) { this.biography = biography; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public Boolean getBetaAccepted() { return betaAccepted; }
        public void setBetaAccepted(Boolean betaAccepted) { this.betaAccepted = betaAccepted; }
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}

