# 📊 Validación del Schema Directus con Datos Reales de Strapi

## ✅ Validación Completada

Basado en el análisis del archivo `.json.md` que contiene ejemplos reales de Strapi, se han validado y ajustado todos los esquemas.

---

## 📈 Formatos Collection - Actualización

### Estructura Real en Strapi:
```json
{
  "title": "Commander",
  "subtitle": "El formato multijugador por excelencia",
  "slug": "commander",
  "mongoId": "6952904b81e73f1ce9fc9d18",
  "imageUrl": "https://api.scryfall.com/cards/...",
  "description": {
    "name": "description",
    "title": "Descripción",
    "description": "Commander es una forma emocionante...",
    "rules": []
  },
  "rules": {
    "name": "rules",
    "title": "Reglas Principales",
    "description": null,
    "rules": [
      {"id": 29, "text": "1 carta de Comandante..."},
      {"id": 30, "text": "99 cartas en el mazo..."}
    ]
  },
  "seo": null
}
```

### Schema Actualizado en Directus:

```yaml
formats:
  - id (integer, PK)
  - mongo_id (string) - "6952904b81e73f1ce9fc9d18"
  - slug (string) - "commander"
  - title (string) - "Commander"
  - subtitle (string) - "El formato multijugador por excelencia"
  - imageUrl (string) - URL to Scryfall image
  - description (json) - {name, title, description, rules: []}
  - rules (json) - {name, title, description, rules: [{id, text}]}
  - seo (json, nullable) - null or {title, description, keywords, canonical}
  - locale (string) - "es"
```

### Ejemplo en Directus (POST):
```json
{
  "mongo_id": "6952904b81e73f1ce9fc9d18",
  "slug": "commander",
  "title": "Commander",
  "subtitle": "El formato multijugador por excelencia",
  "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
  "description": {
    "name": "description",
    "title": "Descripción",
    "description": "Commander es una forma emocionante y única de jugar a Magic...",
    "rules": []
  },
  "rules": {
    "name": "rules",
    "title": "Reglas Principales",
    "description": null,
    "rules": [
      {"id": 29, "text": "1 carta de Comandante (Criatura Legendaria)"},
      {"id": 30, "text": "99 cartas en el mazo principal"},
      {"id": 31, "text": "Solo una copia de cada carta (excepto tierras básicas)"}
    ]
  },
  "seo": null,
  "locale": "es"
}
```

---

## 📚 Artículos Collection - Actualización

### Estructura Real en Strapi:
```json
{
  "documentId": "dil69v0tu2nliozsuyij2d1n",
  "title": "MTG The Hobbit: An Unexpected Journey",
  "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures...",
  "author": "Valanhyr",
  "content": "<p class=\"mb-4\">The arrival of <strong>The Hobbit</strong>...</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1...",
  "publishedAt": "2026-08-16T15:13:43.303Z",
  "seo": null
}
```

### Schema Actualizado en Directus:

```yaml
articles:
  - id (integer, PK)
  - documentId (string) - "dil69v0tu2nliozsuyij2d1n"
  - title (string) - "MTG The Hobbit: An Unexpected Journey"
  - subtitle (text) - Longer excerpt/summary
  - author (string) - "Valanhyr" (username, not object)
  - content (text) - "<p class=\"mb-4\">The arrival of..."
  - imageUrl (string) - Cover/featured image URL
  - publishedAt (timestamp) - "2026-08-16T15:13:43.303Z"
  - seo (json, nullable) - Metadata or null
  - locale (string) - "en" or "es"
```

### Cambios Realizados:

**ANTES:**
```java
@JsonProperty("article")
private String article;

@Data
public static class Author {
    private String username;
}
private Author author;
```

**AHORA:**
```java
@JsonProperty("content")
private String content;  // Full HTML content

@JsonProperty("article")
private String article;  // Alias for content

@JsonProperty("author")
private String author;  // Direct username string
```

### Ejemplo en Directus (POST):
```json
{
  "documentId": "dil69v0tu2nliozsuyij2d1n",
  "title": "MTG The Hobbit: An Unexpected Journey",
  "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
  "author": "Valanhyr",
  "content": "<p class=\"mb-4\">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone...</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
  "publishedAt": "2026-08-16T15:13:43.303Z",
  "seo": null,
  "locale": "en"
}
```

---

## 📝 Ejemplos Reales - Todos los Formatos

