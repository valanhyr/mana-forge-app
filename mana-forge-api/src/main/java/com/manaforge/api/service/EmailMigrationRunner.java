package com.manaforge.api.service;

import com.manaforge.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * One-time migration: runs at startup to encrypt any plain-text emails still in the database.
 * Idempotent — already-encrypted values (no '@') are skipped automatically.
 * Can be removed once all environments have been migrated.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailMigrationRunner implements ApplicationRunner {

    private final UserRepository userRepository;
    private final EmailEncryptionService emailEncryptionService;

    @Override
    public void run(ApplicationArguments args) {
        var users = userRepository.findAll();
        int migrated = 0;
        int skipped = 0;

        for (var user : users) {
            String email = user.getEmail();
            if (email == null || email.isEmpty()) {
                skipped++;
                continue;
            }
            if (email.contains("@")) {
                user.setEmail(emailEncryptionService.encrypt(email));
                userRepository.save(user);
                migrated++;
            } else {
                skipped++;
            }
        }

        if (migrated > 0) {
            log.info("Email migration completed: {} encrypted, {} already migrated", migrated, skipped);
        } else {
            log.debug("Email migration: all {} emails already encrypted", skipped);
        }
    }
}
