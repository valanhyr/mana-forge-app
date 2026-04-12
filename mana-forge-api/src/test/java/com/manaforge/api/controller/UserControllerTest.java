package com.manaforge.api.controller;

import com.manaforge.api.config.SecurityConfig;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId("user1");
        mockUser.setUsername("testuser");
        mockUser.setEmail("test@example.com");
        mockUser.setName("Test User");
        mockUser.setPassword(encoder.encode("password123"));
        mockUser.setValidated(true);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(userRepository.findByEmail("testuser")).thenReturn(Optional.empty());
    }

    private UsernamePasswordAuthenticationToken mockAuth() {
        return new UsernamePasswordAuthenticationToken("testuser", null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void createUser_withValidData_returns200() throws Exception {
        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        User savedUser = new User();
        savedUser.setId("new-user-id");
        savedUser.setUsername("newuser");
        savedUser.setEmail("new@example.com");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New User\",\"username\":\"newuser\",\"password\":\"pass123\",\"email\":\"new@example.com\"}"))
                .andExpect(status().is2xxSuccessful());

        verify(emailService, atLeastOnce()).sendVerificationEmail(any());
    }

    @Test
    void createUser_withDuplicateUsername_returns409() throws Exception {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"username\":\"testuser\",\"password\":\"pass123\",\"email\":\"other@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void createUser_withDuplicateEmail_returns409() throws Exception {
        when(userRepository.findByUsername("anotheruser")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test\",\"username\":\"anotheruser\",\"password\":\"pass123\",\"email\":\"test@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void login_withValidCredentials_returns200WithUserId() throws Exception {
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testuser\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user1"));
    }

    @Test
    void login_withBadPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testuser\",\"password\":\"wrongpassword\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void login_withUnverifiedEmail_returns403WithErrorCode() throws Exception {
        mockUser.setValidated(false);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"testuser\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("EMAIL_NOT_VERIFIED"));
    }

    @Test
    void getMe_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMe_withAuth_returns200WithUserDto() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .with(authentication(mockAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getByUsername_found_returns200() throws Exception {
        mockMvc.perform(get("/api/users/username/testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getByUsername_notFound_returns404() throws Exception {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/username/unknown"))
                .andExpect(status().isNotFound());
    }

    @Test
    void verifyEmail_withValidToken_returns200() throws Exception {
        mockUser.setVerificationToken("valid-token");
        when(userRepository.findByVerificationToken("valid-token")).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        mockMvc.perform(get("/api/users/verify").param("token", "valid-token"))
                .andExpect(status().isOk());
    }

    @Test
    void verifyEmail_withInvalidToken_returns404() throws Exception {
        when(userRepository.findByVerificationToken("bad-token")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/users/verify").param("token", "bad-token"))
                .andExpect(status().isNotFound());
    }

    @Test
    void patchMe_withInvalidAvatar_returns400() throws Exception {
        mockMvc.perform(patch("/api/users/me")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatar\":\"invalid.png\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changePassword_withWrongCurrentPassword_returns401() throws Exception {
        mockMvc.perform(patch("/api/users/me/password")
                        .with(authentication(mockAuth()))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong-password\",\"newPassword\":\"newpass123\"}"))
                .andExpect(status().isUnauthorized());
    }
}
