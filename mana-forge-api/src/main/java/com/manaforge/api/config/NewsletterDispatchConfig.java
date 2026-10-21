package com.manaforge.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class NewsletterDispatchConfig {
    // Do not replace Boot's default async executor used by account/transactional emails.
    @Bean(defaultCandidate = false)
    public ThreadPoolTaskExecutor newsletterExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("newsletter-");
        return executor;
    }
}
