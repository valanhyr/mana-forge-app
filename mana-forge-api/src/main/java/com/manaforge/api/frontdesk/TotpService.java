package com.manaforge.api.frontdesk;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.OptionalLong;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) implemented with the JDK. */
@Service
public class TotpService {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int PERIOD_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final int SECRET_BYTES = 20;

    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public TotpService() {
        this(Clock.systemUTC());
    }

    TotpService(Clock clock) {
        this.clock = clock;
    }

    public String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        return base32Encode(bytes);
    }

    public String otpauthUri(String issuer, String account, String secret) {
        String encodedIssuer = encode(issuer);
        return "otpauth://totp/" + encodedIssuer + ":" + encode(account) + "?secret=" + secret
                + "&issuer=" + encodedIssuer + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + PERIOD_SECONDS;
    }

    /**
     * Returns the matched time step, accepting one step of drift either side, only when it is
     * strictly greater than {@code lastUsedStep} so a code can never be replayed.
     */
    public OptionalLong verify(String base32Secret, String code, long lastUsedStep) {
        if (code == null || !code.matches("\\d{" + DIGITS + "}")) return OptionalLong.empty();
        byte[] key = base32Decode(base32Secret);
        long current = clock.instant().getEpochSecond() / PERIOD_SECONDS;
        OptionalLong match = OptionalLong.empty();
        for (long step = current - 1; step <= current + 1; step++) {
            boolean equal = MessageDigest.isEqual(
                    codeFor(key, step).getBytes(StandardCharsets.US_ASCII), code.getBytes(StandardCharsets.US_ASCII));
            if (equal && step > lastUsedStep) match = OptionalLong.of(step);
        }
        return match;
    }

    String codeAt(String base32Secret, java.time.Instant at) {
        return codeFor(base32Decode(base32Secret), at.getEpochSecond() / PERIOD_SECONDS);
    }

    private static String codeFor(byte[] key, long step) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(ByteBuffer.allocate(8).putLong(step).array());
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
            return String.format("%0" + DIGITS + "d", binary % 1_000_000);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("TOTP computation failed", e);
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    static String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder();
        int buffer = 0;
        int bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }

    static byte[] base32Decode(String value) {
        ByteBuffer out = ByteBuffer.allocate(value.length() * 5 / 8 + 1);
        int buffer = 0;
        int bits = 0;
        for (char c : value.toCharArray()) {
            int index = BASE32.indexOf(c);
            if (index < 0) throw new IllegalArgumentException("Invalid Base32 secret");
            buffer = (buffer << 5) | index;
            bits += 5;
            if (bits >= 8) {
                out.put((byte) ((buffer >> (bits - 8)) & 0xff));
                bits -= 8;
            }
        }
        byte[] result = new byte[out.position()];
        out.flip();
        out.get(result);
        return result;
    }
}
