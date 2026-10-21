package com.manaforge.api.service;

import java.util.Optional;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.core.user.OAuth2User;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class FrontdeskAccessServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);

    private User operator() {
        User user = new User();
        user.setId("immutable-id");
        user.setValidated(true);
        return user;
    }

    @Test
    void emptyAllowlistFailsClosed() {
        assertThat(new FrontdeskAccessService(users, encryption, "").isOperator(operator())).isFalse();
    }

    @Test
    void onlyActiveVerifiedAllowlistedIdsAreOperators() {
        FrontdeskAccessService service = new FrontdeskAccessService(users, encryption, " immutable-id, other ");
        User user = operator();
        assertThat(service.isOperator(user)).isTrue();
        user.setValidated(false);
        assertThat(service.isOperator(user)).isFalse();
        user.setValidated(true);
        user.setStatus(User.AccountStatus.BANNED);
        assertThat(service.isOperator(user)).isFalse();
        user.setStatus(null);
        user.setActive(false);
        assertThat(service.isOperator(user)).isFalse();
    }

    @Test
    void spoofedAuthorityDoesNotGrantAccess() {
        var auth = new UsernamePasswordAuthenticationToken("customer", null, AuthorityUtils.createAuthorityList("ROLE_OPERATOR"));
        User user = operator();
        user.setId("customer-id");
        when(users.findByUsername("customer")).thenReturn(Optional.of(user));
        assertThat(new FrontdeskAccessService(users, encryption, "immutable-id").isOperator(auth)).isFalse();
    }

    @Test
    void oauthResolvesByEncryptedEmailNotMutableDisplayName() {
        OAuth2User principal = mock(OAuth2User.class);
        when(principal.getAttribute("email")).thenReturn("operator@example.com");
        when(encryption.encrypt("operator@example.com")).thenReturn("encrypted");
        when(users.findByEmail("encrypted")).thenReturn(Optional.of(operator()));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        assertThat(new FrontdeskAccessService(users, encryption, "immutable-id").isOperator(auth)).isTrue();
        verify(users, never()).findByEmail("operator@example.com");
    }
}
