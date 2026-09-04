# 📘 Directus Schema Migration Guide

## Overview

Este documento describe el esquema de Directus generado automáticamente basado en los modelos de Strapi actuales en mana-forge-api.

**Generated from:** 
- `Footer.java`, `FooterLegal.java`, `Hero.java`, `Section.java`, `Language.java`
- `StrapiFormatData.java`, `StrapiArticleData.java`, `StrapiSeo.java`

---

## 📊 Collections Overview

### 1. **footer** (Singleton)
Pie de página global de la aplicación.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `title` | string | ❌ | Título del footer |
| `subtitle` | string | ❌ | Subtítulo |
| `footer_sections` | json | ❌ | Array de secciones con links |
| `locale` | string | ❌ | Idioma (en/es/pt/fr) |

**Ejemplo de `footer_sections`:**
```json
[
  {
    "title": "Company",
    "footer_links": [
      {"title": "About", "link": "/about", "target": "_self"},
      {"title": "Contact", "link": "/contact", "target": "_self"}
    ]
  }
]
```

---

### 2. **footer_legal** (Singleton)
Enlaces legales en el pie de página.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `copyright` | string | ❌ | Texto de copyright |
| `legal_links` | json | ❌ | Array de links legales |
| `locale` | string | ❌ | Idioma |

**Ejemplo de `legal_links`:**
```json
[
  {"id": 1, "title": "Privacy Policy", "link": "/privacy"},
  {"id": 2, "title": "Terms of Service", "link": "/terms"}
]
```

---

### 3. **heros**
Imágenes hero para diferentes secciones de la app.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `title` | string | ✅ | Título del hero |
| `subtitle` | string | ❌ | Subtítulo |
| `hero_id` | string | ✅ | ID único (e.g., "hero-landing") |
| `locale` | string | ✅ | Idioma |
| `image` | json | ❌ | Metadata de imagen |

**Ejemplo de `image`:**
```json
{
  "name": "hero.jpg",
  "alternativeText": "Landing page hero",
  "caption": "Main hero image",
  "mime": "image/jpeg",
  "url": "http://cdn.example.com/hero.jpg",
  "formats": {
    "thumbnail": {
      "name": "hero_thumb.jpg",
      "mime": "image/jpeg",
      "url": "http://cdn.example.com/hero_thumb.jpg"
    }
  }
}
```

---

### 4. **sections**
Secciones de contenido reutilizables.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `section_id` | string | ✅ | ID único (e.g., "section-features") |
| `title` | string | ✅ | Título |
| `subtitle` | string | ❌ | Subtítulo |
| `description` | text | ❌ | Descripción larga |
| `locale` | string | ✅ | Idioma |
| `image` | json | ❌ | Imagen (igual estructura que heros) |

---

### 5. **languages**
Idiomas disponibles en la plataforma.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `key` | string | ✅ | Código corto (en, es, pt, fr) |
| `name` | string | ✅ | Nombre en inglés (English, Español) |
| `locale` | string | ✅ | Código completo (en-US, es-ES) |
| `order` | integer | ❌ | Orden de visualización |

**Ejemplo:**
```json
{
  "id": 1,
  "key": "en",
  "name": "English",
  "locale": "en-US",
  "order": 1
}
```

---

### 6. **formats**
Formatos de Magic: The Gathering (Premodern, Legacy, etc.).

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `mongo_id` | string | ✅ | ID desde MongoDB (mana-forge-api) |
| `title` | string | ✅ | Nombre del formato |
| `subtitle` | string | ❌ | Subtítulo/descripción corta |
| `slug` | string | ❌ | URL-safe identifier |
| `locale` | string | ✅ | Idioma |
| `imageUrl` | string | ❌ | URL de imagen |
| `section` | json | ❌ | Componentes de reglas |
| `seo` | json | ❌ | Metadata SEO |

**Ejemplo de `seo`:**
```json
{
  "title": "Premodern Magic Format",
  "description": "Rules and cards for Premodern format",
  "keywords": "magic, premodern, tcg",
  "canonical": "https://mana-forge.app/formats/premodern"
}
```

---

### 7. **articles**
Artículos de blog/noticias.

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | integer | ✅ | Auto-incrementado, PK |
| `documentId` | string | ✅ | ID único del documento |
| `title` | string | ✅ | Título del artículo |
| `subtitle` | string | ❌ | Subtítulo/excerpt |
| `imageUrl` | string | ❌ | URL de imagen de portada |
| `article` | text | ❌ | Contenido (HTML o Markdown) |
| `locale` | string | ✅ | Idioma |
| `publishedAt` | timestamp | ❌ | Fecha de publicación |
| `author` | json | ❌ | Metadata del autor |
| `seo` | json | ❌ | Metadata SEO |

**Ejemplo de `author`:**
```json
{
  "username": "john_doe"
}
```

---

## 🔄 Mapeo: Strapi → Directus

| Strapi | Directus | Cambios |
|--------|----------|---------|
| `/api/footer?locale=es` | `/api/items/footer?filter[locale][_eq]=es` | Query simplificada |
| `data[0].attributes` | `data[0]` | Sin nesting "attributes" |
| `data[0].id` | `data[0].id` | Igual |
| `populate=*` | No needed (flat structure) | Todo se retorna por defecto |
| Locale como parámetro | Locale como campo | Filtrable como campo normal |

---

## 🚀 API REST Endpoints (Directus)

