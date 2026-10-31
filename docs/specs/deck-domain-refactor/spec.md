# Spec: refactor del dominio de mazos

- Estado: `in-progress` (solo tramo S1 + F0).
- Origen: `C:\Users\valan\.opencode\plan\deck-domain-refactor-plan.md` (planning input, no spec aprobada por sí sola).
- Aprobación: el usuario pidió aplicar el plan; el plan indica "aprobado solo para el tramo S1 + F0".
  F1 en adelante, S2 y B1+ **no** están aprobados.

## Problema

`DeckBuilder.tsx` (~1.890 líneas) y `DeckServiceImpl.java` (~700 líneas) concentran lógica de dominio
sin cobertura de comportamiento. Antes de refactorizar hace falta una línea base y cerrar un bug
probable de privacidad.

## Alcance de este tramo

- S1: corregir que `isPrivate` enviado por el front no llega a `DeckRequestDTO`.
- F0: línea base de tests y tests de componente de `DeckBuilder` sin cambios de producción.

## No objetivos

F1, F2, F3, B1, B2/B3, S2 (DTO de respuesta), bugs #3-#6, subida de versiones.

## Comportamiento actual verificado (código)

- `DeckRequestDTO` declara `private boolean isPrivate;` con `@Data` de Lombok: setter `setPrivate`,
  propiedad JSON `private`.
- `DeckBuilder.tsx` envía `isPrivate` (línea ~684) y lee `private` ?? `isPrivate` al cargar.
- `DeckServiceImpl` usa `dto.isPrivate()` al crear y actualizar.
- Spring Boot ignora propiedades JSON desconocidas por defecto: `isPrivate` se descarta y el mazo
  queda público. **Pendiente de confirmar con test rojo.**

## Requisitos y criterios de aceptación

- AC-01: Dado un `POST /api/decks` con `"isPrivate": true`, cuando se deserializa el DTO, entonces
  `isPrivate()` es `true`.
- AC-02: Dado un cuerpo con `"private": true` (contrato actual y entidad), entonces sigue
  funcionando (`isPrivate()` es `true`).
- AC-03: Dado un cuerpo sin ninguna de las dos claves, `isPrivate()` es `false`.
- AC-04: Existe línea base registrada de `vitest`, `lint`, `tsc` y `mvnw test` antes de tocar nada.
- AC-05: Tests de componente de `DeckBuilder` cubren: importación, forma del payload de guardado
  y validación Commander. Sin cambios de código de producción en F0.

## Riesgos / decisiones pendientes

- Si el test de AC-01 no falla, no hay bug y S1 se cierra sin cambio de producción.
- Mazos ya guardados públicos por este bug no se migran (requiere autorización aparte).

---

# Fase F1: dominio puro de mazos (DRAFT, pendiente de aprobación)

- Estado F1: `draft`. **No aprobada.** No se escribe código de producción de F1 hasta aprobación explícita.

## Objetivo

Extraer a `mana-forge-web/src/utils/deck/` la lógica de dominio hoy embebida en `DeckBuilder.tsx`,
`DeckViewer.tsx` y `DeckList.tsx`, sin cambiar comportamiento visible salvo las desviaciones listadas.

## Comportamiento actual verificado

- `sortCards`, `groupByType` y `TYPE_ORDER` existen duplicados en `DeckBuilder.tsx` y `DeckViewer.tsx`
  (misma lógica; el builder usa `type`/`board`, el visor `typeLine`/`category` y corta por `—` antes de
  clasificar). `DeckList.tsx` tiene un `TYPE_ORDER` distinto: sin `Commander`, con `Unknown`, y agrupa
  por tablero.
- `isDeckValid` (bool) y `deckValidationErrors` (textos) en `DeckBuilder.tsx` calculan las mismas
  reglas por separado: nombre, formato, conteo por zona, Commander (100 = main + comandante, mínimo 1
  comandante, sin sideboard), legalidad (`isValid === false`), copias máx. excluyendo tipos `Basic`.
- `isValid` de cada carta se calcula al añadir/importar y no se recalcula al cambiar de formato (bug #5).
- El mapeo Scryfall -> `DeckCard` aparece 4 veces; `handleAddCard` no rellena `isGameChanger`.
- Los payloads de guardado y análisis se construyen inline en `handleSaveDeck`/`handleAnalyzeDeck`.
- `DeckCard` vive en `components/ui/DeckList.tsx` y carece de `oracleId`, `chosenPrintId`,
  `chosenImageUrl` (de ahí los casts `as unknown as`).

## Alcance F1

Funciones puras, sin React ni red, en `utils/deck/`:

- `scryfallToDeckCard(card, { format, board, quantity })`
- `validateDeck(input)` devuelve `{ isValid, errors: [{ code, params }] }`; el componente traduce
- `countByBoard(cards)`
- `toSavePayload(...)` y `toAnalysisPayload(...)`
- `groupByType()`, `sortCards()` y un único `TYPE_ORDER`
- `computeManaCurve()`

Y mover `DeckCard` a `core/models/Deck.ts` con `legalities`, `producedMana`, `colorIdentity`,
`oracleText`, `oracleId`, `chosenPrintId`, `chosenImageUrl`. `isValid` pasa a derivarse de `legalities`.

## No objetivos F1

Trocear componentes (F2), `CardService` a `axios` y borrar `src/api/` (F3), backend (B1+), bugs #2-#4 y
#6, subir versiones. `DeckList.tsx` solo cambia para importar helpers compartidos si no altera su salida.

## Criterios de aceptación F1

- AC-06: Cada función de `utils/deck/` tiene tests de caracterización escritos **antes** de mover el
  código, contra el comportamiento actual (misma entrada, misma salida).
- AC-07: `validateDeck` devuelve los mismos errores, en el mismo orden, que `deckValidationErrors`
  actual; `isValid` coincide con `isDeckValid` actual en Commander y formatos estándar.
- AC-08: Una sola definición de `TYPE_ORDER`, `sortCards` y `groupByType`; builder y visor las importan.
- AC-09: `scryfallToDeckCard` rellena `isGameChanger` en los 4 caminos (desviación aceptada 1).
- AC-10: `computeManaCurve` excluye tierras en builder y visor (desviación aceptada 2).
- AC-11: El payload de guardado es idéntico al actual (mismos campos y `cacheBust` de imagen).
  `DeckBuilderBehavior.test.tsx` sigue verde sin modificarse.
- AC-12: Sin `any` ni `as unknown as` en los archivos nuevos de `utils/deck/`.
- AC-13: Cobertura de `utils/deck/` >= 90%. `vitest`, `tsc --noEmit` y `lint` en verde.

## Decisiones pendientes (responder antes de aprobar)

1. `DeckList.tsx` usa otro `TYPE_ORDER` (con `Unknown`, sin `Commander`). ¿Se unifica y cambia su
   salida, o se deja fuera y solo se unifican builder y visor?
2. El visor usa `typeLine`/`category`; el builder `type`/`board`. ¿Adaptador en el visor (mantiene
   `DeckCardEntry`) o se normaliza el modelo?
3. Bug #5 (`isValid` no se recalcula al cambiar de formato): ¿se corrige en F1 como desviación
   aceptada 3, o se mantiene el comportamiento actual?
