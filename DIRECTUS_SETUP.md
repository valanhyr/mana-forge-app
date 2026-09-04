# 🚀 Directus Setup Guide

## Instalación Rápida

### 1. **Iniciar los servicios**
```bash
docker-compose -f docker-compose-directus.yml up -d
```

### 2. **Acceder a Directus**
- URL: `http://localhost:8055`
- Email: `admin@example.com`
- Password: `admin_password_change_me`

> ⚠️ **CAMBIAR CREDENCIALES** en el `docker-compose.yml` antes de producción

### 3. **Detener servicios**
```bash
docker-compose -f docker-compose-directus.yml down
```

---

## 📊 Base de Datos

- **Host:** `localhost:5432` (desde afuera)
- **Host interno:** `postgres:5432` (desde dentro de Docker)
- **Base:** `directus`
- **Usuario:** `directus`
- **Password:** `directus_secure_password_change_me`

Para conectar con DB tools (DBeaver, pgAdmin):
```
Host: localhost
Port: 5432
Database: directus
User: directus
Password: directus_secure_password_change_me
```

---

## 💾 Backups Automáticos

Los backups se crean **diariamente** en la carpeta `./backups/`:
- Archivo: `directus_YYYYMMDD_HHMMSS.sql`
- Retención: 7 días (se borran automáticamente después)

**Restaurar un backup:**
```bash
# Listar backups disponibles
ls -la backups/

# Restaurar (el contenedor debe estar parado)
docker-compose -f docker-compose-directus.yml stop postgres
psql -h localhost -U directus -d directus < backups/directus_20260904_120000.sql
docker-compose -f docker-compose-directus.yml start postgres
```

---

## 📁 Archivos & Media

- Todos los archivos subidos en Directus se guardan en `./directus_uploads/`
- Persisten entre reinicios
- Puedes hacer backup:
```bash
tar -czf backups/media_$(date +%Y%m%d).tar.gz directus_uploads/
```

---

## 🔐 Seguridad (Importante)

Antes de producción, cambiar en `docker-compose-directus.yml`:
1. ✅ `POSTGRES_PASSWORD`
2. ✅ `DB_PASSWORD`
3. ✅ `ADMIN_PASSWORD`
4. ✅ `ADMIN_EMAIL`
5. ✅ `REFRESH_TOKEN_TTL` (ajustar según necesidad)

---

## 📸 Exportar/Importar Schemas

### Exportar snapshot:
```bash
docker-compose -f docker-compose-directus.yml exec directus \
  npx directus schema snapshot ./snapshots/schema.yaml
```

### Importar snapshot:
```bash
docker-compose -f docker-compose-directus.yml exec directus \
  npx directus schema apply ./snapshots/schema.yaml
```

Los snapshots se guardan en `./snapshots/` (versionable en Git).

---

## 🔗 Conectar desde Mana Forge API

En `application.yaml`:
```yaml
directus:
  url: http://directus:8080  # Dentro de Docker
  # o
  url: http://localhost:8055  # Desde el host
  admin-token: tu-token-aqui
```

Para obtener el token:
1. Ir a `http://localhost:8055/admin/settings/api-tokens`
2. Crear API Token
3. Copiar en `application.yaml`

---

## 🐛 Troubleshooting

**Directus no arranca:**
```bash
docker-compose -f docker-compose-directus.yml logs directus
```

**PostgreSQL no responde:**
```bash
docker-compose -f docker-compose-directus.yml logs postgres
```

**Borrar todo y empezar:**
```bash
docker-compose -f docker-compose-directus.yml down -v
docker-compose -f docker-compose-directus.yml up -d
```

---

## 📚 Recursos

- Docs: https://docs.directus.io/
- API REST: `http://localhost:8055/api/`
- GraphQL: `http://localhost:8055/graphql`
