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

