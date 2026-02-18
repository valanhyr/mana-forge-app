# Mana Forge - Arquitectura del Monorepo

## 📋 Resumen Ejecutivo

**Mana Forge** es una plataforma web para análisis de mazos de Magic: The Gathering, especializada en el formato **Premodern**. El monorepo contiene 3 proyectos independientes que se comunican vía HTTP/REST.

```
┌─────────────┐      HTTP      ┌──────────────┐      HTTP     ┌────────────────┐
│             │ ◄──────────────►│              │◄─────────────►│                │
│  Frontend   │                 │   Backend    │               │  AI Engine     │
│  (React)    │                 │  (Spring)    │               │  (FastAPI)     │
│  Port 80    │                 │  Port 8080   │               │  Port 8000     │
└─────────────┘                 └──────────────┘               └────────────────┘
       │                               │                               │
       │                               ├──────► MongoDB Atlas          │
       │                               │        (Users, Decks)         │
       │                               │                               │
       │                               ├──────► Couchbase              │
       │                               │        (Cache)                │
       │                               │                               │
       │                               ├──────► Strapi CMS             │
       │                               │        (Content)              │
       │                               │                               │
       │                               └──────► Scryfall API           │
       │                                        (Card Data)            │
       │                                                                │
       └────────────────────────────────────────────────────────────────┘
                           Google OAuth2 + JWT
```

---

## 🏗️ Proyecto 1: mana-forge-web (Frontend)

### Stack Tecnológico
- **Framework**: React 19.2 + TypeScript 5.9
- **Build Tool**: Vite 7.2
- **Styling**: Tailwind CSS 4.1
- **Routing**: React Router 7.11
- **State**: Zustand 5.0 (global) + React Query 5.90 (server state)
- **HTTP Client**: Axios 1.13
- **Icons**: Lucide React 0.562
- **Production Server**: Nginx (Docker)

### Estructura de Carpetas
```
src/
├── api/              # Cliente HTTP (axios instances)
├── components/
│   ├── layout/       # Layout, Footer, ScrollToTop
│   └── ui/           # CardGrid, DeckTable, Modal, Spinner
├── core/
│   └── models/       # TypeScript interfaces (Format, Card, Deck)
├── hooks/            # Custom hooks (useTranslation)
├── services/         # Context Providers (User, Language)
├── store/            # Zustand stores
└── views/            # Páginas principales
    ├── auth/         # Login (OAuth2)
    ├── dashboard/    # Página principal
    ├── deck-builder/ # Constructor de mazos
    ├── formats/      # Detalles de formatos
    ├── my-decks/     # Mazos del usuario
    ├── profile/      # Perfil
    └── articles/     # Artículos del CMS
```

### Rutas Principales
| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | Dashboard | Página principal con héroe y featured decks |
| `/login` | Login | Autenticación OAuth2 con Google |
| `/my-decks` | MyDecks | Lista de mazos del usuario |
| `/deck-builder` | DeckBuilder | Constructor de mazos |
| `/deck-builder/:deckId` | DeckBuilder | Editar mazo existente |
| `/formats/:formatName` | FormatDetail | Detalles de un formato |
| `/articles/:articleId` | ArticleDetail | Vista de artículo |

### Características Clave
- **Multi-idioma**: Context Provider con i18n (labels.json)
- **Autenticación**: OAuth2 via Spring Security (redirect flow)
- **Real-time Deck Building**: Búsqueda de cartas con autocomplete
- **Import/Export**: Parse de listas de mazos en formato texto
- **AI Integration**: Botones para sugerir sideboard y análisis

