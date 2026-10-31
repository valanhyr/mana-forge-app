# Tareas y evidencia: respuesta de mazos sin datos internos (S2)

- Estado: `draft`. Referencias: [spec](spec.md), [plan](plan.md).

| Hecho | ID | Tarea | AC | Depende de |
|---|---|---|---|---|
| [x] | T-01 | Aprobación explícita de spec y plan y respuesta a las decisiones pendientes | todos | - |
| [x] | T-02 | Tests rojos de `DeckResponseDTO` y del controlador | AC-01..06 | T-01 |
| [x] | T-03 | Implementar `DeckResponseDTO` y mapeo en los siete endpoints | AC-01..04 | T-02 |
| [x] | T-04 | Suite backend y frontend sin regresiones | AC-05, AC-06 | T-03 |

## Evidencia (2026-10-31, Windows)

Aprobación: el usuario respondió "si" a la solicitud de aprobar spec y plan (decisiones 1 y 2 respondidas antes).

| Comprobación | Resultado |
|---|---|
| Rojo: ``.\mvnw.cmd test -Dtest="DeckResponseDTOTest,DeckControllerTest"`` con los tests escritos y sin ``DeckResponseDTO`` | ``COMPILATION ERROR ... cannot find symbol`` en ``DeckResponseDTOTest``. Rojo por compilación, no de comportamiento: los tests de controlador no llegaron a ejecutarse en rojo |
| Verde: mismo comando tras implementar | 31 tests, 0 fallos |
| ``.\mvnw.cmd test`` completo | 494 tests, 1 fallo preexistente: ``FeedbackControllerTest.submitFeedback_withoutAuth_returns401`` (falla también en ``main``) |

Notas: ``DeckResponseDTOTest`` usa un ``ObjectMapper`` plano; los tests de ``DeckControllerTest`` (``@WebMvcTest``) comprueban el JSON con el mapper real de la aplicación, que es la prueba relevante. ``DeckFlowIntegrationTest`` pasa sin cambios. Frontend: no se tocó; ``DeckDto`` ya declara ``userId`` opcional y no lee ``likedBy``; no se reejecutó ``vitest`` en esta rama. Sin migración, despliegue ni subida de versión. Queda abierto (fuera de S2): ``getDeckById`` y ``getDecksByUser`` siguen escribiendo ``colors`` en un GET.
