# Agents for Mana Forge

This repository includes human-editable agent instructions and conventions to guide automated assistants and programmatic agents working across the mana-forge monorepo.

## Purpose
Provide a concise, tool-agnostic reference describing expected agent behavior, repository boundaries, and programming conventions for any AI-driven or automated tooling used by contributors and CI.

## Where the real conventions live

This file holds agent expectations only. Do not look here for build commands, layer patterns, or code style:

- `.github/copilot-instructions.md` — build and lint commands per service, request flow, i18n pattern, API client rules, auth model.
- `ARCHITECTURE.md` — design decisions and their rationale: AI quota, Turnstile, contact anti-spam, caching, email encryption, WAF rules to configure by hand in the Cloudflare dashboard.
- `README.md` — local setup and environment variables.

Read `ARCHITECTURE.md` before changing anything that touches abuse controls, caching, or email. Those sections record *why* the code is the way it is, and several of the choices look wrong until you know the reason.

## Repository shape

| Service | Stack | Port |
|---|---|---|
| `mana-forge-web` | React 19 + TypeScript + Vite + Tailwind CSS 4 | 5173 dev / 80 prod |
| `mana-forge-api` | Spring Boot 4 + Java + Maven | 8080 |
| `mana-forge-engine` | FastAPI + Python + Groq (Llama 3.3) | 8000 |

The frontend calls the Spring API only. The Spring API proxies Scryfall, Strapi and the AI engine. The engine is stateless.

## Agenting conventions
- Be tool-agnostic: do not assume a specific assistant implementation. Describe capabilities and constraints instead of naming a platform.
- Prefer minimal, surgical changes and include tests or validation where applicable.
- Respect secrets and environment boundaries; never hardcode credentials. New config values use the `${ENV_VAR:default}` substitution pattern.
- Verify claims against the code before repeating them. The instruction files have drifted from the source before, and a stale note is worse than none: check that a file exists and that a command runs before documenting it as available.
- When in doubt, open an issue or a draft PR instead of making high-risk changes without review.

## Verification

Run the tests for whatever you touched:

- **Backend**: `./mvnw test` from `mana-forge-api` (or `.\mvnw.cmd test` in PowerShell). Prefer the wrapper over a local `mvn`: it pins the Maven version for everyone. `./mvnw test -Dtest=ClassName` runs one class.
- **Frontend**: `npx vitest run <path>` for a subset, `npm run lint` and `npx tsc --noEmit` before calling frontend work done.

The backend suite is currently green: `./mvnw test` gives 247 tests, 0 failures. If you see failures, they are almost certainly yours, or you selected the wrong class name (see `copilot-instructions.md` — `DirectusServiceTest` lives in `StrapiServiceTest.java`).

## Contact
For questions about agent behavior or conventions, see the repository README or ask @valanhyr.