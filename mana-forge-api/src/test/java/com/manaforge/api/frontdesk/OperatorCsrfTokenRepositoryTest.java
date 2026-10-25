package com.manaforge.api.frontdesk;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import static org.assertj.core.api.Assertions.*;

class OperatorCsrfTokenRepositoryTest {
    private final OperatorCsrfTokenRepository repository = new OperatorCsrfTokenRepository();

    private MockHttpServletRequest withSession(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(OperatorSessionCookie.NAME, token));
        return request;
    }

    @Test
    void theTokenIsDerivedFromTheSessionSoItIsStableForThatSession() {
        CsrfToken first = repository.loadToken(withSession("session-a"));
        CsrfToken second = repository.loadToken(withSession("session-a"));
        assertThat(first).isNotNull();
        assertThat(first.getToken()).isEqualTo(second.getToken()).isNotBlank();
        assertThat(first.getHeaderName()).isEqualTo("X-CSRF-TOKEN");
    }

    @Test
    void differentSessionsGetDifferentTokensAndNeverContainTheCookieValue() {
        String a = repository.loadToken(withSession("session-a")).getToken();
        String b = repository.loadToken(withSession("session-b")).getToken();
        assertThat(a).isNotEqualTo(b).doesNotContain("session-a");
    }

    @Test
    void withoutASessionThereIsNothingToLoadAndAGeneratedTokenNeverMatchesTwice() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        assertThat(repository.loadToken(request)).isNull();
        assertThat(repository.generateToken(request).getToken()).isNotEqualTo(repository.generateToken(request).getToken());
    }

    @Test
    void withASessionAGeneratedTokenIsTheDerivedOneSoSpringsTokenReplacementIsHarmless() {
        MockHttpServletRequest request = withSession("session-a");
        assertThat(repository.generateToken(request).getToken()).isEqualTo(repository.loadToken(request).getToken());
    }

    @Test
    void savingIsANoOpBecauseNothingIsStoredServerSide() {
        MockHttpServletRequest request = withSession("session-a");
        MockHttpServletResponse response = new MockHttpServletResponse();
        repository.saveToken(repository.generateToken(request), request, response);
        assertThat(response.getCookies()).isEmpty();
        assertThat(request.getSession(false)).isNull();
    }
}
