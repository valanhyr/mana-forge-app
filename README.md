# ⚔️ Mana Forge

**Mana Forge** is a web platform for building and analyzing Magic: The Gathering decks, specialized in the **Premodern** format. It features AI-powered deck analysis, sideboard suggestions, and a daily deck of the day — all wrapped in a modern, multilingual interface.

> 🌐 [mana-forge.com](https://mana-forge.com)

---

## ✨ Features

- 🃏 **Deck Builder** — Build, import, and manage your decks
- 🤖 **AI Analysis** — Analyze your deck and get sideboard suggestions powered by Groq (Llama 3.3 70B)
- 📅 **Daily Deck** — A new AI-generated deck every day
- 🌍 **Multilingual** — Full ES/EN support
- 🔐 **Google OAuth2** — Secure authentication
- 📰 **CMS Content** — Articles, formats and site content via Strapi
- ⚡ **Fast** — Multi-layer Redis cache (Scryfall 24h, Strapi 6h, articles 2h)

---

## 🏗️ Architecture

This is a monorepo with 3 independent services:

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  Web         │────▶│  API         │────▶│  Engine        │
│  React+Vite  │     │  Spring Boot │     │  FastAPI + AI  │
│  Port 80     │     │  Port 8080   │     │  Port 8000     │
└──────────────┘     └──────┬───────┘     └────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
         MongoDB         Redis          Strapi CMS
          Atlas          Cache        (content)
```

| Service | Tech | Description |
|---|---|---|
| `mana-forge-web` | React 19 + Vite + TypeScript + Tailwind | Frontend served by Nginx |
| `mana-forge-api` | Java 25 + Spring Boot 4 + Maven | REST API backend |
| `mana-forge-engine` | Python 3.11 + FastAPI + Groq | AI engine |

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### Run with Docker Compose

```bash
# 1. Clone the repo
git clone https://github.com/valanhyr/mana-forge-app.git
cd mana-forge-app

# 2. Create your .env file
cp .env.example .env
# Fill in your credentials (see Environment Variables section)

# 3. Start all services
docker compose up -d
```

The app will be available at **http://localhost**

---

## ⚙️ Environment Variables

Create a `.env` file in the root with the following variables:

```env
# Frontend
FRONTEND_URL=http://localhost

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/production

# Strapi CMS
STRAPI_API_URL=https://your-strapi-instance.strapiapp.com/api
STRAPI_API_TOKEN=your_strapi_token

# Groq AI
GROQ_API_KEY=gsk_your_groq_key

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# SMTP (Resend)
SMTP_PASSWORD=your_resend_api_key
SMTP_FROM=noreply@yourdomain.com
```

---

## 🛠️ Local Development

### Frontend

```bash
cd mana-forge-web
npm install
npm run dev        # http://localhost:5173
```

### Backend

```bash
cd mana-forge-api
./mvnw spring-boot:run    # http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### AI Engine

```bash
cd mana-forge-engine
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
# Docs: http://localhost:8000/docs
```

---

## 📁 Project Structure

```
mana-forge-app/
├── mana-forge-web/        # React frontend
│   ├── src/
│   │   ├── api/           # Axios HTTP clients
│   │   ├── components/    # UI components
│   │   ├── core/models/   # TypeScript interfaces
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Context providers
│   │   ├── store/         # Zustand global state
│   │   └── views/         # Pages
│   └── Dockerfile
│
├── mana-forge-api/        # Spring Boot backend
│   ├── src/main/java/com/manaforge/api/
│   │   ├── config/        # Security, Cache, Mongo, CORS
│   │   ├── controller/    # REST endpoints
│   │   ├── model/         # Domain models
│   │   ├── repository/    # MongoDB repositories
│   │   └── service/       # Business logic
│   └── Dockerfile
│
├── mana-forge-engine/     # Python AI engine
│   ├── routers/           # FastAPI route handlers
│   ├── services/          # AI service (Groq)
│   ├── schemas/           # Pydantic models
│   ├── prompts/           # LLM prompt templates
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🤖 AI Capabilities

The AI engine uses **Llama 3.3 70B** via Groq Cloud and supports:

- **Sideboard suggestions** — Recommends 15 sideboard cards based on the Premodern meta
- **Deck analysis** — Identifies archetype, strengths, weaknesses and matchup percentages
- **Random deck generation** — Generates a complete, playable Premodern deck from scratch

All AI responses are structured JSON and support ES/EN localization.

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for the full roadmap.

**Coming soon:**
- 🔍 Public deck explorer (`/explore`) with filters
- 🎨 Card art selector per reprint
- 👤 Public user profiles with stats
- ❤️ Likes and comments on decks

---

## 📄 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Built with ☕ Java, 🐍 Python and ⚛️ React &nbsp;•&nbsp; Powered by <a href="https://groq.com">Groq</a> &nbsp;•&nbsp; Cards from <a href="https://scryfall.com">Scryfall</a>
</p>
