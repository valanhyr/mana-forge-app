package com.manaforge.api.dto;

import com.manaforge.api.dto.FrontdeskUserQuery.SortDir;
import com.manaforge.api.dto.FrontdeskUserQuery.UserSort;
import com.manaforge.api.model.mongo.User;
import com.manaforge.api.service.FrontdeskBadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FrontdeskUserQueryTest {

    @Test
    void defaultsKeepTheLegacyAlphabeticalOrder() {
        var query = FrontdeskUserQuery.defaults("urza");
        assertThat(query.query()).isEqualTo("urza");
        assertThat(query.sort()).isEqualTo(UserSort.USERNAME);
        assertThat(query.dir()).isEqualTo(SortDir.ASC);
        assertThat(query.tier()).isNull();
        assertThat(query.status()).isNull();
        assertThat(query.quotaExhausted()).isFalse();
    }

    @Test
    void parsesSortDirectionAndFiltersCaseInsensitively() {
        var query = FrontdeskUserQuery.parse("urza", "openTickets", "DESC", "patreon", "suspended", "exhausted");
        assertThat(query.sort()).isEqualTo(UserSort.OPEN_TICKETS);
        assertThat(query.dir()).isEqualTo(SortDir.DESC);
        assertThat(query.tier()).isEqualTo(User.Tier.PATREON);
        assertThat(query.status()).isEqualTo(User.AccountStatus.SUSPENDED);
        assertThat(query.quotaExhausted()).isTrue();

        assertThat(FrontdeskUserQuery.parse(null, "aiUsageToday", null, null, null, null).dir())
                .isEqualTo(SortDir.DESC);
        assertThat(FrontdeskUserQuery.parse(null, "totalDecks", "asc", null, null, null).sort())
                .isEqualTo(UserSort.TOTAL_DECKS);
        assertThat(FrontdeskUserQuery.parse(null, "createdAt", null, null, null, null).sort())
                .isEqualTo(UserSort.CREATED_AT);
        assertThat(FrontdeskUserQuery.parse(null, "lastLoginAt", null, null, null, null).sort())
                .isEqualTo(UserSort.LAST_LOGIN);
    }

    @Test
    void blankValuesFallBackInsteadOfFailing() {
        var query = FrontdeskUserQuery.parse(null, " ", "", " ", "", " ");
        assertThat(query.sort()).isEqualTo(UserSort.USERNAME);
        assertThat(query.dir()).isEqualTo(SortDir.DESC);
        assertThat(query.tier()).isNull();
        assertThat(query.status()).isNull();
        assertThat(query.quotaExhausted()).isFalse();
    }

    @Test
    void rejectsUnknownValuesWithStableCodes() {
        assertThatThrownBy(() -> FrontdeskUserQuery.parse(null, "popularity", null, null, null, null))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INVALID_SORT"));
        assertThatThrownBy(() -> FrontdeskUserQuery.parse(null, null, "sideways", null, null, null))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INVALID_SORT_DIRECTION"));
        assertThatThrownBy(() -> FrontdeskUserQuery.parse(null, null, null, "GOLD", null, null))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INVALID_TIER"));
        assertThatThrownBy(() -> FrontdeskUserQuery.parse(null, null, null, null, "DELETED", null))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INVALID_STATUS"));
        assertThatThrownBy(() -> FrontdeskUserQuery.parse(null, null, null, null, null, "some"))
                .isInstanceOfSatisfying(FrontdeskBadRequestException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INVALID_QUOTA_FILTER"));
    }
}
