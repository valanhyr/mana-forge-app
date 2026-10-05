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

import com.manaforge.api.dto.PublicUserDto;
import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailEncryptionService;
import com.manaforge.api.service.EmailService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;
import java.util.regex.Pattern;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;

/**
 * NOTA DE SEGURIDAD: esta clase NO extiende {@link BaseMongoController} a proposito.
 * El CRUD generico de la clase base serializa la entidad Mongo cruda, y como
 * SecurityConfig marca `GET /api/**` como publico, heredar `getAll()`/`getById()`
 * exponia sin autenticacion el hash de contraseña, el email cifrado y el
 * verificationToken de todos los usuarios. Ademas `PUT`/`DELETE /{id}` permitian
 * que cualquier cuenta autenticada modificara o borrara la cuenta de otra.
 *
 * Toda exposicion de usuarios debe pasar por un DTO explicito (UserDto / PublicUserDto).
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Pattern AVATAR_FILE_PATTERN = Pattern.compile("^ava(?:[1-9]|[1-9][0-9]|10[0-5])\\.jpg$");

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailEncryptionService emailEncryptionService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @Value("${services.frontend.url}")
    private String frontendUrl;

    public UserController(UserRepository repository, EmailService emailService, EmailEncryptionService emailEncryptionService) {
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

    private PublicUserDto toPublicUser(User user) {
        return PublicUserDto.builder()
                .userId(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .biography(user.getBiography())
                .avatar(user.getAvatar())
                .build();
    }

    private UserDto toDto(User user) {
        String decryptedPendingEmail = user.getPendingEmail() != null ? emailEncryptionService.decrypt(user.getPendingEmail()) : null;
        boolean canChangeEmail = user.getPassword() != null && !user.getPassword().isEmpty();
        return UserDto.builder()
                .userId(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(emailEncryptionService.decrypt(user.getEmail()))
                .biography(user.getBiography())
                .friends(user.getFriends())
                .avatar(user.getAvatar())
                .betaAccepted(user.getBetaAccepted())
                .pendingEmail(decryptedPendingEmail)
                .canChangeEmail(canChangeEmail)
                .build();
    }

    /**
     * El nombre visible es opcional en el registro. Si viene vacío o en blanco,
     * se usa el username como fallback para que las plantillas de email y la UI
     * nunca impriman un {@code null}.
     */
    private String normalizeName(String name, String username) {
        if (name == null || name.isBlank()) {
            return username;
        }
        return name.trim();
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
    public ResponseEntity<PublicUserDto> getByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(user -> ResponseEntity.ok(PublicUserDto.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .username(user.getUsername())
                        .biography(user.getBiography())
                        .avatar(user.getAvatar())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        return ResponseEntity.ok(toDto(getAuthenticatedUser()));
    }

    @PostMapping
    public ResponseEntity<PublicUserDto> create(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }

        // Validate the raw password BEFORE encoding: encode(null) throws and used to
        // surface as an unhandled 500, and blank/short passwords were accepted outright.
        String rawPassword = user.getPassword();
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        if (rawPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");
        }

        user.setName(normalizeName(user.getName(), user.getUsername()));
        String encryptedEmail = emailEncryptionService.encrypt(user.getEmail());
        if (userRepository.findByEmail(encryptedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
        }

        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setEmail(encryptedEmail);

        // Normalize defaults so local signups create the same user shape as Google OAuth signups.
        if (user.getFriends() == null) {
            user.setFriends(new String[0]);
        }
        if (user.getBiography() == null) {
            user.setBiography("");
        }
        if (user.getActive() == null) {
            user.setActive(true);
        }
        if (user.getBetaAccepted() == null) {
            user.setBetaAccepted(false);
        }

        user.setValidated(false);
        user.setVerificationToken(UUID.randomUUID().toString());
        user.setAvatar(normalizeAvatar(user.getAvatar()));

        // Never echo the persisted entity: it carries the password hash and the
        // verification token. The frontend ignores this body entirely.
        User saved = userRepository.save(user);
        emailService.sendVerificationEmail(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPublicUser(saved));
    }

    @GetMapping("/verify")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        log.info("Verifying token: {}", token);
        var userOpt = userRepository.findByVerificationToken(token);
        log.info("User found: {}", userOpt.isPresent());
        if (userOpt.isPresent()) {
            var user = userOpt.get();
            if (user.getPendingEmail() != null) {
                user.setEmail(user.getPendingEmail());
                user.setPendingEmail(null);
            }
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
    public ResponseEntity<UserDto> updateMe(
            @RequestBody UpdateMeRequest req,
            HttpServletRequest request,
            HttpServletResponse response) {
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

        if (req.getUsername() != null) {
            String newUsername = req.getUsername().trim();
            if (newUsername.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username cannot be empty");
            }
            if (!newUsername.equals(user.getUsername())) {
                var existingUser = userRepository.findByUsername(newUsername);
                if (existingUser.isPresent() && !existingUser.get().getId().equals(user.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
                }
                user.setUsername(newUsername);
                
                // Update SecurityContext with new username
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    newUsername, null, AuthorityUtils.createAuthorityList("ROLE_USER")
                );
                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
                securityContextRepository.saveContext(context, request, response);
            }
        }

        if (req.getEmail() != null) {
            String newEmail = req.getEmail().trim();
            String currentEmail = emailEncryptionService.decrypt(user.getEmail());
            if (!newEmail.equals(currentEmail)) {
                if (user.getPassword() == null || user.getPassword().isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email change not allowed for OAuth accounts");
                }

                // Moving the login email is account takeover material: whoever controls the
                // new address can later recover the account. A live session must not be enough,
                // so the current password is mandatory (per the profile editability spec).
                if (req.getCurrentPassword() == null || req.getCurrentPassword().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentPassword is required to change the email");
                }
                if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
                }

                String encryptedNewEmail = emailEncryptionService.encrypt(newEmail);
                if (userRepository.findByEmail(encryptedNewEmail).isPresent()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
                }
                user.setPendingEmail(encryptedNewEmail);
                user.setVerificationToken(UUID.randomUUID().toString());
                emailService.sendEmailChangeVerificationEmail(user, newEmail);
            }
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
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req, HttpServletRequest request) {
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

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not active");
        }

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }

        if (req.getNewPassword() == null || req.getNewPassword().isBlank() || req.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
        }

        // Reject a "change" that would silently be a no-op.
        if (passwordEncoder.matches(req.getNewPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from the current one");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        // Rotate the session id so a cookie captured before the change cannot be replayed.
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }

        emailService.sendPasswordChangedNotificationEmail(user);

        return ResponseEntity.noContent().build();
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
        private String username;
        private String email;
        private String currentPassword;

        public String getBiography() { return biography; }
        public void setBiography(String biography) { this.biography = biography; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public Boolean getBetaAccepted() { return betaAccepted; }
        public void setBetaAccepted(Boolean betaAccepted) { this.betaAccepted = betaAccepted; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
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

