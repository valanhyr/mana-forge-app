# Observability Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete observability in the monorepo by adding frontend RUM/tracing, wiring observability env vars through the web build, and exposing real container health checks for web, API, and engine.

**Architecture:** Keep the current direct-to-Grafana-cloud approach. The React app initializes Grafana Faro only when `VITE_FARO_URL` is present, while the existing Spring Boot and FastAPI OTLP wiring stays feature-flagged behind environment variables. Docker Compose becomes the integration point that passes frontend observability config at build time and uses service health checks instead of startup-only sequencing.

**Tech Stack:** React 19 + Vite + Vitest, Spring Boot 4 + Actuator, FastAPI + OpenTelemetry Python, Docker Compose, Nginx, Grafana Faro, Grafana Cloud OTLP

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `mana-forge-web/package.json` | Modify | Add Grafana Faro SDK dependencies |
| `mana-forge-web/src/observability.ts` | Create | Initialize Faro conditionally and register browser instrumentations |
| `mana-forge-web/src/main.tsx` | Modify | Load observability bootstrap before React mounts |
| `mana-forge-web/.env.development` | Modify | Add local placeholders for Faro config |
| `mana-forge-web/src/__tests__/observability.test.ts` | Create | Verify observability bootstrap no-ops without config |
| `docker-compose.yml` | Modify | Pass `VITE_FARO_*` build args and add container health checks |
| `mana-forge-web/Dockerfile` | Modify | Accept Faro build args |
| `mana-forge-web/nginx.conf` | Modify | Add a lightweight Nginx health endpoint |
| `mana-forge-api/Dockerfile` | Modify | Install curl and add runtime health check |
| `mana-forge-engine/Dockerfile` | Modify | Add runtime health check for `/health` |
| `README.md` | Modify | Document how to enable observability and what remains feature-flagged |

---

### Task 1: Add frontend RUM and browser-side tracing

**Files:**
- Modify: `mana-forge-web/package.json`
- Create: `mana-forge-web/src/observability.ts`
- Modify: `mana-forge-web/src/main.tsx`
- Modify: `mana-forge-web/.env.development`
- Test: `mana-forge-web/src/__tests__/observability.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mana-forge-web/src/__tests__/observability.test.ts` with:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const initializeFaro = vi.fn();
const getWebInstrumentations = vi.fn(() => []);
const TracingInstrumentation = vi.fn(() => ({ name: 'tracing' }));

vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro,
  getWebInstrumentations,
}));

vi.mock('@grafana/faro-web-tracing', () => ({
  TracingInstrumentation,
}));