### Deployment
```dockerfile
# Build Stage (Vite)
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
RUN npm run build

# Production Stage (Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 🏗️ Proyecto 2: mana-forge-api (Backend)

### Stack Tecnológico
- **Framework**: Spring Boot 4.0.1 (Java 25)
- **Arquitectura**: Virtual Threads (Project Loom)
- **Persistencia**:
  - MongoDB Atlas (Users, Decks, Formats, Cards)
  - Couchbase (Caché distribuida - **NUEVO**)
  - H2 (SQL in-memory - desarrollo)
- **Seguridad**: Spring Security + OAuth2 Client (Google)
- **API Docs**: SpringDoc OpenAPI 2.3
- **HTTP Client**: RestClient (Spring 6.2+) + RestTemplate
- **Build**: Maven 3.9

### Arquitectura de Capas
```
┌─────────────────────────────────────────┐
│         Controllers (REST)              │
│  /api/decks, /api/cards, /api/formats  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Services                     │
│  StrapiService, ScryfallService,        │
│  PremodernService, AiService            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    Repositories (MongoDB)               │
│  DeckRepository, UserRepository,        │
│  FormatRepository, CardRepository       │
└─────────────────────────────────────────┘
```

### Módulos Principales

#### 1. Controllers
- **DeckController**: CRUD de mazos, daily deck, AI analysis
- **CardController**: Búsqueda de cartas (Scryfall proxy)
- **FormatController**: Listado y detalles de formatos
- **UserController**: Gestión de usuarios
- **ArticleController**: Artículos del CMS
- **ContentController**: Contenido Strapi (footer, heros, sections)

#### 2. Services
- **StrapiService**: Cliente HTTP para Strapi CMS (cacheable)
- **ScryfallService**: Cliente para Scryfall API (cacheable)
- **PremodernService**: Lógica específica de Premodern (banlist)
- **AiService**: Proxy a mana-forge-engine (sugerencias IA)
- **OAuth2LoginSuccessHandler**: Post-login callback

#### 3. Repositories
- **UserRepository**: Usuarios (MongoDB)
- **DeckRepository**: Mazos con queries por usuario/formato
- **FormatRepository**: Formatos soportados
- **CardRepository**: Caché local de cartas
- **DailyDeckRepository**: Deck of the Day

#### 4. Configuration
- **SecurityConfig**: OAuth2 + CORS + JWT
- **CacheConfig**: Couchbase cache manager (**NUEVO**)
- **MongoConfig**: Conexión MongoDB Atlas
- **WebConfig**: CORS global
- **RestClientConfig**: RestClient/RestTemplate beans

### Estrategia de Caché (Couchbase)

| Cache Name | TTL | Uso |
|------------|-----|-----|
| `footer` | 6h | Footer del sitio (Strapi) |
| `heros` | 6h | Hero sections (Strapi) |
| `formats` | 6h | Lista de formatos (Strapi) |
| `format-detail` | 6h | Detalles de formato (Strapi) |
| `articles-latest` | 2h | Últimos artículos (Strapi) |
| `article-detail` | 2h | Detalle de artículo (Strapi) |
| `scryfall_search` | 24h | Búsquedas de cartas |
| `scryfall_card` | 24h | Cartas por ID |
| `scryfall_symbology` | 24h | Símbolos de maná |
| `scryfall_named` | 24h | Cartas por nombre exacto |
| `premodern_banned` | 24h | Banlist Premodern |

### Endpoints Principales

```http
# Decks
POST   /api/decks              # Crear mazo
GET    /api/decks/{id}         # Obtener mazo
PUT    /api/decks/{id}         # Actualizar mazo
DELETE /api/decks/{id}         # Eliminar mazo
GET    /api/decks/user/{userId} # Mazos de un usuario
POST   /api/decks/daily        # Guardar daily deck
GET    /api/decks/daily/latest # Último daily deck

# Cards
GET    /api/cards/search       # Buscar cartas (Scryfall)
GET    /api/cards/autocomplete # Autocompletado
GET    /api/cards/{id}         # Carta por ID

# Formats
GET    /api/formats            # Listar formatos
GET    /api/formats/{name}     # Detalle de formato

# AI (proxy a engine)
POST   /api/ai/suggest-sideboard # Sugerir sideboard
POST   /api/ai/analyze-deck      # Analizar mazo
POST   /api/ai/generate-random-deck # Mazo aleatorio

# Content (Strapi proxy)
GET    /api/content/footer?locale=en
GET    /api/content/heros?locale=es
GET    /api/content/formats?locale=en
GET    /api/articles/latest?limit=5
```

### Variables de Entorno
```yaml
# MongoDB
SPRING_DATA_MONGODB_URI=mongodb+srv://...

# Couchbase
SPRING_COUCHBASE_CONNECTION_STRING=couchbase://couchbase:11210
SPRING_COUCHBASE_USERNAME=admin
SPRING_COUCHBASE_PASSWORD=manaforge123

# OAuth2
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=...
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=...

# Strapi
STRAPI_API_URL=https://original-book-1bf186e2ab.strapiapp.com/api
STRAPI_API_TOKEN=a6a6f1cc...

