# Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-stack observability (traces, metrics, logs) to Mana Forge using OpenTelemetry and Grafana Faro, sending data directly to Grafana Cloud.

**Architecture:** Each service sends directly to Grafana Cloud via OTLP over HTTP. Spring Boot uses Micrometer Tracing + OTel bridge (native Spring Boot 4 observability). FastAPI uses the OTel Python SDK configured via env vars. React uses Grafana Faro SDK. All instrumentation is disabled by default (no-op) until credentials are configured.

**Tech Stack:** Spring Boot 4 Micrometer Tracing, `micrometer-tracing-bridge-otel`, `micrometer-registry-otlp`, `opentelemetry-exporter-otlp`, Python `opentelemetry-sdk` + `opentelemetry-instrumentation-fastapi`, `@grafana/faro-web-sdk` + `@grafana/faro-web-tracing`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.env` | Modify | Add Grafana Cloud placeholder vars |
| `docker-compose.yml` | Modify | Pass new env vars to `api` and `engine` containers |
| `mana-forge-api/pom.xml` | Modify | Add OTel + Micrometer OTLP dependencies |
| `mana-forge-api/src/main/resources/application.yaml` | Modify | Configure Micrometer Tracing + OTLP exporters |
| `mana-forge-engine/requirements.txt` | Modify | Add OTel Python packages |
| `mana-forge-engine/main.py` | Modify | Initialize OTel instrumentation when env vars are set |
| `mana-forge-web/src/observability.ts` | Create | Faro initialization — no-op if `VITE_FARO_URL` is unset |
| `mana-forge-web/src/main.tsx` | Modify | Import `./observability` before mounting React |
| `mana-forge-web/.env.development` | Modify | Add empty `VITE_FARO_URL` placeholder |

---

## Task 1: Add Grafana Cloud env vars as placeholders

**Files:**
- Modify: `.env`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add placeholders to `.env`**

Append at the end of `.env` (monorepo root):

```env
# ── Grafana Cloud Observability ──────────────────────────────────────────────
# Set GRAFANA_OTEL_ENABLED=true once you fill in the credentials below.
GRAFANA_OTEL_ENABLED=false
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-eu-west-0.grafana.net/otlp
GRAFANA_OTLP_AUTH=
# VITE_ vars are for the React frontend (Grafana Faro)
VITE_FARO_URL=
VITE_FARO_APP_NAME=mana-forge-web
```

- [ ] **Step 2: Expose vars in `docker-compose.yml` `api` service**

In the `api` service `environment:` block, append:

```yaml
      - GRAFANA_OTEL_ENABLED=${GRAFANA_OTEL_ENABLED:-false}
      - GRAFANA_OTLP_ENDPOINT=${GRAFANA_OTLP_ENDPOINT:-}
      - GRAFANA_OTLP_AUTH=${GRAFANA_OTLP_AUTH:-}
```

- [ ] **Step 3: Expose vars in `docker-compose.yml` `engine` service**

In the `engine` service `environment:` block, append:

```yaml
      - OTEL_SDK_DISABLED=${GRAFANA_OTEL_ENABLED:-true}
      - OTEL_SERVICE_NAME=mana-forge-engine
      - OTEL_EXPORTER_OTLP_ENDPOINT=${GRAFANA_OTLP_ENDPOINT:-}
      - OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic ${GRAFANA_OTLP_AUTH:-}
