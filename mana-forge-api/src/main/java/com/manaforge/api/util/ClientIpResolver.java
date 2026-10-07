package com.manaforge.api.util;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the real client IP for per-IP abuse controls.
 *
 * <p>Order matters. Behind Cloudflare the socket address is the Cloudflare edge,
 * so {@code CF-Connecting-IP} is authoritative — Cloudflare sets it itself and
 * strips any inbound value, so a client cannot forge it.
 * {@code X-Forwarded-For} is only a fallback because it is client-controlled
 * unless every proxy in front of us overwrites it.
 *
 * <p>Shared by {@code RateLimitingInterceptor}, {@code DeckController} and
 * {@code ContactController}: the three controls that key on IP must agree, or a
 * caller could look anonymous to one and identified to another.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank()) {
            return cfIp.trim();
        }
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}