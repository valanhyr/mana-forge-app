package com.manaforge.api.config;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.ClassUtils;

import static org.assertj.core.api.Assertions.assertThat;

class TelemetryDisabledTest {
    @Test
    void grafanaEnvironmentCannotEnableTheRepositoryExportConfiguration() throws Exception {
        var env = new StandardEnvironment();
        env.getPropertySources().addFirst(new MapPropertySource("former-grafana-configuration", Map.of(
                "GRAFANA_OTEL_ENABLED", "true",
                "GRAFANA_OTLP_ENDPOINT", "http://127.0.0.1:9",
                "GRAFANA_OTLP_AUTH", "test-placeholder")));
        var yaml = new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yaml"));
        yaml.forEach(env.getPropertySources()::addLast);

        assertThat(env.getProperty("management.tracing.enabled", Boolean.class)).isFalse();
        assertThat(env.getProperty("management.otlp.metrics.export.enabled", Boolean.class)).isFalse();
        assertThat(env.getProperty("management.logging.export.enabled", Boolean.class)).isFalse();
        assertThat(env.getProperty("management.endpoints.web.exposure.include")).contains("health");
    }

    @Test
    void repositoryRuntimeDoesNotIncludeOtlpExporters() {
        var loader = getClass().getClassLoader();
        assertThat(ClassUtils.isPresent(
                "io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter", loader)).isFalse();
        assertThat(ClassUtils.isPresent(
                "io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter", loader)).isFalse();
        assertThat(ClassUtils.isPresent(
                "io.opentelemetry.exporter.otlp.http.logs.OtlpHttpLogRecordExporter", loader)).isFalse();
        assertThat(ClassUtils.isPresent(
                "io.micrometer.registry.otlp.OtlpMeterRegistry", loader)).isFalse();
    }
}
