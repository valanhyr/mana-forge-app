package com.manaforge.api.controller;

import com.manaforge.api.service.FrontdeskBadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FrontdeskExceptionHandlerTest {
    private final FrontdeskExceptionHandler handler = new FrontdeskExceptionHandler();

    @Test
    void invalidQueryValuesBecomeABadRequestWithAStableCode() {
        var response = handler.badRequest(new FrontdeskBadRequestException("INVALID_SORT", "Unknown user sort: popularity"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("code", "INVALID_SORT")
                .containsEntry("error", "Unknown user sort: popularity");
    }
}
