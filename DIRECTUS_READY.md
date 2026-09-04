# ✅ Directus Setup Completado - Objetos Reales Funcionando

## 🎯 Estado Actual

Directus está **completamente configurado** y devolviendo los objetos reales de Strapi sin problemas.

---

## 📊 Datos Cargados

### Formatos (3 items)
**Spanish (es):**
- ✅ Commander
- ✅ Premodern

**English (en):**
- ✅ Modern

### Artículos (2 items)
**English (en):**
- ✅ MTG The Hobbit: An Unexpected Journey

**Spanish (es):**
- ✅ Strixhaven: Academia de Magos

---

## 📝 Estructura de Datos

### Formats - Ejemplo Real Devuelto

```json
{
  "id": 1,
  "mongo_id": "6952904b81e73f1ce9fc9d18",
  "slug": "commander",
  "title": "Commander",
  "subtitle": "El formato multijugador por excelencia",
  "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector...",
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
      {"id": 29, "text": "1 carta de Comandante (Criatura Legendaria)"},
      {"id": 30, "text": "99 cartas en el mazo principal"},
      ...
    ]
  },
  "seo": null,
  "locale": "es"
}
```

### Articles - Ejemplo Real Devuelto

```json
{
  "id": 1,
  "documentId": "dil69v0tu2nliozsuyij2d1n",
  "title": "MTG The Hobbit: An Unexpected Journey",
  "subtitle": "Explore the Adventure mechanic...",
  "author": "Valanhyr",
  "content": "<p class=\"mb-4\">The arrival of <strong>The Hobbit</strong>...</p>",
  "article": null,
  "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/...",
  "publishedAt": "2026-08-16T15:13:43.303Z",
  "seo": null,
  "locale": "en"
}
```

---

## 🔗 URLs de Prueba

### Admin Panel
- **URL:** http://localhost:9055/admin/
- **Usuario:** admin@example.com
- **Contraseña:** admin_password_change_me

### API Endpoints

#### Formatos en Español
```bash
GET http://localhost:9055/items/formats?filter[locale][_eq]=es
Authorization: Bearer {token}
```

#### Formatos en Inglés
```bash
GET http://localhost:9055/items/formats?filter[locale][_eq]=en
Authorization: Bearer {token}
```

#### Artículos en Español
```bash
GET http://localhost:9055/items/articles?filter[locale][_eq]=es
Authorization: Bearer {token}
```

#### Artículos en Inglés
```bash
GET http://localhost:9055/items/articles?filter[locale][_eq]=en
Authorization: Bearer {token}
```

---

## 🛠️ Scripts Creados

| Script | Propósito | Estado |
|--------|-----------|--------|
| `setup_directus_simple.py` | Crear colecciones y campos | ✅ Ejecutado |
| `populate_directus_data.py` | Poblar datos reales | ✅ Ejecutado |
| `apply_directus_schema.py` | Aplicar schema YAML (alternativo) | ⏸️ No necesario |

---

## 🔄 Próximos Pasos

### 1. Verificar Integración con Spring API
```bash
cd mana-forge-api
./mvnw spring-boot:run
```

Crear endpoints que llamen a Directus:
- `GET /api/formats` → Directus `/items/formats`
- `GET /api/articles` → Directus `/items/articles`

### 2. Actualizar DirectusService.java
Asegurarse que maneja:
- ✅ description como JSON object
- ✅ rules como JSON object
- ✅ author como string (no object)
- ✅ content field para articles

### 3. Pruebas desde Spring API
```bash
curl http://localhost:8080/api/formats?locale=es
curl http://localhost:8080/api/articles?locale=en
```

### 4. Integración Frontend
React debe consumir:
```typescript
const formats = await api.get('/api/formats?locale=es')
const articles = await api.get('/api/articles?locale=en')
```

---

## 📚 Colecciones Disponibles

| Colección | Estado | Campos |
|-----------|--------|--------|
| `formats` | ✅ Operativa | mongo_id, slug, title, subtitle, imageUrl, description, rules, seo, locale |
| `articles` | ✅ Operativa | documentId, title, subtitle, author, content, article, imageUrl, publishedAt, seo, locale |
| `footer` | ✅ Creada | (Vacía) |
| `footer_legal` | ✅ Creada | (Vacía) |
| `heros` | ✅ Creada | (Vacía) |
| `sections` | ✅ Creada | (Vacía) |
| `languages` | ✅ Creada | (Vacía) |

---

## ✨ Validación Completada

- ✅ Schema YAML validado con datos reales de Strapi
- ✅ Colecciones creadas en Directus
- ✅ Datos poblados exitosamente
- ✅ API devuelve objetos JSON correctamente
- ✅ Estructura coincide con ejemplos de Strapi
- ✅ description y rules como JSON objects (no strings)
- ✅ author como string (no object)
- ✅ Todas las locales soportadas (en, es, pt, fr)

---

## 🎓 Comparación Strapi ↔ Directus

### Request Flow (Strapi)
```
Frontend → Spring API → Strapi REST
                        ↓
            Devuelve: {data: {attributes: {...}}}
```

### Request Flow (Directus)
```
Frontend → Spring API → Directus REST
                        ↓
            Devuelve: {data: [{...}]}
```

### Diferencias principales:
1. **Wrapping:** Strapi usa `attributes`, Directus devuelve flat
2. **Collection:** Directus siempre devuelve array, Strapi varía
3. **API Routes:** Strapi usa `/api/`, Directus usa `/` sin prefijo
4. **Fields:** Misma estructura JSON, pero Directus tipo `json` vs Strapi componentes

---

## 📦 Dependencias

- ✅ Python 3.11+
- ✅ requests (para scripts)
- ✅ pyyaml (para schemas)
- ✅ Docker Compose (Directus + PostgreSQL)

---

## 🚀 Status Summary

| Componente | Estado |
|-----------|--------|
| Directus Setup | ✅ Completado |
| Schema Creado | ✅ Completado |
| Datos Poblados | ✅ Completado |
| API Queries | ✅ Funcionando |
| JSON Objects | ✅ Correctos |
| Spring Integration | 🔄 Pendiente |
| Frontend Integration | 🔄 Pendiente |

---

## 📞 Soporte

Para ver los datos en tiempo real:
1. Accede a http://localhost:9055/admin/
2. Ve a Collections → formats o articles
3. Verifica que los JSON objects se muestren correctamente

Para hacer queries con token:
```bash
TOKEN=$(curl -s -X POST http://localhost:9055/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password_change_me"}' \
  | jq -r '.data.access_token')

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:9055/items/formats?filter[locale][_eq]=es"
```

---

**Última actualización:** 2026-09-04  
**Validación:** Datos de Strapi (`format-example-es.json`, `article-example-en.json`)
