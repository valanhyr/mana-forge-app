package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

/** Safe public projection of a user — no email, no password, no internal tokens. */
@Data
@Builder
public class PublicUserDto {
    private String userId;
    private String name;
    private String username;
    private String biography;
    private String avatar;
}
