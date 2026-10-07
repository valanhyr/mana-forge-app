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

# Python Engine
SERVICES_PYTHON_ENGINE_URL=http://engine:8000

# Frontend
FRONTEND_URL=https://mana-forge.com

# Cloudflare Turnstile (protección del análisis público de IA)
# SITE_KEY es pública y se compila dentro del bundle web.
# La presencia de SECRET_KEY activa la verificación automáticamente.
CLOUDFLARE_TS_SITE_KEY=0x4AAAAA...
CLOUDFLARE_TS_SECRET_KEY=0x4AAAAA...

# Controles de abuso del análisis público (0 = sin cuota)
AI_QUOTA_ENABLED=true
AI_QUOTA_ANONYMOUS_DAILY=5
AI_QUOTA_AUTHENTICATED_DAILY=25
AI_CACHE_TTL_HOURS=24
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

> **Nota**: el engine **no acepta listas en texto plano**. Todos los endpoints de
> análisis esperan una lista ya estructurada (`main_deck: [{name, quantity}]`).
> El parseo de texto pegado ocurre en el frontend
> (`mana-forge-web/src/utils/decklistParser.ts`), que resuelve los nombres contra
> Scryfall antes de llamar a la API.

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
    # Sin `ports`: red interna únicamente. Publicar 8000 exponía la IA
    # directamente, saltándose Cloudflare, nginx y el rate limit del backend.
    expose: ["8000"]
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - AI_MAX_CONCURRENT_REQUESTS=${AI_MAX_CONCURRENT_REQUESTS:-4}

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
- Usernames autogenerados desde `given_name` de Google con sufijo numérico de ser necesario para garantizar unicidad.

### Autorización
- Session-based (Spring Security). No hay JWT tokens en el frontend.
- CORS configurado explícitamente: `http://localhost:5173` (dev) + `FRONTEND_URL` (prod). Nunca `allowedOriginPatterns("*")` con `allowCredentials=true`.
- Las cookies de sesión tienen `HttpOnly`, `Secure`, `SameSite=Lax` configurados en `application.yaml`.
- Cache invalidation endpoints (`DELETE /api/*/cache`) requieren autenticación — no son accesibles de forma anónima.

### Seguridad del Motor IA
- El motor FastAPI **no tiene autenticación propia** — depende de no estar expuesto públicamente.
- En producción Docker, el puerto 8000 del engine **no se publica al host** (`expose: ["8000"]`, sin `ports`). El Spring API lo llama como `http://engine:8000` via la red interna `mana-forge-network`. Publicar 8000 habría permitido saltarse Cloudflare, nginx y el rate limit del backend.
- Todos los inputs de usuario (card names, format_name, locale, archetypes) son sanitizados en `utils/sanitize.py` antes de ser interpolados en prompts LLM para mitigar prompt injection.
- `AI_MAX_CONCURRENT_REQUESTS` (default 4) limita las llamadas a IA simultáneas: si se agotan los huecos se responde **429** en lugar de acumular peticiones que cada una retiene una conexión 60s+.

### Protección contra abuso del análisis público
La homepage permite analizar un mazo sin registro (`POST /api/decks/analyze`). Como cada análisis consume presupuesto del proveedor de IA, hay cuatro capas:

| Capa | Dónde | Qué protege |
|---|---|---|
| Cloudflare Turnstile | `TurnstileService` | Bots. El token se verifica server-side contra `siteverify`; sin secreto configurado el servicio **rechaza** en vez de aceptar. |
| Cuota diaria | `AiQuotaService` (Redis) | Coste. 5/día anónimo por IP, 25/día por usuario. La IP se guarda hasheada (SHA-256), nunca en claro. |
| Caché de resultados | `AiQuotaService` (Redis) | Desperdicio. Mazos idénticos (mismo hash canónico) se sirven desde caché sin gastar tokens. Los errores nunca se cachean. |
| Rate limit por ráfaga | `RateLimitingInterceptor` | Pico de tráfico. 5/min por IP (Bucket4j, en memoria). |

