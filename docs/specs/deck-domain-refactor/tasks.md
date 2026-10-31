# Tareas y evidencia: refactor del dominio de mazos (S1 + F0)

- Estado: `in-progress`. Referencias: [spec](spec.md), [plan](plan.md).

## Tareas

| Hecho | ID | Tarea | AC | Depende de |
|---|---|---|---|---|
| [x] | T-01 | Redactar spec, plan y tasks | todos | - |
| [x] | T-02 | S1 rojo: test de deserialización de `isPrivate` | AC-01..03 | T-01 |
| [x] | T-03 | S1 verde: arreglo mínimo en `DeckRequestDTO` | AC-01..03 | T-02 |
| [x] | T-04 | F0 línea base de tests | AC-04 | T-01 |
| [x] | T-05 | F0 tests de componente `DeckBuilder` | AC-05 | T-04 |

## Evidencia (2026-10-31, Windows)

| Comprobación | Resultado |
|---|---|
| S1 rojo: `.\mvnw.cmd test -Dtest=DeckRequestDTOTest` | 3 tests, 1 fallo: `Expecting value to be true but was false` en `isPrivateKeyFromFrontendIsDeserialized`. Bug confirmado: `isPrivate` del front se descartaba |
| S1 verde: mismo comando tras `@JsonSetter("isPrivate")` en `DeckRequestDTO` | 3 tests, 0 fallos |
| Línea base web: `npx vitest run` (antes de F0) | 64 archivos, 416 tests, todos pasan |
| `npx tsc --noEmit` / `npm run lint` (web) | sin salida de error |
| Línea base api: `.\mvnw.cmd test` | 488 tests, 1 fallo **preexistente**: `FeedbackControllerTest.submitFeedback_withoutAuth_returns401` (fallaba también sin el cambio de S1). No es de este tramo |
| F0: `npx vitest run src/__tests__/views/DeckBuilderBehavior.test.tsx` | 3 tests pasan (importación con líneas fallidas, forma del payload de guardado, validación Commander) |

Nota: AGENTS.md dice 374 tests verdes en api; la ejecución real da 488 con 1 fallo.
Los tests de F0 son de caracterización, no red/green. El test de S1 usa `ObjectMapper` plano de Jackson
con las anotaciones del DTO; no se ejecutó un POST real contra Spring.

## Bloqueos y notas

- `FeedbackControllerTest` falla sin relación con este tramo; sin investigar.
- Mazos ya guardados como públicos por el bug no se migran (requiere autorización aparte).
- No se hizo F1 ni más allá.

---

# Tareas F1 (aprobada por el usuario el 2026-10-31)

Decisiones: (1) `DeckList` queda fuera de la unificación de `TYPE_ORDER` (aconsejado); (2) adaptador
en el visor (`readTypeInfo`), `DeckCardEntry` se mantiene; (3) bug #5 corregido como desviación 3
(`revalidateCards` al cambiar de formato).

| Hecho | ID | Tarea | AC | Depende de |
|---|---|---|---|---|
| [x] | T-06 | Aprobación explícita de spec y plan F1 + decisiones | todos | - |
| [x] | T-07 | Tests de caracterización de sort/group/validación/payload | AC-06, AC-07, AC-11 | T-06 |
| [x] | T-08 | `DeckCard` a `core/models/Deck.ts` (`DeckList` lo reexporta) | AC-12 | T-07 |
| [x] | T-09 | Unificar `TYPE_ORDER`/`sortCards`/`groupByType` (builder y visor) | AC-08 | T-07 |
| [x] | T-10 | `scryfallToDeckCard` en los 4 caminos (`isGameChanger` ya en todos) | AC-09 | T-08 |
| [x] | T-11 | `validateDeck` + `countByBoard` | AC-07 | T-08 |
| [x] | T-12 | `toSavePayload` + `toAnalysisPayload` | AC-11 | T-08 |
| [x] | T-13 | `computeManaCurve` (excluye tierras; usado por `ManaCurve` y `DeckStats`) | AC-10 | T-09 |
| [x] | T-14 | Cobertura y validación final | AC-12, AC-13 | T-13 |

## Evidencia F1 (2026-10-31, Windows)

| Comprobación | Resultado |
|---|---|
| Rojo: `npx vitest run src/__tests__/unit/utils/deck` antes de implementar | 5 archivos fallan con `Failed to resolve import ".../utils/deck/<módulo>"` |
| Un test de caracterización fallaba por mi suposición (copias en maybeboard) | Corregido el test para reflejar el código original: las copias cuentan todos los tableros |
| Verde: mismo comando tras implementar | 68 tests pasan |
| Cobertura `src/utils/deck/**` | 100% líneas, 95% ramas |
| `npx vitest run` completo (web) | 70 archivos, 466 tests, todos pasan, incluido `DeckBuilderBehavior.test.tsx` sin modificar |
| `npx tsc --noEmit`, `npx eslint` sobre archivos tocados | sin salida de error |

