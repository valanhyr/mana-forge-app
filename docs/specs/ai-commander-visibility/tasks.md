# Tareas y evidencia: la IA debe ver al comandante (bug #3)

- Estado: `draft`. Referencias: [spec](spec.md), [plan](plan.md).

| Hecho | ID | Tarea | AC | Depende de |
|---|---|---|---|---|
| [x] | T-01 | Aprobación explícita de spec y plan y respuesta a las decisiones pendientes | todos | - |
| [x] | T-02 | Tests rojos en `payloads.test.ts` | AC-01..04 | T-01 |
| [x] | T-03 | Incluir al comandante en `main_deck` de `toAnalysisPayload` | AC-01..04 | T-02 |
| [x] | T-04 | Suite web, tipos, lint y build | AC-05 | T-03 |
| [ ] | T-05 | Prueba manual con un mazo Commander (consume cuota de IA) | AC-03 | T-04 |

## Evidencia (2026-10-31, Windows)

Aprobación: el usuario respondió "ok" a la solicitud de aprobar spec y plan con las decisiones propuestas (caché puntual, puntuaciones antiguas sin reanalizar, sin campo nuevo en el engine).

| Comprobación | Resultado |
|---|---|
| Rojo: ``npx vitest run src/__tests__/unit/utils/deck/payloads.test.ts`` con el test actualizado | 2 de 7 fallan: ``expected [ { name: 'A' ... } ] to deeply equal [ { name: 'C', quantity: 1 } ...`` y partners; el caso sin comandante pasa |
| Verde: mismo comando tras el cambio en ``toAnalysisPayload`` | pasa |
| ``npx vitest run`` completo (web) | 75 archivos, 490 tests pasan |
| ``npx tsc -p tsconfig.app.json --noEmit``, ``npx eslint .``, ``npx vite build`` | limpios |
| Test nuevo ``useDeckSave.test.tsx`` | ``getDeckScores`` recibe el comandante primero (AC-03) |

Rama: apilada sobre ``integration/deck-refactor`` porque ``utils/deck/payloads.ts`` aún no está en ``main``. T-05 (prueba manual con un mazo Commander, consume cuota de IA) pendiente: requiere desplegar y confirmación aparte. Las puntuaciones guardadas antes del cambio no se recalculan (bug #4).
