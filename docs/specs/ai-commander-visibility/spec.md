# Spec: la IA debe ver al comandante (bug #3)

- Estado: `in-progress`. Aprobada por el usuario el 2026-10-31 ("ok") con las decisiones propuestas.
- Origen: bug #3 de `C:\Users\valan\.opencode\plan\deck-domain-refactor-plan.md`.

## Problema

En formatos Commander el builder marca la carta comandante con `board: 'commander'`. Al construir el
payload de análisis y de puntuaciones, la web filtra `board === 'main' || !board` y el comandante
queda fuera de `main_deck`. La IA analiza un mazo de 99 cartas sin su carta central: estrategia,
identidad de color y puntuaciones se calculan sin ella.

## Comportamiento actual verificado

- `mana-forge-web/src/utils/deck/payloads.ts`, `toAnalysisPayload`: `main_deck` solo incluye cartas de
  `board` main (o sin `board`). `useDeckSave` reutiliza ese `main_deck` para `getDeckScores`.
  El test `payloads.test.ts` ("splits boards and drops commander from the main deck") fija este
  comportamiento actual.
- El engine acepta una lista plana: `DeckAnalysisRequest` y `DeckScoresRequest` tienen `main_deck`,
  sin campo de comandante (`schemas/deck_schemas.py`). No valida tamaño del mazo.
- `prompts/format_context.py` describe Commander como "100 cartas, incluido el comandante" y dice
  que "the commander is listed first in main_deck with quantity 1". La convención del engine es
  que el comandante viaja dentro de `main_deck`.
- El api solo reenvía el payload (`AiQuotaService.buildCacheKey` incluye `main_deck` en la clave de
  caché; `DeckServiceImpl` no interpreta el contenido).
- Visitantes anónimos en la home pegan una lista de texto sin zona de comandante: sin cambio.

## Alcance

Que `toAnalysisPayload` incluya las cartas con `board === 'commander'` en `main_deck`, primero y con su
cantidad, de modo que el payload coincida con la convención del engine. Sin cambios en el engine ni en
el api.

## No objetivos

Nuevo campo `commander` en el engine, cambios de prompts, recalcular puntuaciones ya guardadas
(bug #4), validar identidad de color, formatos que no son Commander (el builder no marca comandantes
ahí).

## Criterios de aceptación

- AC-01: En un mazo Commander, `main_deck` de `toAnalysisPayload` empieza por las cartas con
  `board === 'commander'`, seguidas de las de main, con sus cantidades.
- AC-02: `sideboard` y `maybeboard` no cambian.
- AC-03: El payload de `getDeckScores` (guardado) también incluye al comandante.
- AC-04: En formatos sin comandante el payload es idéntico al actual.
- AC-05: `payloads.test.ts` se actualiza al nuevo comportamiento; `DeckBuilderBehavior.test.tsx` y el
  resto de la suite web pasan.

## Riesgos y decisiones pendientes

1. La clave de caché de análisis del api cambia para mazos Commander, así que no reusarán cachés
   anteriores: coste de IA puntual, no un error.
2. Las puntuaciones ya guardadas en mazos Commander se calcularon sin comandante y siguen así hasta que
   se reanalicen (bug #4, aparte). ¿Se acepta?
3. ¿Se prefiere un campo `commander` explícito en el engine en vez de la convención "primero en
   `main_deck`"? Recomendado: no, la convención ya existe en los prompts.

## Aprobación

Aprobada el 2026-10-31. No cubre despliegue ni consumo de cuota de IA.
