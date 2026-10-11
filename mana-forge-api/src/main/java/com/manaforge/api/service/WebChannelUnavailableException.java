package com.manaforge.api.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A channel conflict, not a loss of operator authorization. */
public class WebChannelUnavailableException extends ResponseStatusException {
    public WebChannelUnavailableException() {
        super(HttpStatus.CONFLICT, "The customer cannot read this conversation on the web.");
    }
}