# Python Engine
SERVICES_PYTHON_ENGINE_URL=http://engine:8000

# Frontend
FRONTEND_URL=https://mana-forge.com
```

### Deployment
```dockerfile
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 🏗️ Proyecto 3: mana-forge-engine (AI Engine)

### Stack Tecnológico
- **Framework**: FastAPI 0.115
- **ASGI Server**: Uvicorn (standard) 0.30
- **AI Provider**: Groq Cloud (Llama 3.3 70B)
- **Validation**: Pydantic 2.9
- **HTTP Client**: Requests 2.31
- **Environment**: python-dotenv 1.0

### Estructura de Carpetas
```
mana-forge-engine/
├── main.py               # FastAPI app + endpoints
├── services/
│   └── ai_service.py     # Lógica IA (Groq client)
├── schemas/
│   └── deck_schemas.py   # Pydantic models
├── prompts/
│   ├── sideboard_prompts.py
│   ├── analysis_prompts.py
│   └── random_deck_prompts.py
├── test_*.py             # Tests manuales
└── requirements.txt
```

### Endpoints

#### 1. POST /v1/ai/suggest-sideboard
**Request:**
```json
{
  "main_deck": [
    {"name": "Lightning Bolt", "quantity": 4},
    {"name": "Goblin Guide", "quantity": 4}
  ],
  "format_name": "premodern",
  "locale": "en"
}
```

**Response:**
```json
{
  "sideboard": [
    {"name": "Pyroblast", "quantity": 4},
    {"name": "Red Elemental Blast", "quantity": 3}
  ],
  "reasoning": "Against blue control matchups..."
}
```

#### 2. POST /v1/ai/analyze-deck
**Request:**
```json
{
  "main_deck": [...],
  "sideboard": [...],
  "format_name": "premodern",
  "locale": "en",
  "meta_archetypes": ["Burn", "Stiflenought"]
}
```

**Response:**
```json
{
  "archetype": "Burn",
  "strengths": "Fast clock, resilient to countermagic",
  "weaknesses": "Weak to lifegain, runs out of steam",
  "matchups": {
    "Stiflenought": "Favorable (65%)",
    "Oath": "Unfavorable (35%)"
  },
  "suggestions": "Consider 2x Sulfuric Vortex in SB"
}
```

#### 3. POST /v1/ai/generate-random-deck
**Request:**
```json
{
  "format_name": "premodern", // optional
  "locale": "en"
}
```

**Response:**
```json
{
  "deck_name": "Mono-Red Sligh",
  "format": "premodern",
  "main_deck": [...],
  "sideboard": [...],
  "strategy": "Aggressive low-to-the-ground strategy",
  "analysis": {
    "archetype": "Burn",
    "strengths": "...",
    "weaknesses": "..."
  }
}
```

### Características Clave
- **Structured Output**: `response_format={"type": "json_object"}`
- **Temperature**: 0.5 (balance creatividad/determinismo)
- **Model**: `llama-3.3-70b-versatile`
- **Meta Awareness**: Conoce arquetipos de Premodern
- **Multi-idioma**: Prompts en español/inglés

### Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 🐳 Docker Compose

```yaml
services:
  web:        # Frontend (Nginx)
    ports: ["80:80"]
    depends_on: [api]

  api:        # Backend (Spring Boot)
    ports: ["8080:8080"]
    depends_on: [engine, couchbase]
    environment:
      - SPRING_COUCHBASE_CONNECTION_STRING=couchbase://couchbase:11210
      - SERVICES_PYTHON_ENGINE_URL=http://engine:8000

  engine:     # AI Engine (FastAPI)
    ports: ["8000:8000"]
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}

  couchbase:  # Cache (Couchbase Server)
    ports: ["8091-8096:8091-8096", "11210:11210"]
    volumes: [couchbase_data:/opt/couchbase/var]
```

---

## 🔄 Flujo de Datos

### 1. Construcción de Mazo
```
User → Frontend → Backend → Scryfall API
                           ↓ (cache)
                        Couchbase
                           ↓
                       MongoDB
```

### 2. Sugerencia de Sideboard
```
User → Frontend → Backend → AI Engine → Groq Cloud
                                      ↓ (Llama 3.3)
                                   Response
```

