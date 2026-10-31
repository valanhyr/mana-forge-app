# Plan: refactor del dominio de mazos (S1 + F0)

- Estado: `in-progress`. Spec: [spec](spec.md).
- Aprobado solo: S1 y F0. Resto del plan de origen sin aprobar.

## Diseño

- S1: test unitario de deserialización Jackson de `DeckRequestDTO` (`ObjectMapper`), en
  `mana-forge-api/src/test/java/com/manaforge/api/dto/DeckRequestDTOTest.java`.
  Arreglo mínimo: aceptar el alias `isPrivate` sin romper `private`.
  Alternativa descartada: cambiar el front a `private`; rompería clientes que ya envían `isPrivate`
  y deja el contrato sin tolerancia.
- F0: ejecutar línea base y añadir tests con MSW/mocks en
  `mana-forge-web/src/__tests__/` para `DeckBuilder`. Sin tocar producción.

## Fases

1. Documentos SDD (este directorio).
2. S1: rojo, verde.
3. F0: línea base, luego tests de componente.

## Pruebas

`.\mvnw.cmd test -Dtest=DeckRequestDTOTest`, luego suite completa; `npx vitest run <ruta>`,
`npm run lint`, `npx tsc --noEmit`.

## Compatibilidad y despliegue

Sin migraciones, sin despliegue, sin subida de versión. Cambio retrocompatible.

---

# Plan F1 (DRAFT, pendiente de aprobación)

- Estado: `draft`. Spec: sección F1 de [spec](spec.md).

## Estrategia

Caracterizar primero, mover después. Cada paso deja `vitest`, `tsc` y `lint` en verde.

1. Tests de caracterización por función en `src/__tests__/unit/utils/deck/`.
2. `core/models/Deck.ts` con `DeckCard` ampliado; `DeckList.tsx` y `DeckStats.tsx` lo importan de ahí
   (quita la dependencia UI -> UI).
3. `groupByType`/`sortCards`/`TYPE_ORDER` únicos; builder y visor los importan.
4. `scryfallToDeckCard` sustituye los 4 mapeos (test rojo para `isGameChanger` en `handleAddCard`).
5. `validateDeck` + `countByBoard`; el componente traduce `errors` con `t`.
6. `toSavePayload`/`toAnalysisPayload`; el test de payload de F0 debe seguir verde.
7. `computeManaCurve` (test rojo para la exclusión de tierras en el visor).

## Archivos principales

`views/deck-builder/DeckBuilder.tsx`, `views/deck-viewer/DeckViewer.tsx`, `components/ui/DeckList.tsx`,
`components/ui/DeckStats.tsx`, componente `ManaCurve`, `core/models/`, `vite.config.ts` (cobertura:
quitar la exclusión de `core/models/**` solo si hay tests).

## Alternativas

- Hook en vez de utilidades: descartado; la lógica no necesita estado y así se prueba sin React.
- Unificar `DeckCardEntry` y `DeckCard` en un solo tipo: depende de la decisión pendiente 2.

## Riesgos

`DeckBuilder.tsx` ronda 1.890 líneas con pocos tests; `DeckBuilderBehavior.test.tsx` es la red de
seguridad. Sin migraciones ni despliegue; sin subida de versión.
