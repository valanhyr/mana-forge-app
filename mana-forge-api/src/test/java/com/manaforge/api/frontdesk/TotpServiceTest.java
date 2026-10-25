package com.manaforge.api.frontdesk;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.OptionalLong;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TotpServiceTest {
    // RFC 6238 appendix B: SHA-1 secret "12345678901234567890", Base32 below.
    private static final String RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    private TotpService at(long epochSecond) {
        return new TotpService(Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC));
    }

    @Test
    void acceptsRfc6238VectorAndReturnsItsStep() {
        // T=59 -> step 1, 8-digit 94287082, so the 6-digit code is 287082.
        assertThat(at(59).verify(RFC_SECRET, "287082", -1)).hasValue(1);
        // T=1111111109 -> step 37037036, 6-digit 081804.
        assertThat(at(1111111109L).verify(RFC_SECRET, "081804", -1)).hasValue(37037036L);
    }

    @Test
    void toleratesOneStepOfClockDriftButNoMore() {
        // Code for step 1 presented at step 2 (T=89) and at step 3 (T=119).
        assertThat(at(89).verify(RFC_SECRET, "287082", -1)).hasValue(1);
        assertThat(at(119).verify(RFC_SECRET, "287082", -1)).isEmpty();
    }

    @Test
    void rejectsReuseOfAnAlreadyConsumedStep() {
        assertThat(at(59).verify(RFC_SECRET, "287082", 1)).isEmpty();
        assertThat(at(59).verify(RFC_SECRET, "287082", 0)).hasValue(1);
    }

    @Test
    void rejectsMalformedOrWrongCodes() {
        TotpService service = at(59);
        for (String code : new String[] {"000000", "28708", "2870822", "28708a", "", " 287082", null}) {
            assertThat(service.verify(RFC_SECRET, code, -1)).as("code=%s", code).isEqualTo(OptionalLong.empty());
        }
    }

    @Test
    void generatesDistinctBase32SecretsOfTwentyBytes() {
        TotpService service = at(0);
        String first = service.generateSecret();
        assertThat(first).matches("[A-Z2-7]{32}");
        assertThat(service.generateSecret()).isNotEqualTo(first);
    }

    @Test
    void buildsAnOtpauthUriWithEscapedLabels() {
        String uri = at(0).otpauthUri("Mana Forge", "op@example.com", RFC_SECRET);
        assertThat(uri).isEqualTo("otpauth://totp/Mana%20Forge:op%40example.com?secret=" + RFC_SECRET
                + "&issuer=Mana%20Forge&algorithm=SHA1&digits=6&period=30");
    }
}