Detalles de diseño relevantes:
- **Identidad del cliente**: `resolveClientIp` prioriza `CF-Connecting-IP` sobre `X-Forwarded-For`, porque Cloudflare sobrescribe el primero y no puede ser falsificado por el cliente, mientras que el segundo sí. El nginx del contenedor web sobrescribe (`=` en vez de `+=`) `X-Forwarded-For` para que no se pueda inyectar.
- **Degradación**: si Redis no está disponible, `AiQuotaService` cae a contadores en memoria. La cuota se sigue aplicando durante la vida del proceso; simplemente no se comparte entre réplicas. Una caída de Redis no tumba el endpoint.
- `GET /api/decks/analyze/quota` permite mostrar los análisis restantes antes de que el usuario escriba nada.

### Protección contra spam del formulario de contacto

`POST /api/contact` es anónimo y sin coste por llamada, pero cada envío dispara dos correos,
así que un bot que lo rellene produce ruido en `MAIL_ADMIN`. `ContactController` aplica tres
capas, en este orden:

| Capa | Dónde | Qué protege |
|---|---|---|
| Honeypot `website` | `ContactRequest.website` | Bots que rellenan todos los inputs. El campo está `hidden` + `aria-hidden` en `Contact.tsx`, así que ni screen readers ni el autofill lo tocan. |
| Tiempo de relleno | `ContactRequest.formRenderedAt` | Scripts que hacen fetch de la página y reenvían los campos. Se rechazan los envíos con menos de 2s desde el render. |
| Cloudflare Turnstile | `TurnstileService` | El resto. Se verifica server-side contra `siteverify` con la IP resuelta por `ClientIpResolver`. |

Ambos rechazos devuelven `403` con `code: FORM_REJECTED`; el de Turnstile, `TURNSTILE_FAILED`.
El cliente distingue el 403 y lo muestra inline (no como toast), porque el token es de un solo uso:
hay que pedir uno nuevo en lugar de reintentar a ciegas.

Decisiones que conviene no deshacer al tocar esto:

- **El endpoint es anónimo siempre**, así que no hay bypass para "usuarios autenticados" como en
  `DeckController`. Todo el mundo pasa el reto mientras Turnstile esté habilitado.
- **Falla cerrado, no abierto**: si `siteverify` no responde, `TurnstileService.verify` devuelve
  `false` y el envío se rechaza. Un atacante no debe poder tirar el servicio de verificación para
  abrir el formulario.
- **`formRenderedAt` es heurística, no prueba**: lo manda el cliente. Un reloj desfasado hacia el
  futuro se ignora en vez de rechazar, y un timestamp ausente no bloquea (clientes viejos, curl).
- **La IP se resuelve una sola vez**, con `ClientIpResolver`. `RateLimitingInterceptor`,
  `DeckController` y `ContactController` la comparten: si divergieran, un mismo llamante podría
  contar como anónimo para la cuota y como identificado para el rate limit.

### Turnstile en local: 400 en `challenges.cloudflare.com`
**Síntoma**: en `localhost` la consola muestra `400 (Bad Request)` contra
`/cdn-cgi/challenge-platform/...` y el widget nunca resuelve.

**Causa**: cada site key está vinculada a una lista de hostnames permitidos. Las claves de
producción solo aceptan `mana-forge.com`, así que Cloudflare rechaza el challenge
desde `localhost`. **No es un bug del código.**

**Cómo trabajar en local** — usar las claves dummy oficiales de Cloudflare
(`/turnstile/troubleshooting/testing`), que funcionan en cualquier dominio:

```
# mana-forge-web/.env.development
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# backend, para que siteverify acepte el token dummy
CLOUDFLARE_TS_SECRET_KEY=1x0000000000000000000000000000000AA
```

