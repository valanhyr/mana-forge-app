package com.manaforge.api.frontdesk;

import java.security.SecureRandom;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class TotpSecretCipherTest {
    private static String key() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Test
    void roundTripsASecret() {
        TotpSecretCipher cipher = new TotpSecretCipher(key());
        assertThat(cipher.decrypt(cipher.encrypt("JBSWY3DPEHPK3PXP"))).isEqualTo("JBSWY3DPEHPK3PXP");
    }

    @Test
    void isNotDeterministicAndDoesNotLeakThePlaintext() {
        TotpSecretCipher cipher = new TotpSecretCipher(key());
        String first = cipher.encrypt("JBSWY3DPEHPK3PXP");
        assertThat(cipher.encrypt("JBSWY3DPEHPK3PXP")).isNotEqualTo(first);
        assertThat(first).doesNotContain("JBSWY3DPEHPK3PXP");
    }

    @Test
    void rejectsTamperedCiphertext() {
        TotpSecretCipher cipher = new TotpSecretCipher(key());
        byte[] raw = Base64.getDecoder().decode(cipher.encrypt("JBSWY3DPEHPK3PXP"));
        raw[raw.length - 1] ^= 1;
        String tampered = Base64.getEncoder().encodeToString(raw);
        assertThatThrownBy(() -> cipher.decrypt(tampered)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsADifferentKey() {
        String encrypted = new TotpSecretCipher(key()).encrypt("JBSWY3DPEHPK3PXP");
        TotpSecretCipher other = new TotpSecretCipher(key());
        assertThatThrownBy(() -> other.decrypt(encrypted)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void requiresAnAes256Key() {
        assertThatThrownBy(() -> new TotpSecretCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TotpSecretCipher("")).isInstanceOf(IllegalArgumentException.class);
    }
}
