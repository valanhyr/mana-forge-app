package com.manaforge.api.service;

/** A Frontdesk query was malformed; carries a stable machine-readable code. */
public class FrontdeskBadRequestException extends RuntimeException {

    private final String code;

    public FrontdeskBadRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
