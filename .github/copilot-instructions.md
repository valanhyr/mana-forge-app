# Mana Forge – Agent Instructions

## Project Overview

**Mana Forge** is a Magic: The Gathering deck analysis platform focused on the **Premodern** format. It is a monorepo with three independent services that communicate over HTTP/REST.

| Service | Tech | Port |
|---|---|---|
| `mana-forge-web` | React 19 + TypeScript + Vite + Tailwind CSS 4 | 5173 (dev) / 80 (prod) |
| `mana-forge-api` | Spring Boot 4 + Maven | 8080 |
| `mana-forge-engine` | FastAPI + Python 3.11 + Groq (Llama 3.3) | 8000 |

Java version: `pom.xml` targets Java 21 (`<java.version>21</java.version>`), the API `Dockerfile` builds and runs on Temurin 25. Keep a local JDK at or above the pom target.

---

## Purpose

This file documents repository conventions for automated agents or programmatic tooling (CI agents, AI assistants, local automation). It is intentionally tool-agnostic: avoid referencing a specific assistant implementation.

For agent *expectations* rather than code conventions, see the root `AGENTS.md`. For design decisions and their rationale, see `ARCHITECTURE.md` — read it before touching abuse controls, caching, or email, because several choices there look wrong until you know why they were made.

---

## Build, Dev & Lint Commands

### Frontend (`mana-forge-web`)
```bash
cd mana-forge-web
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Preview production build
npx vitest run src/__tests__/views/Foo.test.tsx   # Single test file
npx tsc --noEmit                                   # Type check only
```

### Backend (`mana-forge-api`)
```bash
cd mana-forge-api
./mvnw spring-boot:run           # Dev server at http://localhost:8080
./mvnw clean package -DskipTests # Build fat JAR
./mvnw test                      # Run all tests
./mvnw test -Dtest=ClassName     # Run a single test class
# Swagger UI: http://localhost:8080/swagger-ui.html
# PowerShell: .\mvnw.cmd test
```

Use the wrapper (`./mvnw`, or `.\mvnw.cmd` on Windows) rather than a locally installed `mvn`: it pins Maven 3.9.12 via `.mvn/wrapper/maven-wrapper.properties`, so local and CI resolve the same version. It downloads the distribution on first use.

The H2 console path is configured (`/h2-console`) but disabled via `h2.console.enabled: false`. Do not document it as reachable without flipping that flag.

### AI Engine (`mana-forge-engine`)
```bash
cd mana-forge-engine
.\venv\Scripts\activate             # Windows
pip install -r requirements.txt
python main.py                      # Dev server at http://localhost:8000 (with --reload)
# Interactive docs: http://localhost:8000/docs
```

### Docker Compose (full stack)
```bash
docker-compose up -d    # All services
docker-compose down -v  # Stop and remove volumes
```

---

## Architecture

### Request Flow
- The **React frontend** calls the **Spring Boot API** exclusively — it never calls the AI engine or external APIs directly.
- The **Spring API** proxies Scryfall card data, **Directus** CMS content, and AI requests, caching the latter two in **Couchbase** with configurable TTLs. (Strapi was replaced by Directus; `StrapiService` is a deprecated placeholder, and the `Strapi*` model classes under `model/directus/` are shape-compatibility shims, not evidence of a live Strapi integration.)
- The **AI engine** is stateless; it receives deck data from the Spring API and calls **Groq Cloud** (Llama 3.3 70B) with structured JSON output (`response_format={"type": "json_object"}`).

### Spring API Layer Pattern
Controllers extend `BaseMongoController<T, ID>` which provides generic CRUD over any `MongoRepository`. Custom endpoints are added by overriding or adding new methods in the concrete controller.

```
Controllers → Services → Repositories (MongoDB)
                       ↘ Couchbase (cache, TTL-based)
                       ↘ External HTTP (Scryfall, Directus, AI Engine)
```

### i18n Pattern (Frontend)
All UI strings live in `src/labels.json` keyed by locale (`es`/`en`). Access them exclusively via the `useTranslation` hook (`t("some.key")`). The active locale is stored in `localStorage` under `app_locale` and injected into every API request as the `Accept-Language` header via an Axios request interceptor. The Spring API and AI engine use this header to return localized content.

When adding a UI string, add it to **both** locale blocks in `labels.json`.

### API Client (Frontend)
There are **two Axios instances** — only use the primary one for new code:
- `src/services/api.ts` — primary client; has `withCredentials: true` and the `Accept-Language` interceptor. Used by all service files (`DeckService`, `CardService`, etc.).
- `src/api/apiClient.js` — legacy instance without credentials or interceptors; do not add new calls here.

---

## Key Conventions

### Frontend
- Views (`src/views/<feature>/`) are the only components that fetch data or call services.
- Reusable UI goes in `src/components/ui/`; layout components in `src/components/layout/`.
- TypeScript domain model interfaces live in `src/core/models/` (e.g., `User.ts`, `Format.ts`).
- Deck cards use `scryfallId` as the canonical identifier, with `board: "main" | "side"` to distinguish zones.
- Cloudflare Turnstile config lives in `src/config/turnstile.ts`; `isTurnstileConfigured()` gates the widget so an unconfigured deployment renders nothing instead of a broken challenge. `TurnstileWidget` already handles script timeout and key rejection — reuse it rather than loading the Turnstile script yourself.

