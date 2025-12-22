package com.manaforge.api.controller;

import com.manaforge.api.model.mongo.User;
import com.manaforge.api.repository.UserRepository;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/users")
public class UserController extends BaseMongoController<User, String> {

    private final UserRepository userRepository;

    public UserController(UserRepository repository) {
        super(repository);
        this.userRepository = repository;
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<User> getByUsername(@PathVariable String username) {
        return userRepository.findByUsername(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}