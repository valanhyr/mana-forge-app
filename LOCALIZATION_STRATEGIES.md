# 🌐 Directus Localization Strategies - Comparison

## Current Approach vs Directus Native Solutions

### 1️⃣ ACTUAL (Lo que tenemos ahora)
**Campo `locale` en cada item**

```json
{
  "id": 1,
  "title": "Commander",
  "locale": "en"
},
{
  "id": 2,
  "title": "Commander",
  "locale": "es"
}
```

**Pros:**
- ✅ Simple y directo
- ✅ Compatible con Strapi
- ✅ Duplica items por idioma (claro qué existe)
- ✅ Fácil de queries: `filter[locale][_eq]=es`

**Contras:**
- ❌ Datos duplicados
- ❌ Más items en BD
- ❌ Riesgo: desincronización entre idiomas
- ❌ No hay restricción de idiomas soportados

**Queries:**
```
GET /items/formats?filter[locale][_eq]=es
GET /items/articles?filter[locale][_eq]=en
```

---

### 2️⃣ DIRECTUS TRANSLATABLE FIELDS (Native)
**Campos traducibles integrados en Directus**

```json
{
  "id": 1,
  "title": {
    "en": "Commander",
    "es": "Commander"
  },
  "subtitle": {
    "en": "The ultimate multiplayer format",
    "es": "El formato multijugador por excelencia"
  }
}
```

**Cómo se configura:**
1. Campo `title` con tipo `string` + marcar "Translatable"
2. Directus automáticamente crea un objeto con locales
3. Admin UI muestra tabs de idiomas

**Pros:**
- ✅ Un solo item por concepto
- ✅ Nativo de Directus (UI integrada)
- ✅ Soporte automático de locales configuradas
- ✅ Menos duplicación de datos
- ✅ Sincronización garantizada

**Contras:**
- ❌ Queries más complejas: `?fields=title.es,title.en`
- ❌ Respuesta más grande (todos los idiomas)
- ❌ Cambio en estructura JSON
- ❌ Requiere reconfigurar campos

**Queries:**
```
GET /items/formats
GET /items/articles
# Dentro: {title: {en: "...", es: "..."}}
```

---

### 3️⃣ TRANSLATION COLLECTION (Relacional)
**Tabla separada de traducciones con relación**

**Structure:**
```
formats (Main)
├── id
├── slug
├── mongo_id
└── translations (relación)

translations (Separada)
├── id
├── format_id (FK)
├── locale
├── title
├── subtitle
├── description
└── rules
```

**Ejemplo JSON:**
```json
{
  "id": 1,
  "slug": "commander",
  "mongo_id": "6952904b81e73f1ce9fc9d18",
  "translations": [
    {
      "id": 1,
      "locale": "en",
      "title": "Commander",
      "subtitle": "The ultimate multiplayer format",
      "description": {...}
    },
    {
      "id": 2,
      "locale": "es",
      "title": "Commander",
      "subtitle": "El formato multijugador por excelencia",
      "description": {...}
    }
  ]
}
```

**Pros:**
- ✅ Flexible (agregar idiomas sin migración)
- ✅ Separación clara de datos base vs traducciones
- ✅ Un item = múltiples traducciones
- ✅ Fácil agregar traducciones

**Contras:**
- ❌ Más complejo (requiere JOIN)
- ❌ Más queries
- ❌ Overhead BD

**Queries:**
```
GET /items/formats?deep[translations][_filter][locale]=es
# O con relaciones anidadas
```

---

### 4️⃣ LANGUAGE CODE COLLECTION (Best Practice)
**Usar colección de idiomas + Directus Localizable**

```
languages (Sistema)
├── code: "en"
├── name: "English"
├── flag: "🇺🇸"
└── enabled: true

formats
├── id
├── slug
├── translations (M2M a languages)
│   └── {language_code: "en", title: "...", description: {...}}
```

**Pros:**
- ✅ Escalable (fácil agregar idiomas)
- ✅ Validación: solo idiomas configurados
- ✅ Admin UI con flags/nombres
- ✅ Compatible con Directus Localizable

**Contras:**
- ❌ Más complejidad inicial
- ❌ Requiere setup más elaborado

---

## 🎯 Recomendación para Mana Forge

