package com.manaforge.api.service;

import com.manaforge.api.model.mongo.PasswordReset;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.PasswordResetRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.impl.PasswordResetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PasswordResetServiceImplTest {

    @Mock
    private PasswordResetRepository prRepo;
    @Mock
    private UserRepository userRepo;
    @Mock
    private EmailService emailService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @Captor
    ArgumentCaptor<PasswordReset> prCaptor;

    private PasswordResetServiceImpl service;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        service = new PasswordResetServiceImpl(prRepo, userRepo, emailService, passwordEncoder);
    }

    @Test
    void createPasswordResetForEmail_existingEmail_savesAndSendsEmail() {
        User u = new User();
        u.setId("u1");
        u.setEmail("alice@example.com");
        u.setName("Alice");

        when(userRepo.findByEmail("alice@example.com")).thenReturn(Optional.of(u));

        service.createPasswordResetForEmail("alice@example.com");

        verify(prRepo, times(1)).save(prCaptor.capture());
        PasswordReset saved = prCaptor.getValue();
        assertThat(saved.getUserId()).isEqualTo("u1");
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());

        verify(emailService, times(1)).sendHtml(eq("alice@example.com"), anyString(), contains("reset your password"));
    }

    @Test
    void consumeTokenAndResetPassword_setsPasswordChangedAt_and_marksUsed() {
        // create a fake PasswordReset; token hash will be computed from token string in validateToken -> we bypass validateToken by stubbing repo
        PasswordReset pr = new PasswordReset();
        pr.setId("pr1");
        pr.setUserId("u1");
        pr.setExpiresAt(Instant.now().plusSeconds(3600));
        pr.setUsed(false);

        when(prRepo.findByTokenHash(anyString())).thenReturn(Optional.of(pr));

        User u = new User();
        u.setId("u1");
        u.setPasswordChangedAt(null);
        when(userRepo.findById("u1")).thenReturn(Optional.of(u));
        when(passwordEncoder.encode("newpass")).thenReturn("encoded");

        service.consumeTokenAndResetPassword("token123", "newpass");

        verify(userRepo, times(1)).save(u);
        assertThat(u.getPassword()).isEqualTo("encoded");
        assertThat(u.getPasswordChangedAt()).isNotNull();

        verify(prRepo, times(1)).save(pr);
        assertThat(pr.isUsed()).isTrue();
    }
}