El secret de producción **rechaza** el token dummy, y el site key de producción
**rechaza** el hostname: las dos claves deben cambiarse a la vez.

En producción, `docker-compose.yml` inyecta `CLOUDFLARE_TS_SITE_KEY` del `.env`
raíz al bundle web. Un build local con ese fichero produce un widget inservible;
por eso el `.env` raíz lleva un aviso.

`TurnstileWidget` tiene un timeout de 8s y comprueba que `window.turnstile` exista
tras la carga: si el script se cuelga (que es justo lo que hace una clave no
permitida) el componente avisa en lugar de dejar el botón desactivado para
siempre.

#### Reglas WAF en el panel de Cloudflare (manual, fuera del repo)
Nada de esto está en el código: son reglas del dashboard. Están documentadas aquí
para que no se pierdan.

1. **Rate limiting** — `Security → WAF → Rate limiting rules`
   - Expresión: `http.request.uri.path eq "/api/decks/analyze"`
   - Requests: `1 requests / 10 seconds` (mitigación) · Period: `60 seconds`
   - Acción: `Block` ·también `http.request.method eq "POST"`
   - Es una red de seguridad **por debajo** de la cuota diaria: frena ráfagas, no
     sustituye al control de coste.
2. **Bot Fight Mode** — `Security → Bots`: activar. Complementa a Turnstile en el
   resto de la superficie pública.
3. **Regla de rate limit sobre `/api/decks/scores` y `/api/decks/random`**: mismo
   patrón. `scores` es el endpoint que llama automáticamente `handleSaveDeck`, así
   que recibe tráfico legítimo pero automatizado.
4. **Regla de rate limit sobre `/api/contact`**: `1 request / 10 seconds`, periodo
   `60 seconds`, acción `Block`. El código ya limita a 5/min por IP
   (`RateLimitingInterceptor`), pero es un contador en memoria: una sola réplica
   aguanta, varias no comparten cuota. Esta regla vive en el edge y no depende de
   eso. El Turnstile del formulario es la capa principal; esto es la red debajo.
5. **Verificar `CF-Connecting-IP`**: tras desplegar, comprobar que el backend
   recibe esa cabecera. Si no llega, la cuota por IP estaría agrupando a todos los
   visitantes en la IP de Cloudflare y se bloquearían entre sí.

### Cifrado de Email
⚠️ **Riesgo Conocido y Aceptado**: El servicio `EmailEncryptionService` usa **AES/ECB** (sin IV). Este modo es criptográficamente débil (emails idénticos producen ciphertexts idénticos). Sin embargo, el comportamiento determinista es **intencional y necesario**: el email cifrado se usa como clave de búsqueda en MongoDB (`findByEmail(encrypt(email))`). Cambiar a AES/GCM requeriría una migración completa de la base de datos. Mitigación futura recomendada: usar HMAC del email como clave de lookup en lugar del ciphertext.

### Secrets Management
Los secretos **no** están hardcodeados en el config versionado: `application.yaml` usa
`${ENV_VAR:default}` en todos los valores sensibles (MongoDB, OAuth2, Directus, SMTP, Couchbase,
cifrado de email, Turnstile). Viven en el `.env` de la raíz, que está en `.gitignore`, y llegan a
los contenedores vía `docker-compose.yml`.

⚠️ **Riesgo residual**: el `.env` de la raíz es un fichero plano en el disco de desarrollo y en el
host de CI. Cualquiera con acceso a ese host lee todas las credenciales de producción. Rotar un
secreto filtrado requiere intervención manual: cambiar el `.env` y redesplegar.

**Recomendación** a medio plazo:
- Kubernetes Secrets / AWS Secrets Manager / HashiCorp Vault para los despliegues
- Variables de entorno del host como mínimo, nunca un `.env` en el repositorio de despliegue

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
> En Windows PowerShell: `.\mvnw.cmd clean install`. El wrapper fija Maven 3.9.12.

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
