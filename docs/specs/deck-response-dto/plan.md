# Plan: respuesta de mazos sin datos internos (S2)

- Estado: `draft`. Spec: [spec](spec.md). Sin aprobar.

## Diseño

- Nueva `DeckResponseDTO` en `mana-forge-api/.../dto/` con `@JsonInclude(NON_NULL)` y un método
  estático `from(Deck, requesterId)` que omite `userId` si `requesterId` no es el dueño y nunca copia
  `likedBy`. El campo booleano se llama para serializar como `private` y `pinned`, igual que hoy
  (se verifica con test, ya que Lombok y Jackson recortan el prefijo `is`).
- `DeckController`: los siete endpoints mapean la entidad a la DTO con `getCurrentUserId()`.
- `DeckService` sigue devolviendo `Deck`; el mapeo vive en el controlador para no tocar la capa de datos.
- Frontend: `DeckDto` (ya existente en `DeckService.ts`) pasa a no declarar `userId` obligatorio.

## Fases

1. Tests en rojo: `DeckResponseDTOTest` (campos presentes y ausentes, nombre JSON de `private`/`pinned`)
   y un test de controlador (`likedBy` ausente en `GET /api/decks/{id}`).
2. Implementar DTO y mapeo en los siete endpoints.
3. Verde: `.\mvnw.cmd test -Dtest=DeckResponseDTOTest,DeckControllerTest`, luego suite completa
   (`FeedbackControllerTest` falla ya en `main`; no es de este cambio).
4. `npx vitest run` web sin cambios esperados.

## Compatibilidad y riesgo

Retrocompatible salvo por dos campos retirados que ningún cliente del repo lee. Sin migración, sin
despliegue automático ni subida de versión; cualquier despliegue se confirma aparte.
