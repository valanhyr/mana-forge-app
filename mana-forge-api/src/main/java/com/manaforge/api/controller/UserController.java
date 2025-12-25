package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController extends BaseMongoController<User, String> {

    private final UserRepository userRepository;

    public UserController(UserRepository repository) {
        super(repository);
        this.userRepository = repository;
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<User> getByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        return userRepository.findByUsername(loginRequest.getUsername())
                .filter(user -> user.getPassword().equals(loginRequest.getPassword()))
                .map(user -> {
                    ResponseCookie cookie = ResponseCookie.from("isLoged", "true")
                            .maxAge(30L * 24 * 60 * 60) // 30 días en segundos
                            .path("/")
                            .build();

                    Map<String, String> response = new HashMap<>();
                    response.put("userId", user.getId());
                    response.put("username", user.getUsername());
                    response.put("email", user.getEmail());

                    return ResponseEntity.ok()
                            .header(HttpHeaders.SET_COOKIE, cookie.toString())
                            .body(response);
                })
                .orElse(ResponseEntity.status(401).build());
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