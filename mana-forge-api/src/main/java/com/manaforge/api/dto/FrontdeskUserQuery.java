package com.manaforge.api.dto;

import java.util.Locale;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.service.FrontdeskBadRequestException;

/**
 * Validated filters for the Frontdesk user directory. Parsing lives here so the
 * controller stays a thin adapter and every rejection has a stable code.
 */
public record FrontdeskUserQuery(String query, UserSort sort, SortDir dir, User.Tier tier,
                                 User.AccountStatus status, boolean quotaExhausted) {

    public enum UserSort { OPEN_TICKETS, AI_USAGE_TODAY, TOTAL_DECKS, USERNAME, CREATED_AT, LAST_LOGIN }

    public enum SortDir { ASC, DESC }

    /** No parameters means the same alphabetical order the endpoint has always returned. */
    public static FrontdeskUserQuery defaults(String query) {
        return new FrontdeskUserQuery(query, UserSort.USERNAME, SortDir.ASC, null, null, false);
    }

    public static FrontdeskUserQuery parse(String query, String sort, String dir, String tier,
                                           String status, String quota) {
        return new FrontdeskUserQuery(query, parseSort(sort), parseDir(dir), parseTier(tier),
                parseStatus(status), parseQuota(quota));
    }

    private static UserSort parseSort(String raw) {
        if (isBlank(raw)) return UserSort.USERNAME;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "opentickets" -> UserSort.OPEN_TICKETS;
            case "aiusagetoday" -> UserSort.AI_USAGE_TODAY;
            case "totaldecks" -> UserSort.TOTAL_DECKS;
            case "username" -> UserSort.USERNAME;
            case "createdat" -> UserSort.CREATED_AT;
            case "lastloginat" -> UserSort.LAST_LOGIN;
            default -> throw new FrontdeskBadRequestException("INVALID_SORT", "Unknown user sort: " + raw);
        };
    }

    private static SortDir parseDir(String raw) {
        if (isBlank(raw)) return SortDir.DESC;
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "asc" -> SortDir.ASC;
            case "desc" -> SortDir.DESC;
            default -> throw new FrontdeskBadRequestException("INVALID_SORT_DIRECTION", "Unknown sort direction: " + raw);
        };
    }

    private static User.Tier parseTier(String raw) {
        if (isBlank(raw)) return null;
        try {
            return User.Tier.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new FrontdeskBadRequestException("INVALID_TIER", "Unknown user tier: " + raw);
        }
    }

    private static User.AccountStatus parseStatus(String raw) {
        if (isBlank(raw)) return null;
        try {
            return User.AccountStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new FrontdeskBadRequestException("INVALID_STATUS", "Unknown user status: " + raw);
        }
    }

    private static boolean parseQuota(String raw) {
        if (isBlank(raw)) return false;
        if ("exhausted".equalsIgnoreCase(raw.trim())) return true;
        throw new FrontdeskBadRequestException("INVALID_QUOTA_FILTER", "Unknown quota filter: " + raw);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
