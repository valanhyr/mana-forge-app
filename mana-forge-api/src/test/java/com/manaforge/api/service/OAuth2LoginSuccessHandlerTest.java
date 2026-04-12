package com.manaforge.api.service;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private Authentication authentication;

    @Mock
    private OAuth2User oAuth2User;

    @InjectMocks
    private OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(handler, "frontendUrl", "http://localhost:5173");
        when(authentication.getPrincipal()).thenReturn(oAuth2User);
        when(oAuth2User.getAttribute("email")).thenReturn("user@test.com");
        when(oAuth2User.getAttribute("name")).thenReturn("Test User");
    }

    @Test
    void newUser_isCreatedAndRedirectedToBetaWelcome() throws Exception {
        when(oAuth2User.getAttribute("given_name")).thenReturn("Test");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository).save(any(User.class));
        verify(response).sendRedirect("http://localhost:5173/profile?beta_welcome=true");
    }

    @Test
    void existingUser_isNotSavedAndRedirectedToHome() throws Exception {
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(new User()));

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository, never()).save(any());
        verify(response).sendRedirect("http://localhost:5173/");
    }

    @Test
    void newUser_usesGivenNameAsUsername() throws Exception {
        when(oAuth2User.getAttribute("given_name")).thenReturn("Valan");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("Valan");
    }

    @Test
    void newUser_fallsBackToEmailPrefixWhenGivenNameIsBlank() throws Exception {
        when(oAuth2User.getAttribute("given_name")).thenReturn("");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("user");
    }

    @Test
    void newUser_fallsBackToEmailPrefixWhenGivenNameIsNull() throws Exception {
        when(oAuth2User.getAttribute("given_name")).thenReturn(null);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getUsername()).isEqualTo("user");
    }

    @Test
    void newUser_hasDefaultAvatarAndEmptyFriendsArray() throws Exception {
        when(oAuth2User.getAttribute("given_name")).thenReturn("Valan");
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.empty());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getAvatar()).isEqualTo(User.DEFAULT_AVATAR);
        assertThat(saved.getFriends()).isEmpty();
        assertThat(saved.getActive()).isTrue();
        assertThat(saved.getValidated()).isTrue();
    }
}
