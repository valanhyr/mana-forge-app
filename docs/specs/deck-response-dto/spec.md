# Spec: respuesta de mazos sin datos internos (S2)

- Estado: `draft`. **No aprobada.** Sin código de producción hasta aprobación explícita del usuario.
- Origen: bug #2 de `C:\Users\valan\.opencode\plan\deck-domain-refactor-plan.md`. Cambia un contrato
  público, por eso va en spec aparte.

## Problema

Los endpoints de mazos devuelven la entidad Mongo `Deck` tal cual. Cualquiera puede leer un mazo
público sin sesión (`GET /api/**` es `permitAll`, `SecurityConfig` línea 111) y recibe campos internos
que el frontend no usa: `likedBy` (ids de todos los usuarios que dieron like) y `userId` del dueño.

## Comportamiento actual verificado

- `DeckController`: `saveDeck`, `updateDeck`, `getDeckById`, `getDecksByUser`, `cloneDeck`, `pinDeck`
  y `unpinDeck` devuelven `Deck` o `List<Deck>`.
- Privacidad: `getDeckById` oculta un mazo privado a quien no es su dueño
  (`DeckServiceImpl` línea 116) y `getDecksByUser` solo devuelve públicos a terceros (línea 227).
  Esto funciona y no cambia.
- `Deck` serializa: `id`, `name`, `formatId`, `userId`, `private`, `pinned`, `colors`, `cards`
  (`scryfallId`, `oracleId`, `quantity`, `board`, `gameChanger`, `chosenPrintId`, `chosenImageUrl`),
  `analysisScores`, `createdAt`, `updatedAt`, `likedBy`, `likesCount`.
- El frontend no lee `likedBy` ni `userId` de un mazo en ningún sitio (búsqueda en `mana-forge-web/src`).
  Sí lee `private`, `pinned`, `colors`, `cards`, `analysisScores`, `formatId`, `name` e `id`
  (`useDeckLoader`, `UserContext`, `DeckViewer` vía `cloneDeck`).
- `getDeckById` y `getDecksByUser` escriben en BD (`colors`) durante un GET. Fuera de alcance.

## Alcance

Una `DeckResponseDTO` (y su entrada de carta) devuelta por los siete endpoints de arriba, con el mismo
JSON que hoy menos `likedBy` y `userId` para terceros.

## No objetivos

Cambiar reglas de privacidad, la escritura de colores en GET, `DeckViewDTO` (`/view`, que ya es DTO),
el cálculo de `likesCount`, y el modelo Mongo.

## Criterios de aceptación

- AC-01: `GET /api/decks/{id}` de un mazo público no incluye `likedBy`.
- AC-02: Misma respuesta sin `userId` cuando quien consulta no es el dueño; el dueño lo recibe.
- AC-03: `GET /api/decks/user/{userId}` aplica AC-01 y AC-02 a cada elemento.
- AC-04: `saveDeck`, `updateDeck`, `cloneDeck`, `pinDeck` y `unpinDeck` devuelven la DTO; el campo
  `private` conserva su nombre JSON actual.
- AC-05: Un mazo privado sigue dando 404 a terceros y visible al dueño (sin regresión).
- AC-06: El resto de campos y sus nombres JSON son idénticos a los actuales; `DeckFlowIntegrationTest` y
  los tests del frontend (`DeckService`, `useDeckLoader`) pasan sin cambios.

## Decisiones pendientes

1. ¿`userId` solo para el dueño (AC-02) o se elimina siempre? El frontend no lo usa hoy.
2. ¿Una DTO con `userId` nullable, o dos DTO (propia y pública)? Recomendado: una, con
   `@JsonInclude(NON_NULL)`.
3. Mazos ya consultados o cacheados por terceros no se pueden retirar; no hay migración de datos.

## Aprobación

Pendiente.
