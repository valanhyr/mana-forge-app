# Pasos para debugear Couchbase

## 1. Rebuildeamos el API
```bash
docker-compose build api
docker-compose up -d api
```

## 2. Ver logs en tiempo real
```bash
docker logs -f mana-forge-api-1
```

Buscar líneas como:
- `🔄 Attempting to connect to Couchbase at: ...`
- `✅ Successfully connected to Couchbase bucket: ...`
- `❌ Failed to connect to Couchbase: ...`
- `⚠️ Using in-memory cache instead of Couchbase`

## 3. Si no conecta, verificar Couchbase
```bash
# Ver estado del contenedor
docker ps | findstr couchbase

# Ver logs de Couchbase
docker logs mana-forge-cache-1

# Verificar que el bucket existe
docker exec mana-forge-cache-1 couchbase-cli bucket-list -c localhost:8091 -u Administrator -p 123456
```

## 4. Crear bucket si no existe
```bash
docker exec mana-forge-cache-1 couchbase-cli bucket-create \
  -c localhost:8091 \
  -u Administrator \
  -p 123456 \
  --bucket manaforge-cache \
  --bucket-type couchbase \
  --bucket-ramsize 256
```

## 5. Testear el cache
Una vez el API esté corriendo, hacer requests a endpoints cacheados:
```bash
# Primera llamada (debería ir a Strapi y guardar en cache)
curl http://localhost:8080/api/content/footer?locale=en

# Segunda llamada (debería venir del cache - más rápida)
curl http://localhost:8080/api/content/footer?locale=en
```

## 6. Ver items en Couchbase
- Interfaz web: http://localhost:8091
- Login: Administrator / 123456
- Ir a: Buckets > manaforge-cache > Documents

Deberías ver documentos con nombres como:
- `footer::en`
- `formats::es`
- `scryfall_search::<hash>`

## Problema común: Couchbase no inicializado
Si el bucket no existe y el API no puede crearlo, el API usará cache en memoria automáticamente (fallback).

Para inicializar Couchbase manualmente la primera vez:
1. Acceder a http://localhost:8091
2. Login: Administrator / 123456
3. Setup > Create New Cluster (si es primera vez)
4. Buckets > Add Bucket > "manaforge-cache" (256MB RAM)
