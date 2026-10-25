package com.manaforge.api.frontdesk;

import java.util.Optional;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OperatorSessionFilterTest {
    private final OperatorSessionService sessions = mock(OperatorSessionService.class);
    private final OperatorSessionFilter filter = new OperatorSessionFilter(sessions);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private Authentication run(MockHttpServletRequest request) throws Exception {
        Authentication[] seen = new Authentication[1];
        FilterChain chain = (req, res) -> seen[0] = SecurityContextHolder.getContext().getAuthentication();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        return seen[0];
    }

    @Test
    void aValidOperatorCookieAuthenticatesTheRequest() throws Exception {
        when(sessions.authenticate("good")).thenReturn(Optional.of(new OperatorPrincipal("op-1", "op@example.com")));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(OperatorSessionCookie.NAME, "good"));
        Authentication auth = run(request);
        assertThat(auth).isInstanceOf(OperatorAuthenticationToken.class);
        assertThat(((OperatorAuthenticationToken) auth).getPrincipal().id()).isEqualTo("op-1");
    }

    @Test
    void anInvalidOrMissingCookieLeavesTheRequestAnonymous() throws Exception {
        when(sessions.authenticate("bad")).thenReturn(Optional.empty());
        MockHttpServletRequest bad = new MockHttpServletRequest();
        bad.setCookies(new Cookie(OperatorSessionCookie.NAME, "bad"));
        assertThat(run(bad)).isNull();
        assertThat(run(new MockHttpServletRequest())).isNull();
    }

    @Test
    void otherCookiesAreNeverTreatedAsOperatorSessions() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("JSESSIONID", "good"), new Cookie("SESSION", "good"));
        assertThat(run(request)).isNull();
        verifyNoInteractions(sessions);
    }

    @Test
    void anAuthenticationAlreadyPresentIsNotTrustedOrReusedAcrossRequests() throws Exception {
        when(sessions.authenticate("bad")).thenReturn(Optional.empty());
        SecurityContextHolder.getContext().setAuthentication(new OperatorAuthenticationToken(new OperatorPrincipal("stale", "x@example.com")));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(OperatorSessionCookie.NAME, "bad"));
        assertThat(run(request)).isNull();
    }
}
