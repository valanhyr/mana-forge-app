package com.manaforge.api.integration;

import com.manaforge.api.service.AiService;
import com.manaforge.api.service.CardBulkLoadService;
import com.manaforge.api.service.ContentService;
import com.manaforge.api.service.EmailService;
import com.manaforge.api.service.FormatService;
import com.manaforge.api.service.ScryfallService;
import java.util.Arrays;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest(properties = {
        "GRAFANA_OTEL_ENABLED=true",
        "GRAFANA_OTLP_ENDPOINT=http://127.0.0.1:9",
        "GRAFANA_OTLP_AUTH=test-placeholder"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TelemetryDisabledIntegrationTest {
    @Autowired private ApplicationContext context;
    @Autowired private Environment environment;
    @Autowired private MockMvc mockMvc;

    @MockitoBean private ScryfallService scryfallService;
    @MockitoBean private AiService aiService;
    @MockitoBean private ContentService contentService;
    @MockitoBean private FormatService formatService;
    @MockitoBean private EmailService emailService;
    @MockitoBean private CardBulkLoadService cardBulkLoadService;

    @Test
    void runningContextHasNoOtlpExportersAndStillExposesHealth() throws Exception {
        assertThat(environment.getProperty("management.tracing.enabled", Boolean.class)).isFalse();
        assertThat(environment.getProperty("management.otlp.metrics.export.enabled", Boolean.class)).isFalse();
        assertThat(environment.getProperty("management.logging.export.enabled", Boolean.class)).isFalse();
        var exporters = Arrays.stream(context.getBeanDefinitionNames())
                .map(context::getType)
                .filter(Objects::nonNull)
                .map(Class::getName)
                .filter(name -> name.startsWith("io.opentelemetry.exporter.otlp.")
                        || name.startsWith("io.micrometer.registry.otlp."))
                .toList();
        assertThat(exporters).isEmpty();
        int healthStatus = mockMvc.perform(get("/actuator/health")).andReturn().getResponse().getStatus();
        // A missing local dependency may make health DOWN, but the endpoint must remain reachable.
        assertThat(healthStatus).isIn(200, 503);
    }
}
