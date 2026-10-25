package com.manaforge.api.frontdesk;

import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Authentication produced only by the operator session filter; public user logins can never create one. */
public class OperatorAuthenticationToken extends AbstractAuthenticationToken {
    private final OperatorPrincipal principal;

    public OperatorAuthenticationToken(OperatorPrincipal principal) {
        super(List.of(new SimpleGrantedAuthority("ROLE_FRONTDESK_OPERATOR")));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public OperatorPrincipal getPrincipal() {
        return principal;
    }

    @Override
    public String getName() {
        return principal.id();
    }
}