```

> Note: `OTEL_SDK_DISABLED` is the standard OTel env var. We invert the logic: when `GRAFANA_OTEL_ENABLED=false`, `OTEL_SDK_DISABLED=true`. You'll flip both manually in `.env` when ready.

- [ ] **Step 4: Verify docker-compose parses correctly**

```bash
cd mana-forge
docker compose config | Select-String "GRAFANA|OTEL"
```

Expected: see the 5 new env vars resolved.

- [ ] **Step 5: Commit**

```bash
git add .env docker-compose.yml
git commit -m "chore: add Grafana Cloud observability env vars as placeholders"
```

---

## Task 2: Spring Boot API — Micrometer OTel

**Files:**
- Modify: `mana-forge-api/pom.xml`
- Modify: `mana-forge-api/src/main/resources/application.yaml`

- [ ] **Step 1: Add OTel dependencies to `pom.xml`**

Inside the `<dependencies>` block, after the `spring-boot-starter-actuator` entry, add:

```xml
	<!-- Observability: Micrometer Tracing + OTel bridge -->
	<dependency>
		<groupId>io.micrometer</groupId>
		<artifactId>micrometer-tracing-bridge-otel</artifactId>
	</dependency>

	<!-- OTel OTLP exporter (traces) -->
	<dependency>
		<groupId>io.opentelemetry</groupId>
		<artifactId>opentelemetry-exporter-otlp</artifactId>
	</dependency>

	<!-- Micrometer OTLP registry (metrics) -->
	<dependency>
		<groupId>io.micrometer</groupId>
		<artifactId>micrometer-registry-otlp</artifactId>
	</dependency>
```

> All three are version-managed by the Spring Boot BOM — no explicit versions needed.

- [ ] **Step 2: Verify the API still compiles**

```bash
cd mana-forge-api
./mvnw clean package -DskipTests
```

Expected: `BUILD SUCCESS`

- [ ] **Step 3: Configure OTel in `application.yaml`**

Replace the existing `management:` block (currently only exposes `health`) with:

```yaml
management:
  tracing:
    enabled: ${GRAFANA_OTEL_ENABLED:false}
    sampling:
      probability: 1.0
  otlp:
    tracing:
      endpoint: ${GRAFANA_OTLP_ENDPOINT:https://otlp-gateway-prod-eu-west-0.grafana.net/otlp}/v1/traces
      headers:
        authorization: "Basic ${GRAFANA_OTLP_AUTH:}"
    metrics:
      export:
        url: ${GRAFANA_OTLP_ENDPOINT:https://otlp-gateway-prod-eu-west-0.grafana.net/otlp}/v1/metrics
        headers:
          authorization: "Basic ${GRAFANA_OTLP_AUTH:}"
  logging:
    export:
      otlp:
        endpoint: ${GRAFANA_OTLP_ENDPOINT:https://otlp-gateway-prod-eu-west-0.grafana.net/otlp}/v1/logs
        headers:
          authorization: "Basic ${GRAFANA_OTLP_AUTH:}"
  endpoints:
    web:
      exposure:
        include: health, metrics
  endpoint:
    health:
      show-details: never
```

- [ ] **Step 4: Build again to verify yaml is valid**

```bash
./mvnw clean package -DskipTests
```

Expected: `BUILD SUCCESS`

- [ ] **Step 5: Run tests to confirm nothing is broken**

```bash
./mvnw test
```

Expected: all tests pass (OTel is disabled by default so no network calls are made).

- [ ] **Step 6: Commit**

```bash
cd ..
git add mana-forge-api/pom.xml mana-forge-api/src/main/resources/application.yaml
git commit -m "feat(api): add Micrometer OTel exporter for Grafana Cloud"
```

---

## Task 3: FastAPI Engine — OpenTelemetry Python

**Files:**
- Modify: `mana-forge-engine/requirements.txt`
- Modify: `mana-forge-engine/main.py`

- [ ] **Step 1: Add OTel packages to `requirements.txt`**

Append at the end of `mana-forge-engine/requirements.txt`:

```
opentelemetry-sdk>=1.25.0
opentelemetry-instrumentation-fastapi>=0.46b0
opentelemetry-exporter-otlp-proto-http>=1.25.0
```

- [ ] **Step 2: Install the new packages locally**

```bash
cd mana-forge-engine
.\venv\Scripts\activate
pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 3: Add OTel setup function to `main.py`**

Add the imports and setup function after the existing imports and before `app = FastAPI(...)`:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor


def _setup_otel(fastapi_app: FastAPI) -> None:
    """Initialize OTel tracing only when OTEL_SDK_DISABLED != 'true'."""
    if os.environ.get("OTEL_SDK_DISABLED", "true").lower() == "true":
        return
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    if not endpoint:
        return
    headers_raw = os.environ.get("OTEL_EXPORTER_OTLP_HEADERS", "")
    headers = {}
    for part in headers_raw.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            headers[k.strip()] = v.strip()
    provider = TracerProvider()
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers))
    )
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(fastapi_app)
    logger.info("OpenTelemetry tracing initialized → %s", endpoint)
