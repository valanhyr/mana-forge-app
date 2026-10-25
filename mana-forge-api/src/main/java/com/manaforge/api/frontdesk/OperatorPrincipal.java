package com.manaforge.api.frontdesk;

/** Authenticated operator identity used as the actor of backoffice actions. */
public record OperatorPrincipal(String id, String email) {}
