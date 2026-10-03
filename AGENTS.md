# Agents for Mana Forge

This repository includes human-editable agent instructions and conventions to guide automated assistants and programmatic agents working across the mana-forge monorepo.

## Purpose
Provide a concise, tool-agnostic reference describing expected agent behavior, repository boundaries, and programming conventions for any AI-driven or automated tooling used by contributors and CI.

## Primary agent (default)
- name: mana-forge
- description: Assist contributors with frontend (React), backend (Spring Boot), and AI engine (FastAPI) tasks for the Mana Forge project.
- entrypoint: repository root
- typical-actions: implement features, propose and apply code changes, run builds/tests, generate documentation, and open pull requests or patches for review

## Agenting conventions
- Be tool-agnostic: do not assume a specific assistant implementation. Describe capabilities and constraints instead of naming a platform.
- Follow repository coding standards and existing patterns (see README and project-specific instruction files such as CLAUDE.md, GEMINI.md, and .github/instructions/*).
- Prefer minimal, surgical changes and include tests or validation where applicable.
- Respect secrets and environment boundaries; never hardcode credentials. Use environment variables or existing secret management conventions.
- When in doubt, open an issue or a draft PR instead of making high-risk changes without review.

## Usage notes
- This file documents agent expectations and conventions; it can be adapted by maintainers to reflect new workflows.
- Keep descriptions concise and focused on behavior, not tooling.

## Contact
For questions about agent behavior or conventions, see the repository README or ask @valanhyr.
