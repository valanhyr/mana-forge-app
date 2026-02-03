# Mana Forge Project Context

## Project Overview
Mana Forge is a comprehensive application for **Magic: The Gathering** deck analysis and strategy, with a specific focus on Premodern formats. It employs a modern microservices architecture combining a reactive frontend, a robust Java backend, an AI-powered analysis engine, and a Headless CMS for content.

### Core Architecture
The system is divided into four main components:
1.  **`mana-forge-web`**: The user-facing frontend.
2.  **`mana-forge-api`**: The core backend logic and data persistence.
3.  **`mana-forge-engine`**: An AI microservice for deck suggestions and analysis.
4.  **`strapi-cloud-template-blog...`**: A CMS for managing blog content and resources.

---

## Components & Usage

### 1. Web Frontend (`mana-forge-web`)
A modern Single Page Application (SPA) built for performance and user experience.

*   **Tech Stack**: React 19, TypeScript, Vite, TailwindCSS (v4), Zustand (State), React Query (Data Fetching), Lucide React (Icons).
*   **Key Directories**:
    *   `src/api`: API client configurations.
    *   `src/components`: Reusable UI components.
    *   `src/views`: Page-level components.
    *   `src/services`: Domain-specific business logic.
*   **Commands**:
    *   `npm run dev`: Start development server (Vite).
    *   `npm run build`: Type-check and build for production.
    *   `npm run lint`: Run ESLint.

### 2. AI Engine (`mana-forge-engine`)
A specialized Python microservice leveraging LLMs for intelligent game insights.

*   **Tech Stack**: Python 3.11+, Groq API (Llama 3).
*   **Purpose**: Generates deck suggestions and provides strategic analysis.
*   **Setup**:
    *   Requires a `.env` file with `GROQ_API_KEY`.
    *   Uses a virtual environment (`venv`).
*   **Commands**:
    *   `pip install -r requirements.txt`: Install dependencies.
    *   `python main.py`: Start the service (defaults to port 8000).

### 3. Backend API (`mana-forge-api`)
The central hub for data processing and persistence.

*   **Tech Stack**: Java 25, Spring Boot 4.0.1, MongoDB, H2 Database (Runtime/Dev), Swagger (OpenAPI).
*   **Key Dependencies**: `spring-boot-starter-web`, `spring-boot-starter-data-mongodb`, `spring-boot-starter-security`, `lombok`.
*   **Commands**:
    *   Run via Maven Wrapper: `./mvnw spring-boot:run` (or `mvnw.cmd` on Windows).
    *   Build: `./mvnw clean install`.

### 4. CMS (`strapi-cloud-template-blog...`)
Headless CMS for managing application content and blog posts.

*   **Tech Stack**: Strapi (Node.js).
*   **Commands**:
    *   `npm run develop`: Start in development mode (with auto-reload).
    *   `npm run start`: Start production server.
    *   `npm run build`: Build the admin panel.

---

## Development Conventions

*   **Frontend**:
    *   Strict TypeScript usage is encouraged.
    *   Styling is handled via TailwindCSS.
    *   State management relies on Zustand for global state and React Query for server state.
    *   ESLint is configured for code quality.
*   **Backend**:
    *   Standard Spring Boot architecture (Controller-Service-Repository pattern likely).
    *   Lombok is used to reduce boilerplate.
    *   API documentation via Swagger/OpenAPI.
*   **AI Engine**:
    *   Follows standard Python practices (PEP 8).
    *   Environment variables for sensitive keys.

## Quick Start (Local Development)

To spin up the full stack locally, you will typically need to run each service in a separate terminal:

1.  **Database**: Ensure MongoDB is running (if required by `mana-forge-api`) or rely on H2 for purely local/transient data.
2.  **API**: `cd mana-forge-api && ./mvnw spring-boot:run`
3.  **Engine**: `cd mana-forge-engine && source venv/bin/activate && python main.py`
4.  **CMS**: `cd strapi-cloud-template-blog-2dbed1a52d && npm run develop`
5. **Web**: `cd mana-forge-web && npm run dev`

---

## Docker & Containerization

The project is fully containerized using Docker and orchestrated with Docker Compose. Each component has its own `Dockerfile` optimized for production.

### Services
- **`web`**: Nginx serving the React production build. (Port 80)
- **`api`**: Spring Boot application running on JRE 21. (Port 8080)
- **`engine`**: FastAPI application (Python 3.11). (Port 8000)

### Running with Docker Compose

1.  **Configure Environment**:
    Create a `.env` file in the root directory based on `.env.example`.
    ```bash
    cp .env.example .env
    ```
2.  **Build and Start**:
    ```bash
    docker compose up --build
    ```
3.  **Accessing Services**:
    - Frontend: `http://localhost`
    - API: `http://localhost:8080`
    - Engine: `http://localhost:8000`
    - CMS: `http://localhost:1337`

