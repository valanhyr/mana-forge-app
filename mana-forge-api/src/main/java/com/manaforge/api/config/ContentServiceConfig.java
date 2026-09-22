package com.manaforge.api.config;

import com.manaforge.api.service.ContentService;
import com.manaforge.api.service.DirectusContentService;
import com.manaforge.api.service.DirectusService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;

@Configuration
public class ContentServiceConfig {

    @Bean
    @Primary
    @ConditionalOnMissingBean(ContentService.class)
    public ContentService contentService(DirectusService directusService) {
        return new DirectusContentService(directusService);
    }
}
