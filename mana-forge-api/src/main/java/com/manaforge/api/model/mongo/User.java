package com.manaforge.api.model.mongo;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;
    private String name;
    private String username;
    private String password;
    private String email;
    private String biography;
    private Boolean active;
    private Boolean validated;
    private String[] friends;

    public User(
        String name,
        String username,
        String password,
        String email,
        String biography,
        Boolean active,
        Boolean validated,
        String[] friends
    ) {
        this.name = name;
        this.username = username;
        this.password = password;
        this.email = email;
        this.biography = biography;
        this.active = active;
        this.validated = validated;
        this.friends = friends;
    }
}