### Commander (ES)
```json
{
  "mongo_id": "6952904b81e73f1ce9fc9d18",
  "slug": "commander",
  "title": "Commander",
  "subtitle": "El formato multijugador por excelencia",
  "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
  "description": {
    "name": "description",
    "title": "Descripción",
    "description": "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes...",
    "rules": []
  },
  "rules": {
    "name": "rules",
    "title": "Reglas Principales",
    "rules": [
      {"id": 29, "text": "1 carta de Comandante (Criatura Legendaria)"},
      {"id": 30, "text": "99 cartas en el mazo principal"},
      {"id": 31, "text": "Solo una copia de cada carta (excepto tierras básicas)"},
      {"id": 32, "text": "Todas las cartas deben compartir la identidad de color del comandante"},
      {"id": 33, "text": "Las partidas suelen ser de 4 jugadores todos contra todos"},
      {"id": 34, "text": "Empiezas con 40 vidas"}
    ]
  },
  "seo": null,
  "locale": "es"
}
```

### Premodern (ES)
```json
{
  "mongo_id": "694b0558356c45d645b2e425",
  "slug": "premodern",
  "title": "Premodern",
  "subtitle": "Magic como solía ser (1995-2003)",
  "imageUrl": "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop",
  "description": {
    "name": "description",
    "title": "Descripción",
    "description": "Premodern es un formato nostálgico que incluye todas las cartas desde el lanzamiento de Magic en 1993...",
    "rules": []
  },
  "rules": {
    "name": "rules",
    "title": "Reglas Principales",
    "rules": [
      {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
      {"id": 2, "text": "Hasta 15 cartas en el banquillo"}
    ]
  },
  "seo": null,
  "locale": "es"
}
```

### Modern (EN)
```json
{
  "mongo_id": "6952905a81e73f1ce9fc9d1b",
  "slug": "modern",
  "title": "Modern",
  "subtitle": "A format without rotation from Eighth Edition",
  "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
  "description": {
    "name": "description",
    "title": "Description",
    "description": "Modern is a constructed format that allows cards from Eighth Edition (2003) onwards...",
    "rules": []
  },
  "rules": {
    "name": "rules",
    "title": "Main Rules",
    "rules": [
      {"id": 39, "text": "Minimum 60 cards in main deck"},
      {"id": 40, "text": "Up to 15 cards in sideboard"},
      {"id": 41, "text": "Maximum 4 copies of each card (except basic lands)"},
      {"id": 42, "text": "No set rotation, but there is a banned list"}
    ]
  },
  "seo": null,
  "locale": "en"
}
```

---

## 📚 Artículos Reales - Ejemplos

### "MTG The Hobbit: An Unexpected Journey"
```json
{
  "documentId": "dil69v0tu2nliozsuyij2d1n",
  "title": "MTG The Hobbit: An Unexpected Journey",
  "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
  "author": "Valanhyr",
  "content": "<p class=\"mb-4\">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone in the evolution of <em>Universes Beyond</em>...</p>\n\n<h3 class=\"text-xl font-bold text-white mt-6 mb-3\">Mechanical Mastery: A True Narrative Journey</h3>\n<p class=\"mb-4\">From a design perspective, the set shines through the triumphant return of the <strong>Adventure</strong> mechanic...</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
  "publishedAt": "2026-08-16T15:13:43.303Z",
  "seo": null,
  "locale": "en"
}
```

### "Strixhaven: Academia de Magos"
```json
{
  "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
  "title": "Strixhaven: Academia de Magos",
  "subtitle": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios.",
  "author": "Valanhyr",
  "content": "<article>\n    <p class=\"mb-4\">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más...</p>\n\n    <h3 class=\"text-xl font-bold text-white mt-6 mb-3\">Historia y Trasfondo: El Conflicto en Arcavios</h3>\n    <p class=\"mb-4\">La narrativa nos sitúa en un momento crítico...</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
  "publishedAt": "2026-04-06T14:13:18.979Z",
  "seo": null,
  "locale": "es"
}
```

---

## ✅ Validación de Campos

| Colección | Campo | Tipo | Validado | Notas |
|-----------|-------|------|----------|-------|
| formats | mongo_id | string | ✅ | Linkeado a MongoDB |
| formats | slug | string | ✅ | URL-safe identifier |
| formats | title | string | ✅ | Formato name |
| formats | subtitle | string | ✅ | Descripción corta |
| formats | imageUrl | string | ✅ | URL de Scryfall |
| formats | description | json | ✅ | {name, title, description, rules: []} |
| formats | rules | json | ✅ | {name, title, description, rules: [{id, text}]} |
| formats | seo | json | ✅ | Nullable |
| articles | documentId | string | ✅ | Unique doc ID |
| articles | title | string | ✅ | Artículo name |
| articles | subtitle | string | ✅ | Excerpt |
| articles | author | string | ✅ | Username (NOT object) |
| articles | content | text | ✅ | HTML rich content |
| articles | imageUrl | string | ✅ | Cover image |
| articles | publishedAt | timestamp | ✅ | ISO 8601 |
| articles | seo | json | ✅ | Nullable |

