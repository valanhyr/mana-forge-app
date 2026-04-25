# Locust Load Tests — Mana Forge

Performance and load tests for all three Mana Forge services using [Locust](https://locust.io).

## Prerequisites

- Python 3.11+
- The target service(s) must be running

```bash
cd tests/locust
pip install -r requirements.txt
```

> **Windows note:** If `locust` is not recognised as a command, use `python -m locust` instead of `locust` in all commands below.

---

## Environment Variables

Copy `.env.example` and fill in values, or export variables directly:

| Variable | Default | Description |
|---|---|---|
| `API_HOST` | `http://localhost:8080` | Spring Boot API base URL |
| `ENGINE_HOST` | `http://localhost:8000` | FastAPI engine base URL |
| `WEB_HOST` | `http://localhost:5173` | React web base URL (prod: `http://localhost:80`) |
| `TEST_USERNAME` | `testuser` | Username for `AuthenticatedUser` scenarios |
| `TEST_PASSWORD` | `testpassword` | Password for `AuthenticatedUser` scenarios |

---

## Running Tests

All commands run from `tests/locust/`. Use `--headless` for CI; omit it to open the web UI at `http://localhost:8089`.

### Spring Boot API

```bash
# Web UI
locust -f locustfile_api.py --host http://localhost:8080

# Headless — 20 users, 2/sec spawn rate, 3-minute run
locust -f locustfile_api.py --host http://localhost:8080 \
  --headless -u 20 -r 2 -t 3m
```

User classes:
- **`BrowsingUser`** (weight 6) — anonymous GET requests (formats, cards, decks, articles)
- **`DeckAnalysisUser`** (weight 2) — public POST endpoints that proxy AI calls; automatically uses long wait times
- **`AuthenticatedUser`** (weight 2) — login + session-based endpoints; requires `TEST_USERNAME`/`TEST_PASSWORD`

### FastAPI Engine

> ⚠️ **`AIUser` tasks reach Groq Cloud.** Keep concurrency low (≤5 users) to avoid rate limits and unexpected API costs. Use `--tags health` to skip AI tasks entirely.

```bash
# Web UI
locust -f locustfile_engine.py --host http://localhost:8000

# Health-only (safe for CI — no Groq calls)
locust -f locustfile_engine.py --host http://localhost:8000 \
  --headless -u 10 -r 2 -t 2m --tags health

# Include AI endpoints (low concurrency)
locust -f locustfile_engine.py --host http://localhost:8000 \
  --headless -u 3 -r 1 -t 3m
```

User classes:
- **`HealthCheckUser`** (weight 3) — GET `/health`, validates response body
- **`AIUser`** (weight 1) — analyze-deck, deck-scores, suggest-sideboard, generate-random-deck

### Web Frontend

```bash
# Dev server (Vite)
locust -f locustfile_web.py --host http://localhost:5173

# Production (Docker / Nginx on port 80)
locust -f locustfile_web.py --host http://localhost:80

# Headless — 30 users
locust -f locustfile_web.py --host http://localhost:80 \
  --headless -u 30 -r 5 -t 2m
```

User class:
- **`WebBrowserUser`** — navigates SPA routes (home, deck-explorer, formats, articles, profile, …)

### Combined Full-Stack

Runs all user classes against their respective services using a built-in ramp-up shape (0 → 40 users over 2 min, hold 5 min, ramp down 1 min).

```bash
# Uses API_HOST, ENGINE_HOST, WEB_HOST env vars
export API_HOST=http://localhost:8080
export ENGINE_HOST=http://localhost:8000
export WEB_HOST=http://localhost:5173

locust -f locustfile_all.py
```

---

## Fixtures

`fixtures/sample_deck.json` — a valid Premodern Goblin Sligh deck (60 main + 15 sideboard) used as the POST body for all AI-related tasks. Edit this file to test with different archetypes.

---

## Tips

- Start with **5–10 users** to establish a baseline before increasing load.
- For the engine, prefer `--tags health` in automated pipelines to avoid Groq costs.
- Use `--csv=results` to export latency/RPS stats for reporting.
- The `locustfile_all.py` shape can be tuned by editing the `stages` list in `FullStackShape`.
