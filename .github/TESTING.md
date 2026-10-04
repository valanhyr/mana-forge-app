CI tests moved to Jenkins

Background
--------
Heavy integration tests (Directus, Redis, SMTP, end-to-end flows) are removed from GitHub Actions CI to avoid flaky failures and long runs. Use Jenkins (or another CI system) to run full test suites against provisioned test services (Testcontainers, Docker Compose, or staging endpoints).

What changed
--------
- .github/workflows/ci-tests.yml no longer runs mvn test; it builds the backend artifact without executing tests.
- Frontend tests are not run in GitHub Actions; run them in Jenkins or locally.

Commands to run tests (for Jenkins job)
--------
Environment required:
- Java 21+ (or the project's required JDK)
- Docker (for Testcontainers or docker-compose)
- Node 18+ and npm
- Optional: SMTP test server (MailHog/Mailtrap) or allow Testcontainers to provide one

Suggested Jenkins pipeline steps:
1) Checkout
2) Setup JDK and Node
3) Cache dependencies (Maven repo, npm cache)
4) Backend unit+integration tests:
   - cd mana-forge-api
   - # For fast unit tests only:
     ./mvnw -Pci -DskipITs test
   - # For full tests with Testcontainers (recommended):
     ./mvnw test
   - # If using Testcontainers, ensure Docker is available to the Jenkins agent
5) Frontend tests + build:
   - cd mana-forge-web
   - npm ci
   - npm test
   - npm run build
6) Collect artifacts and test reports

Running tests locally
--------
Backend unit tests:
- cd mana-forge-api
- ./mvnw test

Frontend tests (Vitest + MSW):
- cd mana-forge-web
- npm ci
- npm test
- npm run build

Notes on external services
--------
- Directus / Scryfall / external HTTP APIs: mock in unit tests with WireMock or Mockito. For integration tests, run WireMock/Testcontainers that simulate expected endpoints.
- Redis / Mongo: use Testcontainers to provide isolated, reproducible instances for integration tests.
- SMTP: use MailHog as Testcontainer or run a local MailHog instance and set SMTP config via environment variables.

Variables Jenkins should set
--------
- MAVEN_OPTS (optional)
- FRONTEND_URL (used to compose reset links in emails)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (if not using Testcontainers)
- DIRECTUS_URL (if tests target a Directus instance)

If you want, I can:
- Add a disabled legacy workflow file (.github/workflows/ci-tests-legacy.yml) with the previous test steps for reference, or
- Create a Jenkinsfile example for a declarative pipeline that runs the full test matrix.

What should I do next? (choose one)
- Add legacy workflow for reference
- Create Jenkinsfile example
- Also remove any frontend test steps from other workflows
- Nothing, just commit these changes
