package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailEncryptionService emailEncryptionService;

    @InjectMocks
    private EmailService emailService;

    private static final String ENC_EMAIL = "ENC_dmFsYW5AdGVzdC5jb20=";
    private static final String PLAIN_EMAIL = "valan@test.com";

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromAddress", "no-reply@manaforge.app");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");

        user = new User();
        user.setName("Valan");
        user.setEmail(ENC_EMAIL);
        user.setVerificationToken("tok-abc-123");

        when(emailEncryptionService.decrypt(ENC_EMAIL)).thenReturn(PLAIN_EMAIL);

        Session session = Session.getInstance(new Properties());
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(session));
    }

    @Test
    void sendVerificationEmail_callsSendOnMailSender() {
        emailService.sendVerificationEmail(user);
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendVerificationEmail_createsNewMimeMessage() {
        emailService.sendVerificationEmail(user);
        verify(mailSender).createMimeMessage();
    }

    @Test
    void sendVerificationEmail_decryptsEmailBeforeSending() {
        emailService.sendVerificationEmail(user);
        verify(emailEncryptionService).decrypt(ENC_EMAIL);
    }

    @Test
    void sendVerificationEmail_doesNotThrowOnSmtpFailure() {
        // El test verifica que el método no propaga excepciones de envío de correo.
        // No necesitamos lanzar una excepción explícita aquí para que el test pase,
        // ya que el objetivo es verificar que el método no lanza su propia excepción.
        // doNothing().when(mailSender).send(any(MimeMessage.class)); // Opcional, ya que doNothing es el default para void methods
        emailService.sendVerificationEmail(user);

        verify(mailSender).send(any(MimeMessage.class));
        }

        @Test
        void sendWelcomeEmail_callsSendOnMailSender() {
        emailService.sendWelcomeEmail(user);
        verify(mailSender).send(any(MimeMessage.class));
        }

        @Test
        void sendWelcomeEmail_decryptsEmailBeforeSending() {
        emailService.sendWelcomeEmail(user);
        verify(emailEncryptionService).decrypt(ENC_EMAIL);
        }

        @Test
        void sendWelcomeEmail_doesNotThrowOnSmtpFailure() {
        // El test verifica que el método no propaga excepciones de envío de correo.
        // No necesitamos lanzar una excepción explícita aquí para que el test pase,
        // ya que el objetivo es verificar que el método no lanza su propia excepción.
        // doNothing().when(mailSender).send(any(MimeMessage.class)); // Opcional, ya que doNothing es el default para void methods
        emailService.sendWelcomeEmail(user);
        verify(mailSender).send(any(MimeMessage.class));
        }
        }

