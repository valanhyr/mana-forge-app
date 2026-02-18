# Configuración de Couchbase Cache

## 🎯 Objetivo
Couchbase se usa como **caché distribuida** para acelerar respuestas de:
- **Strapi CMS**: Contenido estático (footer, heros, formats, articles)
- **Scryfall API**: Datos de cartas (search, symbology, named cards)
- **Premodern API**: Banlist

## 🚀 Despliegue

### 1. Levantar servicios con Docker Compose
```bash
docker-compose up -d
```

Esto levanta:
- `mana-forge-web-1` (Frontend - Puerto 80)
- `mana-forge-api-1` (Backend - Puerto 8080)
- `mana-forge-engine-1` (Python Engine - Puerto 8000)
- `mana-forge-cache-1` (Couchbase - Puerto 8091-8096)

### 2. Configurar Bucket en Couchbase (Primera vez)

**Opción A: Interfaz Web (http://localhost:8091)**
1. Acceder a http://localhost:8091
2. Login: `Administrator` / `123456` (o variable `COUCHBASE_PASSWORD`)
3. Ir a **Buckets** → **Add Bucket**
4. Nombre: `manaforge-cache`
5. Memory Quota: 256 MB (o más según necesidad)
6. Click **Add Bucket**

**Opción B: CLI (Automático)**
```bash
docker exec mana-forge-cache-1 couchbase-cli bucket-create \
  -c localhost:8091 \
  -u Administrator \
  -p 123456 \
  --bucket manaforge-cache \
  --bucket-type couchbase \
  --bucket-ramsize 256
```

### 3. Verificar que el API se conecta
```bash
docker logs mana-forge-api-1 | grep -i couchbase
```

Deberías ver:
```
✅ Couchbase connected: couchbase://couchbase:11210
```

## 📊 Estrategia de Caché

| Tipo          | Cache Names               | TTL      | Justificación                    |
|---------------|---------------------------|----------|----------------------------------|
| **Strapi**    | footer, heros, formats    | 6 horas  | Contenido casi estático          |
|               | articles-latest/detail    | 2 horas  | Se actualiza con más frecuencia  |
| **Scryfall**  | scryfall_*                | 24 horas | Datos de cartas raramente cambian|
| **Premodern** | premodern_banned          | 24 horas | Banlist raramente cambia         |

## 🔧 Variables de Entorno

Definir en `.env` o docker-compose:
```env
COUCHBASE_PASSWORD=123456
SPRING_COUCHBASE_CONNECTION_STRING=couchbase://couchbase:11210
SPRING_COUCHBASE_USERNAME=Administrator
SPRING_COUCHBASE_PASSWORD=123456
```

## 🧪 Testing Local

Para desarrollo local sin Docker:
1. Instalar Couchbase Server Community: https://www.couchbase.com/downloads
2. Crear bucket `manaforge-cache`
3. Actualizar `application.yaml`:
```yaml
spring:
  couchbase:
    connection-string: couchbase://localhost
```

## 📝 Notas

- **Persistencia**: El volumen `couchbase_data` preserva datos entre reinicios
- **Escalabilidad**: Couchbase soporta clustering para producción
- **Monitoreo**: UI web en puerto 8091 para ver estadísticas de caché
- **Fallback**: Si Couchbase falla, las APIs responden directo (sin caché)
