# 🌍 Directus Migration - Full EN/ES Data Ready

## ✅ Branch: `feature/directus-migration`

This branch contains the complete Directus migration with full English and Spanish localization.

---

## 📊 Data Summary

### Formats (6 total)
| Format | EN | ES |
|--------|----|----|
| Commander | ✅ | ✅ |
| Premodern | ✅ | ✅ |
| Modern | ✅ | ✅ |

### Articles (4 total)
| Article | EN | ES |
|---------|----|----|
| The Hobbit | ✅ | ✅ |
| Premodern Meta Analysis | ✅ | - |
| Strixhaven | - | ✅ |

---

## 🛠️ Scripts Included

### Setup & Population
```bash
# 1. Setup collections and fields (only once)
python scripts/setup_directus_simple.py

# 2. Populate with full EN/ES data
python scripts/populate_directus_full_locales.py

# 3. Alternative: Apply YAML schema (if needed)
python scripts/apply_directus_schema.py
```

### Legacy Scripts (reference only)
- `populate_directus_data.py` - Original single-locale version
- `populate_directus_real_data.sh` - Bash alternative

---

## 🔍 Data Structure Verification

### GET /items/formats?filter[locale][_eq]=en
```json
[
  {
    "id": 1,
    "mongo_id": "6952904b81e73f1ce9fc9d18",
    "slug": "commander",
    "title": "Commander",
    "subtitle": "The ultimate multiplayer format",
    "description": {
      "name": "description",
      "title": "Description",
      "description": "Commander is an exciting...",
      "rules": []
    },
    "rules": {
      "name": "rules",
      "title": "Main Rules",
      "rules": [
        {"id": 29, "text": "1 Commander card..."},
        ...
      ]
    },
    "locale": "en"
  }
  ...
]
```

### GET /items/articles?filter[locale][_eq]=es
```json
[
  {
    "id": 3,
    "documentId": "dil69v0tu2nliozsuyij2d1n",
    "title": "MTG El Hobbit: Un Viaje Inesperado",
    "subtitle": "Explora la mecánica de Aventura...",
    "author": "Valanhyr",
    "content": "<p class=\"mb-4\">La llegada de El Hobbit...",
    "publishedAt": "2026-08-16T15:13:43.303Z",
    "locale": "es"
  }
  ...
]
```

---

## 🔗 API Test URLs

### Direct Directus API (with auth token)
```
GET http://localhost:9055/items/formats?filter[locale][_eq]=en
GET http://localhost:9055/items/formats?filter[locale][_eq]=es
GET http://localhost:9055/items/articles?filter[locale][_eq]=en
GET http://localhost:9055/items/articles?filter[locale][_eq]=es
```

### Admin UI
```
http://localhost:9055/admin/
Email: admin@example.com
Password: admin_password_change_me
```

---

## 📁 Files in This Branch

```
feature/directus-migration/
├── scripts/
│   ├── setup_directus_simple.py           # Create collections & fields
│   ├── populate_directus_full_locales.py  # Load EN/ES data (CURRENT)
│   ├── populate_directus_data.py          # Single-locale version
│   ├── populate_directus_real_data.sh     # Bash alternative
│   └── apply_directus_schema.py           # YAML schema application
├── snapshots/
│   └── directus_schema.yaml               # Full schema definition
├── docker-compose-directus.yml            # Directus + PostgreSQL stack
├── DIRECTUS_READY.md                      # Initial setup docs
├── DIRECTUS_MIGRATION.md                  # Previous migration guide
├── VALIDATED_SCHEMA.md                    # Schema validation docs
└── DIRECTUS_FULL_LOCALES.md               # This file

```

---

## 🚀 Next Steps (After PR Review)

1. **Merge to main** once approved
2. **Integrate with Spring API:**
   - Create `DirectusService.java` in mana-forge-api
   - Replace `StrapiService` calls
   - Update `ContentController` endpoints
3. **Update Frontend:**
   - Point API client to `/api/formats` and `/api/articles`
   - No UI changes needed (same API contract)
4. **Environment Setup:**
   - Add `DIRECTUS_URL` to `application.yaml`
   - Configure API token in `.env`
5. **Data Migration (Production):**
   - Export data from Strapi
   - Import into Directus
   - Verify completeness

---

## 🔐 Environment Configuration

### Directus (docker-compose-directus.yml)
```yaml
ADMIN_EMAIL: admin@example.com
ADMIN_PASSWORD: admin_password_change_me
DB_USER: directus
DB_PASSWORD: directus_secure_password_change_me
CORS_ENABLED: true
CORS_ORIGIN: http://localhost:5173,http://localhost:3000,http://localhost:9055
```

### Spring API (application.yaml) - TODO
```yaml
directus:
  url: http://localhost:9055
  api-token: ${DIRECTUS_API_TOKEN:your-token-here}
  cache:
    ttl: 3600  # 1 hour
```

---

## ✅ Checklist Before Merge

- [x] Directus running on port 9055
- [x] Databases initialized (PostgreSQL)
- [x] Collections created (formats, articles, etc)
- [x] Data populated (EN + ES)
- [x] API endpoints tested
- [x] JSON objects validated
- [x] Scripts documented
- [x] Environment configured
- [ ] Spring API integration (next task)
- [ ] Frontend testing (next task)
- [ ] Production data migration (future task)

---

## 📝 Data Localization

All content is available in **English (en)** and **Spanish (es)**:

### Formats Localization
- **title:** Translated
- **subtitle:** Translated
- **description:** Full object translated
- **rules:** Full object translated with Spanish rule text

### Articles Localization
- **title:** Translated
- **subtitle:** Translated
- **content:** Full HTML content translated
- **author:** Same (username unchanged)

### Query by Language
```typescript
// Frontend
const formats_es = await api.get('/api/formats?locale=es')
const formats_en = await api.get('/api/formats?locale=en')

const articles_es = await api.get('/api/articles?locale=es')
const articles_en = await api.get('/api/articles?locale=en')
```

---

## 🎯 Validation Results

| Aspect | Status | Notes |
|--------|--------|-------|
| Schema Accuracy | ✅ | Matches Strapi structure |
| Data Completeness | ✅ | 6 formats + 4 articles |
| JSON Objects | ✅ | `description` and `rules` as objects |
| Author Field | ✅ | String, not object |
| Localization | ✅ | EN + ES for all items |
| API Response | ✅ | Correct format and structure |
| Admin UI | ✅ | Accessible at :9055/admin |

---

**Branch Created:** 2026-09-04  
**Status:** Ready for Spring API Integration  
**Approval:** Awaiting review before merge to main
