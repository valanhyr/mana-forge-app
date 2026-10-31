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

