package com.manaforge.api.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.manaforge.api.dto.UserDto;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;


@RestController
@RequestMapping("/api/users")
public class UserController extends BaseMongoController<User, String> {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public UserController(UserRepository repository, EmailService emailService) {
        super(repository);
        this.userRepository = repository;
        this.emailService = emailService;
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<User> getByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me() {
        SecurityContext context = SecurityContextHolder.getContext();
        Authentication authentication = context.getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }

        Object principal = authentication.getPrincipal();
        String identifier;

        if (principal instanceof OAuth2User oAuth2User) {
            identifier = oAuth2User.getAttribute("email");
        } else {
            identifier = principal.toString();
        }

        return userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .map(user -> UserDto.builder()
                        .userId(user.getId())
                        .name(user.getName())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .biography(user.getBiography())
                        .friends(user.getFriends())
                        .build())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }

    @Override
    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        // Asumiendo que UserRepository tiene findByEmail, si no, añádelo a la interfaz
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        ResponseEntity<User> response = super.create(user);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            emailService.sendWelcomeEmail(response.getBody());
        }
        return response;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request, HttpServletResponse response) {
        return userRepository.findByUsername(loginRequest.getUsername())
                .filter(user -> passwordEncoder.matches(loginRequest.getPassword(), user.getPassword()))
                .map(user -> {
                    // 1. Crear autenticación de Spring Security (JSESSIONID)
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user.getUsername(), null, AuthorityUtils.createAuthorityList("ROLE_USER")
                    );
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                    securityContextRepository.saveContext(context, request, response); // Esto genera la cookie JSESSIONID

                    ResponseCookie cookie = ResponseCookie.from("isLogged", "true")
                            .maxAge(30L * 24 * 60 * 60) // 30 días en segundos
                            .path("/")
                            .build();

                    UserDto userDto = UserDto.builder()
                            .userId(user.getId())
                            .name(user.getName())
                            .username(user.getUsername())
                            .email(user.getEmail())
                            .biography(user.getBiography())
                            .friends(user.getFriends())
                            .build();

                    return ResponseEntity.ok()
                            .header(HttpHeaders.SET_COOKIE, cookie.toString())
                            .body(userDto);
                })
                .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        // 1. Invalidar sesión de Spring Security
        SecurityContextHolder.clearContext();
        var session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        // 2. Limpiar tu cookie manual
        ResponseCookie cookie = ResponseCookie.from("isLogged", "").maxAge(0).path("/").build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).build();
        }

        String identifier = authentication.getPrincipal() instanceof OAuth2User oAuth2User
                ? oAuth2User.getAttribute("email")
                : authentication.getPrincipal().toString();

        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

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

    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
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