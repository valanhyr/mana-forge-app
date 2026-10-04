package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.PasswordResetRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.impl.PasswordResetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {

    @Mock
    PasswordResetRepository passwordResetRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    EmailService emailService;

    @Mock
    PasswordEncoder passwordEncoder;

    @InjectMocks
    PasswordResetServiceImpl svc;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void create_for_existing_email_sends_email_and_stores_hash() {
        User u = new User();
        u.setId("u1");
        u.setEmail("me@example.com");
        u.setName("Me");
                when(userRepository.findByEmail("me@example.com")).thenReturn(Optional.of(u));

        svc.createPasswordResetForEmail("me@example.com");

        verify(passwordResetRepository, times(1)).save(any());
                verify(emailService, times(1)).sendHtml(eq("me@example.com"), anyString(), anyString());
    }

    @Test
    void create_for_missing_email_silent() {
        when(userRepository.findByEmail("noone@example.com")).thenReturn(Optional.empty());
        svc.createPasswordResetForEmail("noone@example.com");
        verify(passwordResetRepository, times(0)).save(any());
        verify(emailService, times(0)).sendHtml(anyString(), anyString(), anyString());
    }
}