### Backend
- Java package root: `com.manaforge.api`
- All MongoDB documents use `String` IDs (`@Id private String id`). Lombok `@Data` is used on all models.
- Services calling external APIs (Scryfall, Directus) are annotated with `@Cacheable`; cache names and TTLs are centrally defined in `CacheConfig.java`.
- Virtual Threads (Project Loom) are enabled globally — avoid `synchronized` blocks; prefer non-blocking patterns.
- The `Accept-Language` request header carries the locale and is read in services to return localized content.
- Resolve the real client IP with `com.manaforge.api.util.ClientIpResolver`, not by reading headers inline. `RateLimitingInterceptor`, `DeckController` and `ContactController` all key on the result; divergent logic would let one caller look anonymous to one control and identified to another.

### Abuse Controls
`ARCHITECTURE.md` documents these in detail. The short version:

- **Turnstile tokens must be verified server-side** via `TurnstileService.verify(token, remoteIp)`. A token that never leaves the browser is worthless.
- **Fail closed on verification failure.** An outage or timeout from Cloudflare returns `false`, not `true`. `isEnabled() == false` (no secret configured) is a separate, explicitly-configured state.
- Public AI analysis requires Turnstile only for anonymous callers. The contact endpoint has no authenticated bypass — it is anonymous by nature, so everyone passes the challenge while it is enabled.
- Rate limiting lives in `RateLimitingInterceptor` (Bucket4j, in memory). It does not survive restarts and is not shared across replicas; treat Cloudflare WAF rules as the edge-level layer.

### AI Engine
- All three endpoints return structured JSON enforced via `response_format={"type": "json_object"}`.
- Temperature is `0.5` for sideboard/analysis (deterministic) and `0.8` for random deck generation (creative).
- Pydantic schemas are in `schemas/deck_schemas.py`; prompt helpers are in `prompts/`.
- `PREMODERN_META` in `services/ai_service.py` is the canonical meta archetype list used as a fallback when the caller provides none.

### Environment & Secrets
- `application.yaml` uses `${ENV_VAR:default}` substitution throughout; there are no hardcoded credentials in the versioned config. Secrets live in the root `.env` (gitignored) and reach the API through `docker-compose.yml`. Keep new config values on that pattern.
- Frontend env vars are prefixed `VITE_`. The dev override file is `.env.development`; it sets `VITE_API_URL=http://localhost:8080/api` and a dummy `VITE_TURNSTILE_SITE_KEY`.
- Cloudflare binds each Turnstile site key to an allowlist of hostnames. Production keys reject `localhost` with HTTP 400. In local dev use Cloudflare's official dummy keys (`1x00000000000000000000AA` site / `1x0000000000000000000000000000000AA` secret). Site key and secret must change together: the production secret rejects the dummy token, and the production site key rejects the hostname.

### Auth Model
- Auth is **session-based** after a Google OAuth2 login — there is no JWT token managed by the frontend. The session cookie is sent automatically via `withCredentials: true`.
- Public endpoints are defined in `SecurityConfig.java`. As of now: all `GET /api/**`, plus `POST` on `/api/users`, `/api/users/login`, `/api/decks/analyze`, `/api/decks/scores`, `/api/decks/random`, `/api/contact`, and `/api/cards/*/images`.
- All other `POST`, `PUT`, `DELETE` operations require an authenticated session.

### Testing
- Backend tests are `MockMvc` slices and unit tests under `src/test/java`. When adding controller fields, add the new dependencies as `@MockitoBean` or the slice fails to start.
- The suite is green as of this writing: `./mvnw test` → 247 tests, 0 failures. Keep it that way.
- When stubbing a service that takes a locale, stub the **exact overload the caller invokes**. `FormatService` delegates to `DirectusService.getFormats(locale, acceptLanguage)`, and `FormatController` forwards the `Accept-Language` header — stubbing the single-argument variant makes the mock return an empty list and the test fail with a confusing size mismatch instead of a clear "no stub".
- `DirectusServiceTest` lives in a file named `StrapiServiceTest.java` (the class was renamed, the file was not). Select it with `-Dtest=DirectusServiceTest`; `-Dtest=StrapiServiceTest` silently matches nothing.

---

## Agenting conventions

- Be tool-agnostic: specify behaviour and constraints, not a platform name.
- Make minimal, surgical changes and include tests/validation when applicable.
- Prefer creating issues or draft PRs for high-risk changes instead of unreviewed edits.
- Respect secrets: never hardcode credentials; use environment variables or configured secret stores.
- Verify a claim against the source before documenting it. Check that a file exists and that a command runs before writing it into these instructions; stale entries cost more than missing ones.

---

## Contact
For questions about conventions or agent behavior, see the repository README or ask @valanhyr.