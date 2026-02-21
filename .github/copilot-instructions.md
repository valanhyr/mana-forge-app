# Mana Forge – Copilot Instructions

## Project Overview

**Mana Forge** is a Magic: The Gathering deck analysis platform focused on the **Premodern** format. It is a monorepo with three independent services that communicate over HTTP/REST.

| Service | Tech | Port |
|---|---|---|
| `mana-forge-web` | React 19 + TypeScript + Vite + Tailwind CSS 4 | 5173 (dev) / 80 (prod) |
| `mana-forge-api` | Spring Boot 4 + Java 25 + Maven | 8080 |
| `mana-forge-engine` | FastAPI + Python 3.11 + Groq (Llama 3.3) | 8000 |

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
```

### Backend (`mana-forge-api`)
```bash
cd mana-forge-api
./mvnw spring-boot:run              # Dev server at http://localhost:8080
./mvnw clean package -DskipTests    # Build fat JAR
./mvnw test                         # Run all tests
./mvnw test -Dtest=ClassName        # Run a single test class
# Swagger UI: http://localhost:8080/swagger-ui.html
# H2 Console:  http://localhost:8080/h2-console
```

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
- The **Spring API** proxies Scryfall card data, Strapi CMS content, and AI requests, caching the latter two in **Couchbase** with configurable TTLs.
- The **AI engine** is stateless; it receives deck data from the Spring API and calls **Groq Cloud** (Llama 3.3 70B) with structured JSON output (`response_format={"type": "json_object"}`).

### Spring API Layer Pattern
Controllers extend `BaseMongoController<T, ID>` which provides generic CRUD over any `MongoRepository`. Custom endpoints are added by overriding or adding new methods in the concrete controller.

```
Controllers → Services → Repositories (MongoDB)
                       ↘ Couchbase (cache, TTL-based)
                       ↘ External HTTP (Scryfall, Strapi, AI Engine)
```

### i18n Pattern (Frontend)
All UI strings live in `src/labels.json` keyed by locale (`es`/`en`). Access them exclusively via the `useTranslation` hook (`t("some.key")`). The active locale is stored in `localStorage` under `app_locale` and injected into every API request as the `Accept-Language` header via an Axios request interceptor. The Spring API and AI engine use this header to return localized content.

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

### Backend
- Java package root: `com.manaforge.api`
- All MongoDB documents use `String` IDs (`@Id private String id`). Lombok `@Data` is used on all models.
- Services calling external APIs (Scryfall, Strapi) are annotated with `@Cacheable`; cache names and TTLs are centrally defined in `CacheConfig.java`.
- Virtual Threads (Project Loom) are enabled globally — avoid `synchronized` blocks; prefer non-blocking patterns.
- The `Accept-Language` request header carries the locale and is read in services to return localized content.

### AI Engine
- All three endpoints return structured JSON enforced via `response_format={"type": "json_object"}`.
- Temperature is `0.5` for sideboard/analysis (deterministic) and `0.8` for random deck generation (creative).
- Pydantic schemas are in `schemas/deck_schemas.py`; prompt helpers are in `prompts/`.
- `PREMODERN_META` in `services/ai_service.py` is the canonical meta archetype list used as a fallback when the caller provides none.

### Environment & Secrets
- `application.yaml` currently contains **hardcoded credentials**. Use `${ENV_VAR:default}` substitution (the existing pattern) for any new config values — do not hardcode secrets.
- Frontend env vars are prefixed `VITE_`. The dev override file is `.env.development`; it sets `VITE_API_URL=http://localhost:8080`.

### Auth Model
- Auth is **session-based** after a Google OAuth2 login — there is no JWT token managed by the frontend. The session cookie is sent automatically via `withCredentials: true`.
- Public endpoints: all `GET /api/**`, plus `POST /api/users`, `POST /api/users/login`, `POST /api/decks/analyze`, `POST /api/decks/random`.
- All other `POST`, `PUT`, `DELETE` operations require an authenticated session.
