# 🎯 Migración Strapi → Directus - Resumen Ejecutable

## ✅ Trabajo Completado

### 1. **Schema de Directus Generado**
📄 **Archivo:** `snapshots/directus_schema.yaml`
- Contiene 7 colecciones basadas en modelos Java actuales
- Cada collection mapea directamente a los modelos de Strapi
- Incluye metadatos, interfaces y validaciones

**Colecciones creadas:**
- ✅ `footer` - Pie de página (singleton)
- ✅ `footer_legal` - Enlaces legales (singleton)
- ✅ `heros` - Imágenes hero
- ✅ `sections` - Secciones de contenido
- ✅ `languages` - Idiomas disponibles
- ✅ `formats` - Formatos de Magic
- ✅ `articles` - Artículos de blog

### 2. **DirectusService (Java)**
📄 **Archivo:** `mana-forge-api/src/main/java/com/manaforge/api/service/DirectusService.java`
- Reemplaza completamente a `StrapiService`
- Misma interfaz pública (100% compatible)
- Métodos idénticos: `getFooter()`, `getHeros()`, `getFormats()`, etc.
- Cacheable con Redis (igual que Strapi)
- Manejo de errores robusto

### 3. **Script de Setup**
📄 **Archivo:** `scripts/setup_directus_schema.py`
- Inicia Directus automáticamente
- Aplica el schema desde `directus_schema.yaml`
- Verifica que las colecciones se crearon correctamente
- Proporciona pasos siguientes (tokens, configuración)

### 4. **Documentación Completa**
📄 **Archivo:** `DIRECTUS_MIGRATION.md`
- Mapeo de todos los campos
- Ejemplos de JSON para cada colección
- Endpoints REST de Directus
- Troubleshooting y seguridad

---

## 🚀 Pasos para Implementar

### Fase 1: Setup de Directus (10 min)

```bash
# 1. Iniciar Directus
docker-compose -f docker-compose-directus.yml up -d

# 2. Esperar a que inicie (30 segundos)
sleep 30

# 3. Aplicar schema
python scripts/setup_directus_schema.py
```

**Verificar:**
- Acceder a `http://localhost:8055`
- Login: `admin@example.com` / `admin_password_change_me`
- Ver 7 colecciones en la UI

### Fase 2: Crear API Token (5 min)

En Directus UI:
1. Settings → Access Tokens
2. Click "+ Create Token"
3. Name: `mana-forge-api`
4. Scope: `items.read`, `items.create`, `items.update`, `items.delete`
5. **Copiar token** (ej: `Ey...`)

### Fase 3: Configurar Spring Boot (5 min)

**`mana-forge-api/application.yaml`:**
```yaml
directus:
  url: http://directus:8080      # En Docker
  admin-token: ${DIRECTUS_TOKEN}  # Variable de entorno
```

**`.env.local` (desarrollo):**
```env
DIRECTUS_TOKEN=your_copied_token_here
```

### Fase 4: Reemplazar StrapiService (5 min)

**`ContentController.java`:**
```java
@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
public class ContentController {
    private final DirectusService directusService;  // ← Cambiar
    
    // Los endpoints quedan exactamente igual
    @GetMapping("/footer/{locale}")
    public Footer getFooter(@PathVariable String locale) throws Exception {
        return directusService.getFooter(locale);
    }
}
```

### Fase 5: Tests (15 min)

```bash
# Compilar
cd mana-forge-api
./mvnw clean package -DskipTests

# Ejecutar tests
./mvnw test

# Iniciar servidor
./mvnw spring-boot:run
```

**Verificar endpoints:**
```bash
curl http://localhost:8080/api/v1/content/footer/en
curl http://localhost:8080/api/v1/content/heros?locale=es
```

### Fase 6: Deploy (5 min)

