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

## Releases

Versioning is per service, and Jenkins reads each one from a different file:

| Service | Version file | Tag prefix |
|---|---|---|
| web | `mana-forge-web/package.json` → `version` | `web-v` |
| api | `mana-forge-api/pom.xml` → `<version>` | `api-v` |
| engine | `mana-forge-engine/version.txt` | `engine-v` |

Each `jenkins/Jenkinsfile.*` reads that file, refuses to run if the version still contains `SNAPSHOT`, and refuses to proceed if the tag already exists. So a release is: strip `-SNAPSHOT`, commit, let the pipeline tag.

Two traps that have already bitten this repo:

- **Do not append `-SNAPSHOT` to a version you already released.** After releasing 1.0.7, bump `version.txt` to `1.0.8-SNAPSHOT`. Writing `1.0.7-SNAPSHOT` deadlocks the engine: the SNAPSHOT check rejects it, and removing the suffix collides with the existing tag.
- **APIs skip versions.** `api-v1.0.3` was the last API tag but `pom.xml` is already at 1.0.x, because the version was bumped without a deploy. Check `git tag -l 'api-v*'` before assuming the next number.

The app version reported to Grafana Faro comes from `package.json` via `define.__APP_VERSION__` in `vite.config.ts`. Do not reintroduce a hardcoded version in `observability.ts`.

## Verification

Run the tests for whatever you touched:

- **Backend**: `./mvnw test` from `mana-forge-api` (or `.\mvnw.cmd test` in PowerShell). Prefer the wrapper over a local `mvn`: it pins the Maven version for everyone. `./mvnw test -Dtest=ClassName` runs one class.
- **Frontend**: `npx vitest run <path>` for a subset, `npm run lint` and `npx tsc --noEmit` before calling frontend work done.

The backend suite is currently green: `./mvnw test` gives 247 tests, 0 failures. If you see failures, they are almost certainly yours, or you selected the wrong class name (see `copilot-instructions.md` — `DirectusServiceTest` lives in `StrapiServiceTest.java`).

## Contact
For questions about agent behavior or conventions, see the repository README or ask @valanhyr.