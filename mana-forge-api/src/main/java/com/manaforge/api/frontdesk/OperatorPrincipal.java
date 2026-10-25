package com.manaforge.api.frontdesk;

/** Authenticated operator identity used as the actor of backoffice actions. */
public record OperatorPrincipal(String id, String email) {
    /** Display name recorded in tickets, deliveries and audit: the operator's login email. */
    public String name() {
        return email;
    }
}