```bash
# GET all footers
curl http://localhost:8055/api/items/footer \
  -H "Authorization: Bearer YOUR_TOKEN"

# GET footer por locale
curl "http://localhost:8055/api/items/footer?filter[locale][_eq]=es" \
  -H "Authorization: Bearer YOUR_TOKEN"

# GET heroes
curl "http://localhost:8055/api/items/heros?filter[locale][_eq]=es&filter[hero_id][_eq]=hero-landing" \
  -H "Authorization: Bearer YOUR_TOKEN"

# GET articles (con paginación y sort)
curl "http://localhost:8055/api/items/articles?filter[locale][_eq]=es&sort=-publishedAt&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# CREATE article
curl -X POST http://localhost:8055/api/items/articles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Article",
    "article": "<p>Content here</p>",
    "locale": "es",
    "publishedAt": "2026-09-04T12:00:00Z"
  }'

# UPDATE article
curl -X PATCH http://localhost:8055/api/items/articles/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# DELETE article
curl -X DELETE http://localhost:8055/api/items/articles/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔐 Configuración de Seguridad

### 1. Crear API Token

En Directus UI (`http://localhost:8055`):
1. Settings → Access Tokens
2. Click "+ Create Token"
3. Nombre: `mana-forge-api`
4. Expiration: Personalized (e.g., 1 year)
5. Scope: `items.read` + `items.create` + `items.update` + `items.delete`
6. Copiar token

### 2. Configurar en mana-forge-api

**`application.yaml`:**
```yaml
directus:
  url: http://directus:8080  # Dentro de Docker
  admin-token: ${DIRECTUS_API_TOKEN}  # desde variables de entorno
```

**`.env` (local):**
```env
DIRECTUS_API_TOKEN=your_token_here
```

**`docker-compose.yml`:**
```yaml
services:
  mana-forge-api:
    environment:
      DIRECTUS_API_TOKEN: ${DIRECTUS_API_TOKEN}
```

---

## 📝 Java Service Implementation

### DirectusService

```java
@Service
public class DirectusService {
    
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    
    public DirectusService(RestClient.Builder builder,
                           @Value("${directus.url}") String directusUrl,
                           @Value("${directus.admin-token}") String token) {
        this.objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        
        this.restClient = builder
            .baseUrl(directusUrl)
            .defaultHeader("Authorization", "Bearer " + token)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }
    
    @Cacheable(value = "footer", key = "#locale")
    public Footer getFooter(String locale) throws JsonProcessingException {
        String response = restClient.get()
            .uri("/api/items/footer?filter[locale][_eq]=" + locale)
            .retrieve()
            .body(String.class);
        
        JsonNode data = objectMapper.readTree(response).path("data");
        
        return (data.isArray() && data.size() > 0) 
            ? objectMapper.treeToValue(data.get(0), Footer.class)
            : null;
    }
    
    @Cacheable(value = "heros", key = "#locale + '-' + #heroId")
    public List<Hero> getHeros(String locale, String heroId) throws JsonProcessingException {
        String filter = "filter[locale][_eq]=" + locale;
        if (heroId != null) {
            filter += "&filter[hero_id][_eq]=" + heroId;
        }
        
        String response = restClient.get()
            .uri("/api/items/heros?" + filter)
            .retrieve()
            .body(String.class);
        
        List<Hero> heroes = new ArrayList<>();
        JsonNode data = objectMapper.readTree(response).path("data");
        
        if (data.isArray()) {
            for (JsonNode node : data) {
                heroes.add(objectMapper.treeToValue(node, Hero.class));
            }
        }
        return heroes;
    }
}
```

---

## ✅ Setup Checklist

- [ ] Start Directus: `docker-compose -f docker-compose-directus.yml up -d`
- [ ] Wait for Directus to initialize (30 seconds)
- [ ] Access UI: `http://localhost:8055`
- [ ] Login with default admin credentials
- [ ] Apply schema: `python scripts/setup_directus_schema.py`
- [ ] Create API token in Settings → Access Tokens
- [ ] Populate collections manually or via API
- [ ] Create DirectusService in Java (replace StrapiService)
- [ ] Update ContentController to use DirectusService
- [ ] Test endpoints with curl/Postman
- [ ] Update docker-compose.yml to include Directus + PostgreSQL
- [ ] Commit and deploy

---

## 🆘 Troubleshooting

**Directus no inicia:**
```bash
docker-compose -f docker-compose-directus.yml logs directus
```

**Schema no se aplica:**
```bash
# Verificar que Directus está healthy
docker-compose -f docker-compose-directus.yml ps

# Reintentar
python scripts/setup_directus_schema.py
```

**Token no funciona:**
- Verificar que el token tiene permisos `items.read`, `items.create`, etc.
- Verificar que el URL es correcto (`http://directus:8080` dentro de Docker)
- Verificar header: `Authorization: Bearer YOUR_TOKEN`

**CORS issues:**
- Editar `docker-compose-directus.yml`
- Agregar tu URL frontend a `CORS_ORIGIN`
- Reiniciar: `docker-compose -f docker-compose-directus.yml restart directus`

---

## 📚 Recursos

- **Directus Docs:** https://docs.directus.io
- **API Reference:** https://docs.directus.io/reference/introduction
- **Schema Snapshot:** https://docs.directus.io/guides/sdk/schema-snapshot
- **REST Query API:** https://docs.directus.io/reference/query
