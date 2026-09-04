# 🚀 Directus Schema Migration - Generated Files

## 📦 What Was Generated

All files needed to migrate from Strapi to Directus have been generated based on your current API models.

### Files Created

| File | Size | Purpose |
|------|------|---------|
| `snapshots/directus_schema.yaml` | 27KB | Complete Directus schema with 7 collections |
| `mana-forge-api/src/main/java/com/manaforge/api/service/DirectusService.java` | 10KB | Java service (drop-in replacement for StrapiService) |
| `scripts/setup_directus_schema.py` | 4.6KB | Python script to apply schema to Directus |
| `DIRECTUS_MIGRATION.md` | 11KB | Detailed migration guide + API reference |
| `MIGRATION_SUMMARY.md` | 7.6KB | Quick start checklist |

---

## 🎯 Quick Start (5 steps)

### 1. Start Directus
```bash
docker-compose -f docker-compose-directus.yml up -d
sleep 30  # Wait for initialization
```

### 2. Apply Schema
```bash
python scripts/setup_directus_schema.py
```

### 3. Create API Token
- Visit `http://localhost:8055`
- Login: `admin@example.com` / `admin_password_change_me`
- Go to Settings → Access Tokens
- Create new token with `items.read`, `items.create`, `items.update`, `items.delete` permissions
- Copy the token

### 4. Configure Spring Boot
Edit `mana-forge-api/application.yaml`:
```yaml
directus:
  url: http://directus:8080
  admin-token: ${DIRECTUS_TOKEN}
```

Set environment variable:
```bash
export DIRECTUS_TOKEN=your_token_from_step_3
```

### 5. Deploy
```bash
./mvnw test       # Verify everything works
docker-compose up -d  # Deploy full stack
```

---

## 📋 Collections Mapping

Generated schema includes:

| Collection | Locale Aware | Singleton | Purpose |
|------------|--------------|-----------|---------|
| `footer` | ✅ | ✅ | Footer content (title, sections, links) |
| `footer_legal` | ✅ | ✅ | Legal/copyright text |
| `heros` | ✅ | ❌ | Hero images for different pages |
| `sections` | ✅ | ❌ | Reusable content sections |
| `languages` | ❌ | ❌ | Available languages (en, es, pt, fr) |
| `formats` | ✅ | ❌ | MTG formats (Premodern, Legacy, etc) |
| `articles` | ✅ | ❌ | Blog articles |

Each collection includes:
- Full field definitions from Java models
- Proper data types (string, text, json, timestamp, integer)
- Metadata (display templates, sort orders, notes)
- UI configuration (interfaces, dropdowns, validation)

---

## 🔍 What's Different From Strapi

### Query Changes

**Strapi:**
```
GET /api/footer?locale=es&populate[footer_sections][populate][0]=footer_links
Response: {data: {attributes: {...}}}
```

**Directus:**
```
GET /api/items/footer?filter[locale][_eq]=es
Response: {data: [{...}]}
```

### Java Service Interface

Both services have **identical public methods** (100% backwards compatible):
- `getFooter(locale)`
- `getHeros(locale, heroId)`
- `getSections(locale, sectionIds)`
- `getFormats(locale)`
- `getArticles(locale, limit)`

The implementation switches from Strapi REST to Directus REST transparently.

---

## 📖 Documentation

### Read These Files

1. **MIGRATION_SUMMARY.md** (7 min read)
   - Phases of migration
   - Checklist to follow
   - Rollback plan

2. **DIRECTUS_MIGRATION.md** (15 min read)
   - Field-by-field mapping
   - JSON example payloads
   - Security setup
   - Troubleshooting

3. **snapshots/directus_schema.yaml** (reference)
   - Exact schema definition
   - All collection fields
   - UI configuration for Directus admin

---

## ✅ Validation Steps

After setup, verify everything works:

```bash
# 1. Directus API
curl http://localhost:8055/api/items/footer \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Mana Forge API (should return same data structure as before)
curl http://localhost:8080/api/v1/content/footer/en

# 3. Cache working (2nd call should be faster)
curl http://localhost:8080/api/v1/content/footer/en  # Slow (cache miss)
curl http://localhost:8080/api/v1/content/footer/en  # Fast (cache hit)

# 4. Tests
cd mana-forge-api
./mvnw test
```

---

## 🚀 Next Steps

1. ✅ Review **MIGRATION_SUMMARY.md** for step-by-step guide
2. ✅ Follow the Quick Start (5 steps above)
3. ✅ Test API endpoints with curl
4. ✅ Verify Redis caching is working
5. ✅ Replace StrapiService with DirectusService in ContentController
6. ✅ Update docker-compose.yml to include Directus + PostgreSQL
7. ✅ Commit and deploy

---

## 🆘 Issues?

**Directus won't start:**
```bash
docker-compose -f docker-compose-directus.yml logs directus
```

**Schema won't apply:**
- Ensure Directus is healthy: `docker-compose -f docker-compose-directus.yml ps`
- Check logs: `docker-compose -f docker-compose-directus.yml logs directus`
- Retry: `python scripts/setup_directus_schema.py`

**DirectusService compilation error:**
- Check that Spring Boot dependencies are correct
- Ensure ObjectMapper is injected properly
- Verify @Value annotations for configuration

---

## 💡 Pro Tips

1. **Always test locally first** before deploying to production
2. **Keep a backup** of your Strapi instance until everything is validated
3. **Monitor Redis** cache hits to ensure performance
4. **Version your snapshots** in git for reproducible setups
5. **Use environment variables** for secrets (tokens, passwords)

---

## 📚 Resources

- **Directus Docs:** https://docs.directus.io
- **API Reference:** https://docs.directus.io/reference/introduction
- **Schema Snapshots:** https://docs.directus.io/guides/sdk/schema-snapshot
- **REST Query:** https://docs.directus.io/reference/query

---

**Generated:** September 4, 2026
**Status:** Ready to deploy ✅
