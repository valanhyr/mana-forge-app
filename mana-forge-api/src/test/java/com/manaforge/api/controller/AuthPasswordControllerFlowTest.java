package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.PasswordReset;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.PasswordResetRepository;
import com.manaforge.api.repository.UserRepository;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.impl.PasswordResetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class AuthPasswordControllerFlowTest {

    @Mock
    private com.manaforge.api.service.PasswordResetService passwordResetService;

    private AuthPasswordController controller;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        controller = new AuthPasswordController(passwordResetService);
    }

    @Test
    void forgotPassword_invokesService_and_returnsOk() {
        doNothing().when(passwordResetService).createPasswordResetForEmail("noone@example.com");

        ResponseEntity<?> resp = controller.forgotPassword(new AuthPasswordController.ForgotRequest(){
            { setEmail("noone@example.com"); }
        });

        verify(passwordResetService, times(1)).createPasswordResetForEmail("noone@example.com");
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void resetPassword_success_callsService_and_returnsOk() {
        doNothing().when(passwordResetService).consumeTokenAndResetPassword("tokenx","Abc12345!");

        ResponseEntity<?> resp = controller.resetPassword(new AuthPasswordController.ResetRequest(){
            { setToken("tokenx"); setPassword("Abc12345!"); }
        });

        verify(passwordResetService, times(1)).consumeTokenAndResetPassword("tokenx","Abc12345!");
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
    }

    @Test
    void resetPassword_invalidToken_returnsBadRequest() {
        doThrow(new IllegalArgumentException("invalid")).when(passwordResetService).consumeTokenAndResetPassword(anyString(), anyString());

        ResponseEntity<?> resp = controller.resetPassword(new AuthPasswordController.ResetRequest(){
            { setToken("bad"); setPassword("x"); }
        });

        assertThat(resp.getStatusCode().is4xxClientError()).isTrue();
    }
}
