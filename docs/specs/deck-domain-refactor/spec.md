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
