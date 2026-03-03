# Mana Forge — Roadmap

> Plataforma de análisis de mazos de Magic: The Gathering especializada en el formato **Premodern**.

---

## ✅ Completado

### Infraestructura & Core
- [x] Monorepo con 3 servicios (React, Spring Boot, FastAPI)
- [x] Docker Compose con Redis, MongoDB Atlas
- [x] Autenticación con Google OAuth2
- [x] i18n (ES/EN) con `Accept-Language` header
- [x] Caché Redis por capas (Scryfall 24h, Strapi 6h, Artículos 2h)
- [x] Footer con disclaimer legal (WotC + Scryfall)

### Contenido & CMS
- [x] Integración con Strapi (artículos, formatos, footer, hero)
- [x] Páginas legales (Privacidad, Términos, Cookies) — mock listo para Strapi
- [x] Lista de artículos con locale desde `Accept-Language`
- [x] Endpoint `DELETE /api/articles/cache` para invalidar caché

### Mazos
- [x] Construcción de mazos (DeckBuilder)
- [x] Importación de mazos en texto plano
- [x] Análisis IA del mazo (Groq / Llama 3.3)
- [x] Sugerencia de sideboard por IA
- [x] Daily Deck of the Day (IA)
- [x] Mazo público destacado en dashboard (aleatorio de la BD)
- [x] DeckViewer: vista de mazo con agrupación por tipo, ordenación y curva de maná
- [x] Iconos de maná de Scryfall en DeckViewer y ManaCost
- [x] Curva de maná + resumen de cantidades por tipo

### UI & UX
- [x] Navbar con estado activo y Deck Builder condicional (solo autenticado)
- [x] Logo: yunque (`Anvil`) con fondo naranja
- [x] Recursos del footer: Scryfall, Moxfield, Magic Official

---

## 🚧 En progreso

- [ ] Conectar `LegalService.ts` a Strapi (actualmente usa mock JSON)
- [ ] Resolver `cmc` nulo en cartas cacheadas antes de añadir el campo

---

## 🔜 Próximas funcionalidades

### Vista pública de mazos (`/explore`)
- [ ] Listado de mazos públicos con filtros (formato, color, nombre)
- [ ] Paginación / scroll infinito
- [ ] Enlace desde navbar (visible para todos)
- [ ] Miniatura de carta destacada por mazo

### DeckBuilder — mejoras
- [ ] Selección de arte por carta: elegir entre todas las reimpresiones disponibles (vía Scryfall) para personalizar el arte de cada carta del mazo

### DeckViewer — mejoras
- [ ] Vista de mazo en modo "spoiler" (imágenes de cartas en grid)
- [ ] Compartir mazo (URL pública)
- [ ] Botón de copia a portapapeles (formato texto plano)
- [ ] Indicador de legalidad de cada carta en Premodern

### Perfil de usuario
- [ ] Página de perfil pública (mazos públicos del usuario)
- [ ] Avatar / foto de perfil
- [ ] Estadísticas básicas (n.º de mazos, formatos, colores favoritos)

### Mazos — mejoras
- [ ] Etiquetas (tags) en mazos
- [ ] Filtrar mis mazos por formato, color, tag
- [ ] Marcar mazo como favorito
- [ ] Duplicar mazo

---

## 📅 Medio plazo

### Comunidad
- [ ] Sistema de likes en mazos públicos
- [ ] Comentarios en mazos
- [ ] Seguir a otros jugadores
- [ ] Feed de actividad reciente

### Torneos & Meta
- [ ] Sección de meta Premodern (arquetipos populares)
- [ ] Registro de resultados de torneos
- [ ] Estadísticas del meta por formato

### Mejoras técnicas
- [ ] Tests unitarios e integración (frontend + backend)
- [ ] CI/CD con GitHub Actions (lint, test, build, deploy)
- [ ] Rate limiting en endpoints públicos
- [ ] Migrar secrets a variables de entorno / vault
- [ ] Búsqueda full-text de mazos con MongoDB Atlas Search

---

## 🔭 Largo plazo

- [ ] Soporte para más formatos (Legacy, Vintage, Old School 93/94)
- [ ] App móvil (React Native o PWA)
- [ ] Integración con MTGO / Moxfield (importar mazos)
- [ ] Sistema de notificaciones (cambios de banlist, nuevos artículos)
- [ ] Multijugador: simulador de partida o draft
- [ ] GraphQL como capa API alternativa

---

## 🐛 Deuda técnica conocida

| Área | Descripción | Prioridad |
|------|-------------|-----------|
| Backend | Credenciales hardcodeadas en `application.yaml` | Alta |
| Frontend | `src/api/apiClient.js` (legacy sin interceptores) — migrar o eliminar | Media |
| Backend | `CardRepository` sin índice en `scryfallId` — puede ser lento con volumen | Media |
| Backend | `Format.name` como `Map<String,String>` rompe si hay datos legacy sin migrar | Baja |
| Frontend | Caché en memoria de `ArticleService` no se invalida tras evicción del backend | Baja |

---

*Última actualización: marzo 2026*