describe('observability bootstrap', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    initializeFaro.mockClear();
    getWebInstrumentations.mockClear();
    TracingInstrumentation.mockClear();
  });

  it('does not initialize Faro when VITE_FARO_URL is missing', async () => {
    vi.stubEnv('VITE_FARO_URL', '');
    vi.stubEnv('VITE_FARO_APP_NAME', 'mana-forge-web');
    vi.stubEnv('MODE', 'test');

    await import('../observability');

    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it('initializes Faro when VITE_FARO_URL is present', async () => {
    vi.stubEnv('VITE_FARO_URL', 'https://collector.example/collect/app');
    vi.stubEnv('VITE_FARO_APP_NAME', 'mana-forge-web');
    vi.stubEnv('MODE', 'production');

    await import('../observability');

    expect(getWebInstrumentations).toHaveBeenCalledWith({ captureConsole: true });
    expect(TracingInstrumentation).toHaveBeenCalled();
    expect(initializeFaro).toHaveBeenCalledWith({
      url: 'https://collector.example/collect/app',
      app: {
        name: 'mana-forge-web',
        version: '1.0.12',
        environment: 'production',
      },
      instrumentations: [{ name: 'tracing' }],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd mana-forge-web
npm test -- src/__tests__/observability.test.ts
```

Expected: FAIL with module resolution errors because `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`, and `src/observability.ts` do not exist yet.

- [ ] **Step 3: Add the dependencies**

Update `mana-forge-web/package.json` dependencies to include:

```json
{
  "dependencies": {
    "@grafana/faro-web-sdk": "^1.19.0",
    "@grafana/faro-web-tracing": "^1.19.0",
    "@tanstack/react-query": "^5.90.12",
    "@types/dompurify": "^3.0.5",
    "axios": "^1.13.2",
    "dompurify": "^3.4.1",
    "lucide-react": "^0.562.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.11.0",
    "zustand": "^5.0.9"
  }
}
```

Then install them:

```bash
cd mana-forge-web
npm install
```

- [ ] **Step 4: Write the minimal implementation**

Create `mana-forge-web/src/observability.ts` with:

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faroUrl = import.meta.env.VITE_FARO_URL as string | undefined;

if (faroUrl) {
  initializeFaro({
    url: faroUrl,
    app: {
      name: (import.meta.env.VITE_FARO_APP_NAME as string) || 'mana-forge-web',
      version: '1.0.12',
      environment: import.meta.env.MODE,
    },
    instrumentations: [
      ...getWebInstrumentations({ captureConsole: true }),
      new TracingInstrumentation(),
    ],
  });
}
```

Replace `mana-forge-web/src/main.tsx` with:

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

Append to `mana-forge-web/.env.development`:

```env
VITE_FARO_URL=
VITE_FARO_APP_NAME=mana-forge-web
```

- [ ] **Step 5: Run tests and build to verify the feature works**

Run:

```bash
cd mana-forge-web
npm test -- src/__tests__/observability.test.ts
npm run build
```

Expected: test PASS, then Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git add mana-forge-web/package.json mana-forge-web/package-lock.json mana-forge-web/src/observability.ts mana-forge-web/src/main.tsx mana-forge-web/.env.development mana-forge-web/src/__tests__/observability.test.ts
git commit -m "feat(web): add frontend observability bootstrap"
```

---

### Task 2: Wire Faro configuration through Docker and expose a web health endpoint

**Files:**
- Modify: `docker-compose.yml`
- Modify: `mana-forge-web/Dockerfile`
- Modify: `mana-forge-web/nginx.conf`

- [ ] **Step 1: Write the failing infrastructure check**

Run:

```bash
docker compose config
```

Expected: current output shows the `web` build only passes `VITE_API_URL=/api`; there are no `VITE_FARO_URL` or `VITE_FARO_APP_NAME` build args, and there is no dedicated Nginx health endpoint.

- [ ] **Step 2: Update Docker Compose build args and health checks**

Update the `web` service in `docker-compose.yml` to:

```yaml
  web:
    image: ${WEB_IMAGE:-ghcr.io/valanhyr/mana-forge-web:latest}
    build:
      context: ./mana-forge-web
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=/api
        - VITE_FARO_URL=${VITE_FARO_URL:-}
        - VITE_FARO_APP_NAME=${VITE_FARO_APP_NAME:-mana-forge-web}
    container_name: mana-forge-web-1
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      api:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost/healthz"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: always
    networks:
      - mana-forge-network
```

- [ ] **Step 3: Accept the new build args in the web Dockerfile**

Replace the build-arg block in `mana-forge-web/Dockerfile` with:

```dockerfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_FARO_URL
ENV VITE_FARO_URL=$VITE_FARO_URL

ARG VITE_FARO_APP_NAME
ENV VITE_FARO_APP_NAME=$VITE_FARO_APP_NAME
```

- [ ] **Step 4: Add a lightweight Nginx health endpoint**

Insert this block inside the `server` section of `mana-forge-web/nginx.conf`, before `location /`:

```nginx
        location = /healthz {
            access_log off;
            add_header Content-Type text/plain;
            return 200 'ok';
        }
```

- [ ] **Step 5: Validate the Compose wiring**

Run:

```bash
docker compose config
docker compose build web
```

Expected: rendered config includes `VITE_FARO_URL` and `VITE_FARO_APP_NAME` under the web build args, and the `web` image build succeeds.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml mana-forge-web/Dockerfile mana-forge-web/nginx.conf
git commit -m "chore(web): wire frontend observability env and healthcheck"
```

---

### Task 3: Add API and engine container health checks

**Files:**
- Modify: `docker-compose.yml`
- Modify: `mana-forge-api/Dockerfile`
- Modify: `mana-forge-engine/Dockerfile`

- [ ] **Step 1: Write the failing infrastructure check**

Run:

```bash
docker compose config
```

Expected: current `api` and `engine` services do not include `healthcheck`, and the `api` service waits only on `service_started`.

- [ ] **Step 2: Add curl to the API runtime image and define the health check**

Replace `mana-forge-api/Dockerfile` with:

```dockerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 3: Add the engine health check**

Replace the tail of `mana-forge-engine/Dockerfile` with:

```dockerfile
EXPOSE 8000

RUN useradd -m appuser && chown -R appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Update Compose dependencies to use health-based sequencing**

Replace the `api` and `engine` sections in `docker-compose.yml` with:

```yaml
  api:
    image: ${API_IMAGE:-ghcr.io/valanhyr/mana-forge-api:latest}
    build:
      context: ./mana-forge-api
      dockerfile: Dockerfile
    container_name: mana-forge-api-1
    ports:
      - "8080:8080"
    environment:
      - SERVICES_PYTHON_ENGINE_URL=http://engine:8000
      - FRONTEND_URL=${FRONTEND_URL}
      - STRAPI_API_URL=${STRAPI_API_URL}
      - STRAPI_API_TOKEN=${STRAPI_API_TOKEN}
      - MONGODB_URI=${MONGODB_URI}
      - SPRING_DATA_MONGODB_URI=${MONGODB_URI}
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - SESSION_STORE_TYPE=redis
      - SMTP_HOST=${SMTP_HOST:-smtp.resend.com}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_USERNAME=${SMTP_USERNAME:-resend}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - SMTP_FROM=${SMTP_FROM}
      - MAIL_ADMIN=${MAIL_ADMIN}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - EMAIL_ENCRYPTION_KEY=${EMAIL_ENCRYPTION_KEY}
      - GRAFANA_OTEL_ENABLED=${GRAFANA_OTEL_ENABLED:-false}
      - GRAFANA_OTLP_ENDPOINT=${GRAFANA_OTLP_ENDPOINT:-}
      - GRAFANA_OTLP_AUTH=${GRAFANA_OTLP_AUTH:-}
    depends_on:
      engine:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 40s
    restart: always
    networks:
      - mana-forge-network

  engine:
    image: ${ENGINE_IMAGE:-ghcr.io/valanhyr/mana-forge-engine:latest}
    build:
      context: ./mana-forge-engine
      dockerfile: Dockerfile
    container_name: mana-forge-engine-1
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - OTEL_SDK_DISABLED=${OTEL_SDK_DISABLED:-true}
      - OTEL_SERVICE_NAME=mana-forge-engine
      - OTEL_EXPORTER_OTLP_ENDPOINT=${GRAFANA_OTLP_ENDPOINT:-}
      - OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic ${GRAFANA_OTLP_AUTH:-}
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
    restart: always
    networks:
      - mana-forge-network
```

- [ ] **Step 5: Verify the containers report healthy**

Run:

```bash
docker compose build api engine
docker compose up -d api engine web
docker compose ps
curl http://localhost:8080/actuator/health
curl http://localhost/healthz
```

Expected: `api`, `engine`, and `web` show `healthy` in `docker compose ps`; the two curl commands return HTTP 200.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml mana-forge-api/Dockerfile mana-forge-engine/Dockerfile
git commit -m "chore: add health checks across services"
```

---

### Task 4: Document activation and operational verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the failing documentation check**

Run:

```bash
rg -n "Faro|observability|GRAFANA_OTEL_ENABLED|VITE_FARO_URL" README.md
```

Expected: no README guidance exists for enabling frontend or backend observability.

- [ ] **Step 2: Add the observability section**

Insert this section after the environment variable block in `README.md`:

```md
## 📈 Observability

Mana Forge ships observability behind feature flags so local development still works without Grafana credentials.

### Backend and engine

Set these variables in the root `.env` file:

```env
GRAFANA_OTEL_ENABLED=true
OTEL_SDK_DISABLED=false
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-eu-west-0.grafana.net/otlp
GRAFANA_OTLP_AUTH=<base64(instanceId:apiToken)>
```

### Frontend

The React app reads Faro config at build time, so rebuild the web image after changing these:

```env
VITE_FARO_URL=https://faro-collector-prod-eu-west-0.grafana.net/collect/<app-key>
VITE_FARO_APP_NAME=mana-forge-web
```

Then rebuild and restart:

```bash
docker compose build web api engine
docker compose up -d
```

### Runtime checks

- `http://localhost/healthz` → web container
- `http://localhost:8080/actuator/health` → Spring Boot API
- `http://localhost:8000/health` → FastAPI engine (inside Docker network unless port is published)
```

- [ ] **Step 3: Verify the documentation renders cleanly**

Run:

```bash
rg -n "Observability|GRAFANA_OTEL_ENABLED|VITE_FARO_URL|healthz" README.md
```

Expected: all four markers are present exactly once in the new section.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document observability activation"
```

---

## Self-Review

- Spec coverage: this plan closes the concrete gaps found in the repo today: missing frontend observability bootstrap, missing Docker wiring for `VITE_FARO_*`, missing container health checks, and missing operator documentation.
- Placeholder scan: no `TODO`, `TBD`, or indirect “handle later” instructions remain.
- Type consistency: the plan uses `VITE_FARO_URL`, `VITE_FARO_APP_NAME`, `/healthz`, `/actuator/health`, and `/health` consistently across code, Docker, and docs.

## Recommended execution order

1. Task 1 — add Faro and prove it builds.
2. Task 2 — wire frontend config through Docker.
3. Task 3 — add health checks and healthy startup sequencing.
4. Task 4 — document enablement and verification.

**Plan complete and saved to `docs/superpowers/plans/2026-06-13-observability-completion.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