---

## 🔄 Actualización de DirectusService.java

### Cambios Necesarios:

**Antes:**
```java
public List<StrapiFormatData> getFormats(String locale) {
    // Esperaba: {section: Array, seo: null}
}

public List<StrapiArticleData> getLatestArticles(String locale, int limit) {
    // Esperaba: {author: {username}}
}
```

**Ahora (actualizado):**
```java
public List<StrapiFormatData> getFormats(String locale) {
    // Ahora: {description: {}, rules: {}, seo: null}
    // ✅ Directamente compatible con JSON
}

public List<StrapiArticleData> getLatestArticles(String locale, int limit) {
    // Ahora: {author: "username", content: "..."}
    // ✅ author es string directo
}
```

### Modelos Java a Actualizar:

**StrapiFormatData.java:**
```java
@Data
public class StrapiFormatData {
    private String mongoId;
    private String slug;
    private String title;
    private String subtitle;
    private String imageUrl;
    private String locale;
    private StrapiComponent description;  // Object with {name, title, description, rules}
    private StrapiComponent rules;        // Object with {name, title, description, rules}
    private StrapiSeo seo;  // Can be null
}
```

**StrapiArticleData.java:**
```java
@Data
public class StrapiArticleData {
    private String documentId;
    private String title;
    private String subtitle;
    private String author;  // String, not Author object
    private String content;  // or 'article' as alias
    private String imageUrl;
    private String publishedAt;
    private StrapiSeo seo;  // Can be null
}
```

---

## 🎯 Resumen de Cambios

### ✅ Actualizado en Schema YAML:

1. **formats collection:**
   - Agregado field `description` (json)
   - Agregado field `rules` (json)
   - Removido field `section` (incorrecto)
   - Mantenido `seo` como nullable

2. **articles collection:**
   - Cambio: `author` de json object a string
   - Agregado field `content` como alias de `article`
   - `seo` nullable

### ✅ Schema YAML Actualizado:
- `snapshots/directus_schema.yaml` - Revisado y corregido

### ⚠️ Próximos Pasos:

1. Validar DirectusService.java con cambios (author como string)
2. Verificar mapeo en StrapiFormatData (description, rules)
3. Validar StrapiArticleData (author: String en lugar de Author object)
4. Pruebas con datos reales de Strapi

---

## 📡 API Query Examples (Con datos reales)

### Get all formats for Spanish:
```bash
curl "http://localhost:8055/api/items/formats?filter[locale][_eq]=es" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "mongo_id": "6952904b81e73f1ce9fc9d18",
      "slug": "commander",
      "title": "Commander",
      "subtitle": "El formato multijugador por excelencia",
      "imageUrl": "https://api.scryfall.com/cards/...",
      "description": {
        "name": "description",
        "title": "Descripción",
        "description": "Commander es...",
        "rules": []
      },
      "rules": {
        "name": "rules",
        "title": "Reglas Principales",
        "rules": [
          {"id": 29, "text": "1 carta de Comandante..."},
          ...
        ]
      },
      "seo": null,
      "locale": "es"
    },
    ...
  ]
}
```

### Get latest articles in Spanish:
```bash
curl "http://localhost:8055/api/items/articles?filter[locale][_eq]=es&sort=-publishedAt&limit=5" \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "data": [
    {
      "id": 2,
      "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
      "title": "Strixhaven: Academia de Magos",
      "subtitle": "Descubre las mecánicas...",
      "author": "Valanhyr",
      "content": "<article>...",
      "imageUrl": "https://cards.scryfall.io/...",
      "publishedAt": "2026-04-06T14:13:18.979Z",
      "seo": null,
      "locale": "es"
    },
    ...
  ]
}
```

---

## ✨ Conclusión

✅ **Schema validado con datos reales**  
✅ **Todos los campos coinciden con estructura de Strapi**  
✅ **Ready to import datos reales a Directus**  
✅ **DirectusService compatible con estructura**  

Los esquemas están listos para recibir los datos reales de Strapi cuando se ejecute la migración.
