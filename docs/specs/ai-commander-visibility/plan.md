# Plan: la IA debe ver al comandante (bug #3)

- Estado: `in-progress`. Spec: [spec](spec.md). Aprobado el 2026-10-31.

## Diseño

Un solo cambio en `mana-forge-web/src/utils/deck/payloads.ts`: `toAnalysisPayload` calcula `main_deck`
como `commander` concatenado con `main` (comandante primero). `toEntries` ya reduce cada carta a
`{ name, quantity }`. `useDeckSave` y `useDeckAnalysis` no cambian porque consumen esa función.

Alternativa descartada: campo `commander` nuevo en el schema del engine; exige tocar prompts, schema,
api y web para algo que la convención actual ya cubre.

## Fases

1. Rojo: actualizar `payloads.test.ts` (comandante primero en `main_deck`; sin comandante, igual que hoy)
   y añadir un caso de `getDeckScores` en `DeckBuilderBehavior.test.tsx` si hay un camino sencillo.
   Confirmar que fallan por la razón esperada.
2. Verde: implementar el filtro.
3. `npx vitest run`, `npx tsc -p tsconfig.app.json --noEmit`, `npx eslint .`, `npx vite build`.
4. Validación manual en el servidor de pruebas con un mazo Commander (la análisis consume cuota de IA;
   avisar antes).

## Compatibilidad y despliegue

Cambio solo de frontend, retrocompatible con el engine y el api. Sin migración ni subida de versión.
Despliegue y consumo de cuota de IA se confirman aparte.