```

- [ ] **Step 4: Call `_setup_otel` after `app` is created**

After `app = FastAPI(title="Mana Forge Engine", version="1.0.0")`, add:

```python
_setup_otel(app)
```

- [ ] **Step 5: Verify the engine starts without errors**

```bash
python main.py
```

Expected: server starts, log shows `INFO: Application startup complete` — no OTel errors (it is disabled by default).

- [ ] **Step 6: Commit**

```bash
cd ..
git add mana-forge-engine/requirements.txt mana-forge-engine/main.py
git commit -m "feat(engine): add OpenTelemetry tracing for Grafana Cloud"
```

---

## Task 4: React Frontend — Grafana Faro SDK

**Files:**
- Create: `mana-forge-web/src/observability.ts`
- Modify: `mana-forge-web/src/main.tsx`
- Modify: `mana-forge-web/.env.development`

- [ ] **Step 1: Install Faro packages**

```bash
cd mana-forge-web
npm install @grafana/faro-web-sdk @grafana/faro-web-tracing
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Create `src/observability.ts`**

```typescript
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faroUrl = import.meta.env.VITE_FARO_URL as string | undefined;

if (faroUrl) {
  initializeFaro({
    url: faroUrl,
    app: {
      name: (import.meta.env.VITE_FARO_APP_NAME as string) || 'mana-forge-web',
      version: '1.0.0',
      environment: import.meta.env.MODE,
    },
    instrumentations: [
      ...getWebInstrumentations({ captureConsole: true }),
      new TracingInstrumentation(),
    ],
  });
}
```

- [ ] **Step 3: Import observability in `main.tsx` before React mounts**

Replace the content of `mana-forge-web/src/main.tsx` with:

```tsx
import './observability';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Add empty placeholder to `.env.development`**

Append to `mana-forge-web/.env.development`:

```env
# Grafana Faro — leave empty to disable in local dev
VITE_FARO_URL=
VITE_FARO_APP_NAME=mana-forge-web
```

- [ ] **Step 5: Verify TypeScript build passes**

```bash
npm run build
```

Expected: `vite build` completes with no TypeScript errors.

- [ ] **Step 6: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd ..
git add mana-forge-web/src/observability.ts mana-forge-web/src/main.tsx mana-forge-web/.env.development mana-forge-web/package.json mana-forge-web/package-lock.json
git commit -m "feat(web): add Grafana Faro SDK for frontend observability"
```

---

## Task 5: Final build verification

- [ ] **Step 1: Build all three services**

```bash
cd mana-forge-api && ./mvnw clean package -DskipTests && cd ..
cd mana-forge-web && npm run build && cd ..
cd mana-forge-engine && pip install -r requirements.txt && cd ..
```

Expected: all three complete without errors.

- [ ] **Step 2: Rebuild Docker images and verify containers start**

```bash
docker compose build --no-cache
docker compose up -d
docker compose ps
```

Expected: all 4 containers show `Up`.

- [ ] **Step 3: Verify API health endpoint**

```bash
curl http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`

- [ ] **Step 4: Verify engine health endpoint**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok","service":"mana-forge-engine"}`

- [ ] **Step 5: Push**

```bash
git push
```

---

## Enabling observability (post-credential setup)

Once you have the Grafana Cloud credentials:

1. In `.env`, set ALL of the following:
   ```env
   # Enable OTel for Spring Boot API
   GRAFANA_OTEL_ENABLED=true
   # Enable OTel for FastAPI engine (separate flag — Docker Compose can't invert booleans)
   OTEL_SDK_DISABLED=false
   # Grafana Cloud credentials
   GRAFANA_OTLP_AUTH=<base64(instanceId:apiToken)>  # base64("instanceId:apiToken")
   VITE_FARO_URL=https://faro-collector-prod-eu-west-0.grafana.net/collect/<app-key>
   ```
2. Rebuild and restart: `docker compose up -d --build`
3. In the frontend, rebuild: `npm run build` (the `VITE_FARO_URL` is baked in at build time)
