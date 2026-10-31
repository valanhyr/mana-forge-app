package com.manaforge.api.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class DeckRequestDTOTest {

    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Test
    void isPrivateKeyFromFrontendIsDeserialized() throws Exception {
        DeckRequestDTO dto = mapper.readValue("{\"name\":\"d\",\"isPrivate\":true}", DeckRequestDTO.class);
        assertThat(dto.isPrivate()).isTrue();
    }

    @Test
    void privateKeyIsDeserialized() throws Exception {
        DeckRequestDTO dto = mapper.readValue("{\"name\":\"d\",\"private\":true}", DeckRequestDTO.class);
        assertThat(dto.isPrivate()).isTrue();
    }

    @Test
    void missingKeyDefaultsToPublic() throws Exception {
        DeckRequestDTO dto = mapper.readValue("{\"name\":\"d\"}", DeckRequestDTO.class);
        assertThat(dto.isPrivate()).isFalse();
    }
}
