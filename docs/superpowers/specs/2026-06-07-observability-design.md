# Observability Design — Mana Forge

**Date:** 2026-06-07  
**Status:** Approved  
**Scope:** Full-stack observability (traces, metrics, logs) via Grafana Cloud + OpenTelemetry

---

## Context

Mana Forge is a monorepo with three services:
- `mana-forge-web` — React 19 + Vite (frontend)
- `mana-forge-api` — Spring Boot 4 + Java 25 (backend)
- `mana-forge-engine` — FastAPI + Python 3.11 (AI engine)

The team already has a Grafana Cloud instance at `manaforge01.grafana.net` with Tempo enabled for distributed traces.

---

## Goals

- Traces: distributed request tracing across all three services
- Metrics: JVM/HTTP/AI latency metrics in Grafana dashboards
- Logs: structured logs forwarded to Grafana Cloud Loki
- Frontend: Real User Monitoring (Web Vitals, JS errors, navigation, HTTP calls)
- Zero overhead when credentials are not set (feature-flagged via env vars)

---

## Architecture

```
mana-forge-web    ──Faro HTTP──► Grafana Cloud Faro Collector  (RUM + traces)
mana-forge-api    ──OTLP HTTP──► Grafana Cloud OTLP Gateway   (Tempo + Mimir + Loki)
mana-forge-engine ──OTLP HTTP──► Grafana Cloud OTLP Gateway   (Tempo + Mimir + Loki)
```

Each service sends directly to Grafana Cloud. No local collector/sidecar. Credentials live in `.env` as placeholders.

---

## Environment Variables

Added to `.env` (root monorepo):

```env
# Grafana Cloud Observability
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-eu-west-0.grafana.net/otlp
GRAFANA_OTLP_AUTH=                     # Base64("instanceId:apiToken") — leave empty to disable
VITE_FARO_URL=                         # https://faro-collector-...grafana.net/collect/<app-key>
```

- `GRAFANA_OTLP_AUTH` is the HTTP Basic auth header value: `base64(instanceId + ":" + apiToken)`
- When `GRAFANA_OTLP_AUTH` is empty, Spring Boot and FastAPI skip OTel initialization
- When `VITE_FARO_URL` is empty, Faro is not initialized in the browser

---

## Service Implementations

### 1. Frontend — Grafana Faro SDK

**Files modified:**
- `mana-forge-web/src/observability.ts` (new) — Faro initialization, no-op if `VITE_FARO_URL` is unset
- `mana-forge-web/src/main.tsx` — imports `./observability` before mounting React

**Dependencies added:**
```json
"@grafana/faro-web-sdk": "^1.x",
"@grafana/faro-web-tracing": "^1.x"
```

**Captures automatically:**
- Web Vitals (LCP, FID, CLS, TTFB)
- Unhandled JS errors and promise rejections
- React Router navigation events
- Outgoing fetch/XHR calls (correlates with backend traces)
- User sessions (for funnel analysis in Grafana)

---

### 2. Spring Boot API — OTel Spring Boot Starter + Micrometer OTLP

**Files modified:**
- `mana-forge-api/pom.xml` — add `opentelemetry-spring-boot-starter` + `micrometer-registry-otlp`
- `mana-forge-api/src/main/resources/application.yaml` — OTel exporter config

**Dependencies added:**
```xml
<dependency>
  <groupId>io.opentelemetry.instrumentation</groupId>
  <artifactId>opentelemetry-spring-boot-starter</artifactId>
  <version>2.14.0</version>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-otlp</artifactId>
</dependency>
```

**Config in `application.yaml`:**
```yaml
otel:
  service:
    name: mana-forge-api
  exporter:
    otlp:
      endpoint: ${GRAFANA_OTLP_ENDPOINT:}
      headers:
        authorization: Basic ${GRAFANA_OTLP_AUTH:}
  sdk:
    disabled: ${GRAFANA_OTLP_AUTH:} == ""  # disabled if auth is empty

management:
  otlp:
    metrics:
      export:
        url: ${GRAFANA_OTLP_ENDPOINT:}/v1/metrics
        headers:
          authorization: Basic ${GRAFANA_OTLP_AUTH:}
  endpoints:
    web:
      exposure:
        include: health, metrics
```

**Instrumented automatically:** HTTP requests, MongoDB operations, Redis calls, Spring Security, scheduled tasks.

---

### 3. FastAPI Engine — OpenTelemetry Python

**Files modified:**
- `mana-forge-engine/requirements.txt` — add OTel packages
- `mana-forge-engine/main.py` — initialize OTel on startup if env vars present

**Dependencies added:**
```
opentelemetry-sdk>=1.25.0
opentelemetry-instrumentation-fastapi>=0.46b0
opentelemetry-exporter-otlp-proto-http>=1.25.0
```

**Initialization pattern:**
```python
# Only initialize if credentials are configured
if os.environ.get("GRAFANA_OTLP_ENDPOINT") and os.environ.get("GRAFANA_OTLP_AUTH"):
    setup_otel(app)
```

**Captures:** all FastAPI request/response spans, Groq API call durations, AI latency per endpoint.

---

## Trace Propagation

The Spring API calls the FastAPI engine via HTTP. OTel W3C `traceparent` headers are propagated automatically by the Spring OTel starter, and the FastAPI instrumentor picks them up — creating a single distributed trace across both services.

The Faro frontend SDK injects `traceparent` into outgoing Axios calls, linking browser sessions to backend traces.

---

## Feature Flag Strategy

All three services check for the presence of credentials before enabling OTel:
- **Frontend:** `if (!import.meta.env.VITE_FARO_URL) return` — no-op in dev by default
- **Spring Boot:** `otel.sdk.disabled` evaluates to `true` when auth is empty
- **FastAPI:** explicit `if env vars present` guard in `main.py`

This means the app runs normally in local development without any Grafana Cloud credentials configured.

---

## Out of Scope

- Grafana Alloy / local collector (decided against)
- Redis metrics (not instrumented in this phase)
- Custom business metrics (deck analyses per day, etc.) — future phase
- Alert rules in Grafana Cloud — future phase
