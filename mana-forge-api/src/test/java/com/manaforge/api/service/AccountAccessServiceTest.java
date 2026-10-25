package com.manaforge.api.service;

import java.util.Optional;
import com.manaforge.api.frontdesk.OperatorAuthenticationToken;
import com.manaforge.api.frontdesk.OperatorPrincipal;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.core.user.OAuth2User;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccountAccessServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final EmailEncryptionService encryption = mock(EmailEncryptionService.class);
    private final AccountAccessService service = new AccountAccessService(users, encryption);

    private User user(String id) {
        User user = new User();
        user.setId(id);
        user.setValidated(true);
        return user;
    }

    @Test
    void localLoginResolvesByUsernameAndIgnoresSpoofedAuthorities() {
        var auth = new UsernamePasswordAuthenticationToken("customer", null, AuthorityUtils.createAuthorityList("ROLE_FRONTDESK_OPERATOR"));
        when(users.findByUsername("customer")).thenReturn(Optional.of(user("customer-id")));
        assertThat(service.resolve(auth)).map(User::getId).contains("customer-id");
    }

    @Test
    void oauthResolvesByEncryptedEmailNotMutableDisplayName() {
        OAuth2User principal = mock(OAuth2User.class);
        when(principal.getAttribute("email")).thenReturn("customer@example.com");
        when(encryption.encrypt("customer@example.com")).thenReturn("encrypted");
        when(users.findByEmail("encrypted")).thenReturn(Optional.of(user("customer-id")));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        assertThat(service.resolve(auth)).isPresent();
        verify(users, never()).findByEmail("customer@example.com");
    }

    @Test
    void anOperatorSessionNeverResolvesToAPublicUserEvenIfAUsernameMatchesItsId() {
        when(users.findByUsername("op-1")).thenReturn(Optional.of(user("impostor")));
        var auth = new OperatorAuthenticationToken(new OperatorPrincipal("op-1", "op@example.com"));
        assertThat(service.resolve(auth)).isEmpty();
        verifyNoInteractions(users);
    }

    @Test
    void missingOrAnonymousAuthenticationResolvesToNothing() {
        assertThat(service.resolve(null)).isEmpty();
    }
}