### Opción A: MANTENER ACTUAL (Mejor para ahora)
```python
# ✅ Recomendado porque:
# - Ya funciona
# - Compatible con Strapi actual
# - Frontend espera ?locale=es
# - Sin cambios en queries
# - Escalable a futuro
```

**Cambios mínimos:** NINGUNO

---

### Opción B: TRANSLATABLE FIELDS (Mejor a largo plazo)
```yaml
# ✅ Recomendado para producción porque:
# - Nativo de Directus
# - Admin UI más limpia
# - Spring API con @JsonAnySetter maneja dinámicamente
# - Menos datos duplicados
```

**Cambios necesarios:**

1. **Directus:** Reconfigurar campos como "Translatable"
   ```
   formats:
     - title: Translatable ✓
     - subtitle: Translatable ✓
     - description: Translatable ✓ (JSON)
     - rules: Translatable ✓ (JSON)
   ```

2. **Spring API:**
   ```java
   public List<FormatDTO> getFormats(String locale) {
       // Directus devuelve: {title: {en: "...", es: "..."}}
       // Extraemos solo el locale solicitado
       Map<String, Object> titleMap = (Map) format.get("title");
       String localizedTitle = (String) titleMap.get(locale);
   }
   ```

3. **Frontend:** Mismo código (no cambia)

---

## 🔍 Comparativa Rápida

| Aspecto | Actual | Translatable | Relación |
|---------|--------|--------------|----------|
| Complejidad | ⭐ Baja | ⭐⭐ Media | ⭐⭐⭐ Alta |
| Duplicación | ❌ Sí | ✅ No | ✅ No |
| Admin UX | ⭐⭐ OK | ⭐⭐⭐ Mejor | ⭐⭐ OK |
| Queries | ✅ Simple | ⚠️ Complejas | ⚠️ Complejas |
| Frontend | ✅ Fácil | ✅ Fácil | ⚠️ Medio |
| Escalabilidad | ⭐⭐ OK | ⭐⭐⭐ Mejor | ⭐⭐⭐ Mejor |
| Setup | ✅ Rápido | ⚠️ Medio | ⚠️ Lento |

---

## 🚀 Mi Recomendación

### FASE 1 (Ahora - feature/directus-migration)
**Mantener actual:** Campo `locale` por item

- Evita cambios grandes
- Compatible con Strapi
- Ya está testeado
- Commits más pequeños

### FASE 2 (Después - mejoras)
**Migrar a Translatable Fields** si necesitas:
- Reducir duplicación en BD
- Mejor admin UI
- Más idiomas

---

## Ejemplo: Si quisieras cambiar a Translatable

### Step 1: Directus Schema
```yaml
fields:
  - field: title
    type: string
    translatable: true  # Esto lo hace traducible
  - field: subtitle
    type: string
    translatable: true
  - field: description
    type: json
    translatable: true
```

### Step 2: API Response cambiaría
```json
// ANTES (actual):
{
  "id": 1,
  "title": "Commander",
  "locale": "es"
}

// DESPUÉS (translatable):
{
  "id": 1,
  "title": {
    "en": "Commander",
    "es": "Commander"
  }
}
```

### Step 3: Spring API
```java
@GetMapping("/formats")
public List<FormatDTO> getFormats(@RequestParam String locale) {
    // Directus devuelve todos los idiomas
    List<Map> raw = directusService.getFormats();
    
    return raw.stream()
        .map(item -> extractLocale(item, locale))
        .collect(toList());
}

private FormatDTO extractLocale(Map item, String locale) {
    return FormatDTO.builder()
        .title((String) ((Map)item.get("title")).get(locale))
        .subtitle((String) ((Map)item.get("subtitle")).get(locale))
        // ...
        .build();
}
```

---

## 📋 Decisión: ¿Qué Hago?

**Elige:**
- **A) Mantener ACTUAL** ← Recomendado para esta rama
  - Seguimos con `locale` field
  - Sin cambios en estructura
  - Test en main y luego refactor
  
- **B) Cambiar a TRANSLATABLE** ← Para próxima mejora
  - Refactor de schema
  - Actualizar Spring API
  - Mejor UX admin
  
- **C) Usar RELACIÓN** ← Para si crece mucho
  - Máxima flexibilidad
  - Más complejidad
  - Pensalo solo si agregan muchos idiomas

---

**¿Cuál prefieres para esta rama?**
