package com.manaforge.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDto {
    private String userId;
    private String name;
    private String username;
    private String email;
    private String biography;
    private String[] friends;
    private String avatar;
}