### 3. Carga de Contenido
```
User → Frontend → Backend → Couchbase (hit/miss)
                           ↓ (miss)
                        Strapi CMS
                           ↓ (cache)
                        Couchbase
```

---

## 📊 Bases de Datos

### MongoDB Atlas
**Collections:**
- `users`: Usuarios OAuth2
- `decks`: Mazos (con cards embebidas)
- `formats`: Formatos soportados
- `cards`: Caché de cartas (opcional)
- `daily_decks`: Daily deck of the day

### Couchbase (Cache)
**Buckets:**
- `manaforge-cache`: Todos los cachés con TTLs diferenciados

### H2 (In-Memory)
- Solo desarrollo/testing
- No persiste datos

---

## 🔐 Seguridad

### Autenticación
- **OAuth2 Code Flow** con Google
- Redirect: `https://mana-forge.com/api/login/oauth2/code/google`
- Success Handler crea sesión y redirige al frontend

### Autorización
- JWT tokens (Spring Security)
- CORS configurado para `http://localhost:5173` (dev)
- Production: Solo `https://mana-forge.com`

### Secrets Management
⚠️ **WARNING**: Actualmente hay credenciales hardcodeadas en:
- `application.yaml` (MongoDB, OAuth2, Strapi)
- `docker-compose.yml` (variables de entorno)

**Recomendación**: Migrar a:
- Kubernetes Secrets
- AWS Secrets Manager
- HashiCorp Vault
- Variables de entorno del host

---

## 🚀 Comandos de Desarrollo

### Frontend
```bash
cd mana-forge-web
npm install
npm run dev          # http://localhost:5173
npm run build
npm run preview
```

### Backend
```bash
cd mana-forge-api
./mvnw clean install
./mvnw spring-boot:run  # http://localhost:8080
# Swagger: http://localhost:8080/swagger-ui.html
```

### AI Engine
```bash
cd mana-forge-engine
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python main.py  # http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Docker Compose
```bash
# Levantar todo
docker-compose up -d

# Logs
docker logs mana-forge-web-1
docker logs mana-forge-api-1
docker logs mana-forge-engine-1
docker logs mana-forge-cache-1

# Detener
docker-compose down

# Limpiar volúmenes
docker-compose down -v
```

---

## 📈 Mejoras Futuras

### Corto Plazo
- [ ] Migrar secrets a variables de entorno
- [ ] Tests unitarios/integración (falta coverage)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Rate limiting en endpoints públicos
- [ ] Health checks completos en cada servicio

### Medio Plazo
- [ ] Caché de segundo nivel con Redis (sessions)
- [ ] Búsqueda full-text con Elasticsearch
- [ ] Notificaciones real-time con WebSockets
- [ ] Sistema de likes/comments en mazos
- [ ] Leaderboard/rankings

### Largo Plazo
- [ ] Multi-región deployment
- [ ] GraphQL API alternativa
- [ ] App móvil nativa (React Native)
- [ ] Sistema de torneos
- [ ] Integración con MTGO/Arena

---

## 📝 Notas Técnicas

### Performance
- **Virtual Threads**: Java 25 maneja 10k+ requests concurrentes
- **Couchbase TTL**: Reduce latencia de Strapi 80-90%
- **Scryfall Cache**: 24h evita rate limits (100 req/s)

### Escalabilidad
- **Frontend**: Nginx puede servir 10k+ conn concurrentes
- **Backend**: Spring Boot soporta clustering
- **AI Engine**: Stateless, horizontal scaling trivial
- **Couchbase**: Soporta clustering (3+ nodos)

### Monitoreo
- **Spring Actuator**: `/actuator/health`, `/actuator/metrics`
- **Couchbase UI**: `http://localhost:8091` (admin/password)
- **FastAPI Docs**: `http://localhost:8000/docs`

---

## 👥 Team & Contacts

- **Repository**: Private monorepo
- **Owner**: @valanhyr
- **Stack**: Full Stack (React + Spring + Python)
- **License**: Proprietary

---

## 📚 Referencias

- [Spring Boot 4 Docs](https://docs.spring.io/spring-boot/index.html)
- [Couchbase Spring Data](https://docs.spring.io/spring-data/couchbase/reference/)
- [Groq API Docs](https://console.groq.com/docs)
- [Scryfall API](https://scryfall.com/docs/api)
- [Strapi CMS](https://docs.strapi.io/)
