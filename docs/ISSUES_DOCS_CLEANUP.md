Docs cleanup notes

Actions performed:
- Removed artifact: mana-forge-engine/.pytest_cache/README.md (deleted if present)
- Updated .github/copilot-instructions.md → made tool-agnostic agent instructions
- Added AGENTS.md (tool-agnostic agent conventions)

Remaining detected TODOs:
- README.md: TODO to add Testcontainers JUnit 5 extension for integration tests and CI notes about Docker on build agents.
- docs/superpowers: checklist items referencing tests and coverage (profile-editability plan requires adding tests in backend/frontend).

Next steps (suggested):
- Create a GitHub Issue to track these remaining TODOs and assign owners.
- Implement Testcontainers extension and add CI documentation.
- Add missing tests referenced in docs/superpowers plans.

Note: Attempt to create a GitHub issue via gh CLI failed due to missing authentication. Create the issue on GitHub or run `gh auth login` locally and re-run.
