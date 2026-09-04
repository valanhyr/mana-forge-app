# 📊 Directus Schema - Visual Reference

## Collections Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DIRECTUS SCHEMA (7)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. footer (singleton)                                       │
│     ├─ id (integer, PK)                                      │
│     ├─ title (string)                                        │
│     ├─ subtitle (string)                                     │
│     ├─ footer_sections (json)                                │
│     └─ locale (string: en|es|pt|fr)                          │
│                                                               │
│  2. footer_legal (singleton)                                 │
│     ├─ id (integer, PK)                                      │
│     ├─ copyright (string)                                    │
│     ├─ legal_links (json array)                              │
│     └─ locale (string)                                       │
│                                                               │
│  3. heros                                                    │
│     ├─ id (integer, PK)                                      │
│     ├─ title (string, required)                              │
│     ├─ subtitle (text)                                       │
│     ├─ hero_id (string, required)                            │
│     ├─ image (json)                                          │
│     └─ locale (string, required)                             │
│                                                               │
│  4. sections                                                 │
│     ├─ id (integer, PK)                                      │
│     ├─ section_id (string, required)                         │
│     ├─ title (string, required)                              │
│     ├─ subtitle (text)                                       │
│     ├─ description (text)                                    │
│     ├─ image (json)                                          │
│     └─ locale (string, required)                             │
│                                                               │
│  5. languages                                                │
│     ├─ id (integer, PK)                                      │
│     ├─ key (string, required)  [en, es, pt, fr]              │
│     ├─ name (string, required) [English, Español, ...]       │
│     ├─ locale (string, required) [en-US, es-ES, ...]         │
│     └─ order (integer) [display order]                       │
│                                                               │
│  6. formats                                                  │
│     ├─ id (integer, PK)                                      │
│     ├─ mongo_id (string, required) [link to MongoDB]         │
│     ├─ title (string, required)                              │
│     ├─ subtitle (text)                                       │
│     ├─ slug (string)                                         │
│     ├─ imageUrl (string)                                     │
│     ├─ section (json) [rules components]                     │
│     ├─ seo (json) [{title, description, keywords, ...}]      │
│     └─ locale (string, required)                             │
│                                                               │
│  7. articles                                                 │
│     ├─ id (integer, PK)                                      │
│     ├─ documentId (string, required) [unique doc ID]         │
│     ├─ title (string, required)                              │
│     ├─ subtitle (text)                                       │
│     ├─ imageUrl (string) [cover image]                       │
│     ├─ article (text) [HTML/Markdown content]                │
│     ├─ publishedAt (timestamp)                               │
│     ├─ author (json) [{username}]                            │
│     ├─ seo (json) [metadata]                                 │
│     └─ locale (string, required)                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Field Types Reference

| Type | Usage | Example |
|------|-------|---------|
| `string` | Short text, max 500 chars | "Welcome to Mana Forge" |
| `text` | Long text, unlimited | Article content, descriptions |
| `integer` | Numbers | 1, 42, 2026 |
| `timestamp` | Date + time | "2026-09-04T12:00:00Z" |
| `json` | Nested objects/arrays | `{...}` or `[{...}]` |

---

## Locale Support

All collections support **4 locales**:

```
┌──────┬──────────┬──────────────┐
│ key  │ name     │ locale       │
├──────┼──────────┼──────────────┤
│ en   │ English  │ en-US        │
│ es   │ Español  │ es-ES        │
│ pt   │ Português│ pt-BR        │
│ fr   │ Français │ fr-FR        │
└──────┴──────────┴──────────────┘

Query example:
  GET /api/items/footer?filter[locale][_eq]=es
  → Returns footer en español
```

---

## Data Flow: Strapi → Directus → Java Service

