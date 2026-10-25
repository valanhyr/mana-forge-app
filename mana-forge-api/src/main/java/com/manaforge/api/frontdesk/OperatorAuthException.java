package com.manaforge.api.frontdesk;

/** Deliberately carries no detail: callers must not be able to tell why authentication failed. */
public class OperatorAuthException extends RuntimeException {
    public OperatorAuthException() {
        super("Authentication failed");
    }
}
