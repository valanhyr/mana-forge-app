package com.manaforge.api.config;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Optional;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SessionRevocationFilterTest {

    @Mock
    private UserRepository userRepository;

    private SessionRevocationFilter filter;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        filter = new SessionRevocationFilter(userRepository);
    }

    @Test
    void invalidatesSessionWhenCreatedBeforePasswordChange() throws Exception {
        User u = new User();
        u.setUsername("tester");
        // set passwordChangedAt in the future so current session appears older and must be invalidated
        u.setPasswordChangedAt(Instant.now().plusSeconds(60));
        when(userRepository.findByUsername("tester")).thenReturn(Optional.of(u));

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true);

        MockHttpServletResponse res = new MockHttpServletResponse();

        UserDetails sd = org.springframework.security.core.userdetails.User.withUsername("tester").password("x").authorities(new ArrayList<>()).build();
        Authentication auth = new TestingAuthenticationToken(sd, null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        filter.doFilterInternal(req, res, (r, s) -> {});

        // Security context should be cleared when session invalidated
        var authAfter = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authAfter == null || !authAfter.isAuthenticated()).isTrue();
    }

    @Test
    void keepsSessionWhenCreatedAfterPasswordChange() throws Exception {
        User u = new User();
        u.setUsername("fresh");
        // set passwordChangedAt in the past so current session appears newer and must be kept
        u.setPasswordChangedAt(Instant.now().minusSeconds(60));
        when(userRepository.findByUsername("fresh")).thenReturn(Optional.of(u));

        MockHttpServletRequest req = new MockHttpServletRequest();
        req.getSession(true);

        MockHttpServletResponse res = new MockHttpServletResponse();

        UserDetails sd = org.springframework.security.core.userdetails.User.withUsername("fresh").password("x").authorities(new ArrayList<>()).build();
        Authentication auth = new TestingAuthenticationToken(sd, null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        filter.doFilterInternal(req, res, (r, s) -> {});

        // default response status is 200 (unchanged)
        assertThat(res.getStatus()).isEqualTo(200);
    }
}
