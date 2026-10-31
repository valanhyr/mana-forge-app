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
