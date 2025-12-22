package com.manaforge.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class ManaForgeApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManaForgeApiApplication.class, args);
    }
}