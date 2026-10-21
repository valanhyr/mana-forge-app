package com.manaforge.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Allowlist for public registration; persistence fields are never bound from JSON. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegisterUserRequest(@NotBlank String username, @NotBlank @Email String email,
                                  @NotBlank @Size(min = 6) String password, String name,
                                  String biography, String avatar, Boolean betaAccepted) {}