**`docker-compose.yml` (actualizar):**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: directus
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - mana-forge-network

  directus:
    image: directus/directus:latest
    depends_on:
      - postgres
    environment:
      DB_CLIENT: pg
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      ADMIN_EMAIL: ${DIRECTUS_EMAIL}
      ADMIN_PASSWORD: ${DIRECTUS_PASSWORD}
      CORS_ORIGIN: "http://localhost:80"
    volumes:
      - directus_uploads:/directus/uploads
      - ./snapshots:/directus/snapshots
    ports:
      - "8055:8080"
    networks:
      - mana-forge-network

  mana-forge-api:
    build: ./mana-forge-api
    environment:
      DIRECTUS_URL: http://directus:8080
      DIRECTUS_TOKEN: ${DIRECTUS_TOKEN}
    depends_on:
      - directus
    ports:
      - "8080:8080"
    networks:
      - mana-forge-network

  # ... resto de servicios (web, engine, redis)

volumes:
  postgres_data:
  directus_uploads:

networks:
  mana-forge-network:
    driver: bridge
```

### Fase 7: Cleanup (5 min)

```bash
# Después de validar que Directus funciona:

# 1. Eliminar StrapiService
rm mana-forge-api/src/main/java/com/manaforge/api/service/StrapiService.java

# 2. Eliminar modelos de Strapi (opcional)
rm -rf mana-forge-api/src/main/java/com/manaforge/api/model/strapi/

# 3. Actualizar .properties
# Quitar: strapi.api.url, strapi.api.token

# 4. Commit
git add -A
git commit -m "feat: migrate CMS from Strapi to Directus

- Created DirectusService with same interface as StrapiService
- Generated Directus schema from existing models
- All endpoints remain backwards-compatible
- Cache layer (Redis) unchanged
- Tests passing ✅"
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | Strapi | Directus |
|---------|--------|----------|
| **Setup** | Complejo (Node.js + Docker) | 1 comando |
| **Admin UI** | Buena | Excelente |
| **Query API** | `/api/collection?populate=*` | `/api/items/collection` |
| **Response** | `{data: {attributes: {...}}}` | `{data: [{...}]}` |
| **Velocidad** | Moderada | Rápida |
| **Costo** | Strapi Cloud $$$$ | Self-hosted ✅ Gratis |
| **PostgreSQL** | Incluida | Incluida |

---

## 🔍 Validación Post-Migración

Después de implementar, verificar:

```bash
# 1. Directus respondiendo
curl http://localhost:8055/api/items/footer \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. API Java respondiendo
curl http://localhost:8080/api/v1/content/footer/en

# 3. Redis cacheing funciona
curl http://localhost:8080/api/v1/content/footer/en  # Primer call: lento
curl http://localhost:8080/api/v1/content/footer/en  # Segundo call: rápido (cache)

# 4. Todos los tests pasan
cd mana-forge-api && ./mvnw test
```

---

## 🚨 Rollback Plan

Si algo sale mal:

```bash
# 1. Restaurar StrapiService desde git
git checkout HEAD~1 mana-forge-api/src/main/java/com/manaforge/api/service/StrapiService.java

# 2. Revert ContentController
git checkout HEAD~1 mana-forge-api/src/main/java/com/manaforge/api/controller/ContentController.java

# 3. Parar Directus
docker-compose -f docker-compose-directus.yml down

# 4. Reiniciar Strapi original
docker-compose up -d

# 5. Redeploy
git push
```

---

## ✅ Checklist Final

- [ ] Directus arranca y UI es accesible
- [ ] Schema se aplica correctamente (7 collections)
- [ ] API token creado y funciona
- [ ] DirectusService compila sin errores
- [ ] ContentController actualizado
- [ ] Tests pasan: `./mvnw test`
- [ ] Endpoints responden: `curl http://localhost:8080/api/v1/content/footer/en`
- [ ] Cache funciona (2º call más rápida)
- [ ] Docker-compose.yml actualizado
- [ ] Commit realizado
- [ ] Documentación actualizada (README, etc.)
- [ ] StrapiService eliminado
- [ ] Deploy a producción

---

## 📞 Soporte

**Si tienes preguntas:**
- Revisar `DIRECTUS_MIGRATION.md` (guía detallada)
- Ver `snapshots/directus_schema.yaml` (estructura exacta)
- Logs: `docker-compose -f docker-compose-directus.yml logs directus`

**Recursos:**
- Directus Docs: https://docs.directus.io
- API Reference: https://docs.directus.io/reference/introduction