Notas: los tests de `utils/deck` se escribieron antes que el código pero no se ejecutaron contra
el código original embebido; son de caracterización por lectura. La desviación 3 (bug #5) tiene test
unitario (`revalidateCards`), pero no test de componente. Las desviaciones 1 y 2 están cubiertas por
tests unitarios (`isGameChanger`, tierras fuera de la curva). `oracleId` no se rellena al añadir
cartas (sin cambio de payload). Pendiente fuera de F1: F2 (trocear `DeckBuilder`, aún 1.537 líneas).

---

# Tareas F2 (aprobada por el usuario el 2026-10-31: "ok")

Alcance acordado en el plan de origen: trocear `DeckBuilder.tsx` en hooks y componentes de
composición, sin cambios de comportamiento ni de textos. Los tests de F0 y `utils/deck` son la red.

| Hecho | ID | Tarea | AC |
|---|---|---|---|
| [x] | T-15 | Operaciones puras de la lista de cartas (`addCards`, `updateQuantity`, `moveCard`, `removeCard`, `setChosenImage`) con tests de caracterización | AC-14 |
| [x] | T-16 | Hooks: `useDeckCards`, `useDeckLoader`, `useDeckImport`, `useDeckAnalysis`, `useDeckSave` | AC-14 |
| [x] | T-17 | Componentes: `ConfigPanel`, `ViewToolbar`, `CardGrid` (spoiler main/side), `MaybeboardList`, `AnalysisModal`, `ImportModal`, `FloatingTotalsBar` | AC-15 |
| [x] | T-18 | `DeckBuilder.tsx` < ~300 líneas, solo composición; tests, `tsc` y lint en verde | AC-16 |

Criterios F2: AC-14 las operaciones de lista conservan su salida actual; AC-15 el bloque spoiler
main/side y la barra flotante se desduplican sin cambiar el DOM observable; AC-16 `DeckBuilder.tsx`
queda < ~300 líneas y la suite completa sigue en verde.

## Evidencia F2 (2026-10-31, Windows)

| Comprobación | Resultado |
|---|---|
| `npx vitest run` completo (web) | 74 archivos, 486 tests, todos pasan; `DeckBuilderBehavior.test.tsx` ampliado con test de bug #5 (revalidación al cambiar de formato) |
| `npx tsc -p tsconfig.app.json --noEmit` | sin errores |
| `npx eslint .` | sin salida de error |
| `npx vite build` | OK |
| `DeckBuilder.tsx` | 1.537 -> 298 líneas, solo composición |

**Corrección de la evidencia F1:** `npx tsc --noEmit` no comprueba nada en este repo (`tsconfig.json` tiene `files: []` y solo referencias). La verificación real es `npx tsc -p tsconfig.app.json --noEmit` (o `tsc -b`, que usa `npm run build`). La afirmación F1 de "sin errores" con `tsc --noEmit` no era válida; con el comando correcto, F1 solo dejaba errores de tipo en `DeckViewer.tsx`, que F2 corrigió.

Notas F2: los tests de `cardOps` y `deckView` se escribieron junto al código y se ejecutaron en verde; no se observó rojo previo por separado. `useDeckLoader` ahora entrega nombre, formato, cartas y puntuaciones de una vez tras hidratar las cartas (antes el nombre y formato se fijaban al llegar el mazo); el overlay de carga cubre el intervalo. Se eliminó la rama muerta del maybeboard (sin cambio observable). `AnalysisModal` usa `?.map` sobre `strengths`, `weaknesses` y `matchups` (opcionales en `DeckAnalysisResult`). El resto de la UI se conserva.

---

# Tareas F3 (aprobada por el usuario el 2026-10-31: "ok", rama `refactor/deck-dtos` apilada sobre `refactor/deck-domain`)

| Hecho | ID | Tarea |
|---|---|---|
| [x] | T-19 | `DeckDto` y `DeckCardEntryDto` en `DeckService.ts`; `saveDeck`, `updateDeck`, `getDeckById`, `cloneDeck`, `pinDeck` y `unpinDeck` dejan de devolver `any`; `useDeckLoader` sin casts |
| [x] | T-20 | Borrar `src/api/` (sin importadores) y su línea en `vite.config.ts` |
| [x] | T-21 | `CardService` de `fetch` a la instancia `axios` `api` |

## Evidencia F3 (2026-10-31, Windows)

| Comprobación | Resultado |
|---|---|
| `npx vitest run` completo (web) | 74 archivos, 486 tests pasan antes del test nuevo; `CardService.test.ts` con el test nuevo: 18 pasan |
| `npx tsc -p tsconfig.app.json --noEmit`, `npx eslint .`, `npx vite build` | limpios |

Notas: los tests de `CardService` usan MSW, así que cubren `axios` sin cambios; se añadió un test para que un error HTTP en la consulta exacta de `getCardByName` caiga a la búsqueda general (un fallo de red sigue lanzando). Las peticiones de `CardService` ahora envían `Accept-Language` y `withCredentials` (interceptor de `api`); CORS de `SecurityConfig` los permite. `DeckDto` refleja el contrato actual, incluido `private` y `pinned`, sin cambiarlo (bug #2 sigue abierto). `useDeckLoader` ya no lee la clave `isPrivate`, solo `private`. `UserContext` y `AuthService.getUserDecks` siguen con `any`: fuera de este tramo.
