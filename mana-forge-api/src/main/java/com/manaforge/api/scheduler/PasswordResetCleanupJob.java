package com.manaforge.api.scheduler;

import com.manaforge.api.repository.PasswordResetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class PasswordResetCleanupJob {
    private final PasswordResetRepository passwordResetRepository;

    // Runs every hour
    @Scheduled(cron = "0 0 * * * *")
    public void cleanExpired() {
        Instant cutoff = Instant.now();
        passwordResetRepository.deleteAllByExpiresAtBefore(cutoff);
        log.info("PasswordResetCleanupJob ran at {}", cutoff);
    }
}