```
┌──────────────────────────────────────────────────────────────┐
│                      BEFORE (Strapi)                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Strapi (/api/collection)                                    │
│    ↓                                                          │
│  Response: {data: {attributes: {...}}}  [nested]             │
│    ↓                                                          │
│  StrapiService (unwraps attributes)                          │
│    ↓                                                          │
│  ContentController                                           │
│    ↓                                                          │
│  Frontend (React)                                            │
│                                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     AFTER (Directus)                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Directus (/api/items/collection)                            │
│    ↓                                                          │
│  Response: {data: [{...}]}  [flat]                           │
│    ↓                                                          │
│  DirectusService (same interface)                            │
│    ↓                                                          │
│  ContentController (no changes!)                             │
│    ↓                                                          │
│  Frontend (React) - Receives same format                     │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Key benefit:** ContentController and Frontend see no difference!

---

## Sample Data Structure

### footer collection
```json
[
  {
    "id": 1,
    "title": "Mana Forge",
    "subtitle": "Magic: The Gathering Deck Builder",
    "locale": "en",
    "footer_sections": [
      {
        "title": "Company",
        "footer_links": [
          {"title": "About", "link": "/about", "target": "_self"},
          {"title": "Contact", "link": "/contact", "target": "_blank"}
        ]
      },
      {
        "title": "Resources",
        "footer_links": [
          {"title": "Docs", "link": "/docs", "target": "_self"}
        ]
      }
    ]
  }
]
```

### heros collection
```json
[
  {
    "id": 1,
    "title": "Build Your Deck",
    "subtitle": "Create and test Magic decks online",
    "hero_id": "hero-landing",
    "locale": "en",
    "image": {
      "name": "hero.jpg",
      "alternativeText": "Landing page hero",
      "mime": "image/jpeg",
      "url": "https://cdn.example.com/hero.jpg",
      "formats": {
        "thumbnail": {
          "url": "https://cdn.example.com/hero-thumb.jpg"
        }
      }
    }
  }
]
```

### formats collection
```json
[
  {
    "id": 1,
    "mongo_id": "507f1f77bcf86cd799439011",
    "title": "Premodern",
    "subtitle": "Magic: The Gathering Premodern Format",
    "slug": "premodern",
    "locale": "en",
    "imageUrl": "https://cdn.example.com/premodern.jpg",
    "section": [
      {
        "id": 1,
        "title": "Restricted Cards",
        "rules": "These cards are restricted..."
      }
    ],
    "seo": {
      "title": "Premodern Format",
      "description": "Learn about Premodern Magic format",
      "keywords": "magic, premodern, format",
      "canonical": "https://mana-forge.app/formats/premodern"
    }
  }
]
```

### articles collection
```json
[
  {
    "id": 1,
    "documentId": "article-123",
    "title": "Getting Started with Premodern",
    "subtitle": "A beginner's guide to Premodern Magic",
    "imageUrl": "https://cdn.example.com/article-hero.jpg",
    "article": "<h1>Welcome</h1><p>Premodern is...</p>",
    "locale": "en",
    "publishedAt": "2026-09-04T12:00:00Z",
    "author": {
      "username": "editor_name"
    },
    "seo": {
      "title": "Getting Started with Premodern",
      "description": "Learn how to play Premodern format",
      "keywords": "premodern, tutorial, beginner",
      "canonical": "https://mana-forge.app/articles/getting-started"
    }
  }
]
```

---

## API Query Examples

### GET all items
```bash
curl http://localhost:8055/api/items/footer \
  -H "Authorization: Bearer TOKEN"
```

### Filter by locale
```bash
curl "http://localhost:8055/api/items/footer?filter[locale][_eq]=es" \
  -H "Authorization: Bearer TOKEN"
```

### Multiple filters (AND)
```bash
curl "http://localhost:8055/api/items/heros?filter[locale][_eq]=en&filter[hero_id][_eq]=hero-landing" \
  -H "Authorization: Bearer TOKEN"
```

### Sort and limit
```bash
curl "http://localhost:8055/api/items/articles?sort=-publishedAt&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

### Create item
```bash
curl -X POST http://localhost:8055/api/items/articles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "article-new",
    "title": "New Article",
    "locale": "en",
    "publishedAt": "2026-09-04T12:00:00Z"
  }'
```

---

## Translation Strategy

Each collection has a `locale` field. To support multiple languages:

```
Option 1: Duplicate records per locale (current approach)
┌─────────────────────────────────────┐
│ footer (id: 1, locale: "en") ...    │
│ footer (id: 2, locale: "es") ...    │
│ footer (id: 3, locale: "pt") ...    │
└─────────────────────────────────────┘
Query: GET /api/items/footer?filter[locale][_eq]=es

Option 2: Translations junction table (future optimization)
┌─────────────────────────────────────┐
│ footer (id: 1)                      │
│ footer_translations (footer_id: 1,  │
│                     locale: "en",   │
│                     title: "...")   │
└─────────────────────────────────────┘
Query: GET /api/items/footer?fields=*,translations.*
```

Current implementation uses **Option 1** (simpler, scales well).

---

## Spring Boot Integration

### Configuration
```yaml
directus:
  url: http://directus:8080      # Inside Docker
  admin-token: ${DIRECTUS_TOKEN}  # From env var
```

### Service Method Example
```java
@Cacheable(value = "footer", key = "#locale")
public Footer getFooter(String locale) throws JsonProcessingException {
    String query = "filter[locale][_eq]=" + locale;
    JsonNode data = fetchFromDirectus("api/items/footer", query);
    
    return (data != null && data.isArray() && data.size() > 0) 
        ? objectMapper.treeToValue(data.get(0), Footer.class)
        : null;
}
```

### Controller (No Changes Needed)
```java
@GetMapping("/footer/{locale}")
public Footer getFooter(@PathVariable String locale) throws Exception {
    return directusService.getFooter(locale);  // Just swap the service!
}
```

---

## Performance Considerations

### Caching Strategy
```
Request 1 (cache miss):
  Client → API → Directus → Redis (store) → Client [~200ms]

Request 2 (cache hit):
  Client → API → Redis (hit) → Client [~5ms]
```

### TTL Configuration (in application.yaml)
```yaml
cache:
  directus:
    ttl: 3600  # 1 hour for footer, formats, articles
```

### Invalidation
```bash
# Clear specific cache
curl -X DELETE http://localhost:8080/api/v1/content/cache

# Or manually in Redis
redis-cli DEL footer footer-legal heros sections formats articles
```

---

Generated: September 4, 2026 | Status: Ready to implement ✅
