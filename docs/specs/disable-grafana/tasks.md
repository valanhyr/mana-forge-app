# Tareas: desactivar Grafana

**Estado: implementado; validación con bloqueos previos.** Referencias: `spec.md` y `plan.md`. El despliegue y el tratamiento de datos históricos requieren autorización independiente.

| Tarea | Criterios | Estado y evidencia |
|---|---|---|
| T-01: confirmar alcance de web, API y motor | AC-01 a AC-06 | Aprobado: el usuario respondió «ok» tras presentarse los tres servicios y la pérdida de OTLP genérico del motor. |
| T-02: probar y desactivar Faro en la web | AC-01, AC-04 | Rojo: `observability.test.ts` detectó la inicialización con URL. Verde: 2 pruebas; el build con una URL Faro ficticia no la incorporó en sus archivos. |
| T-03: probar y desactivar exportación de la API | AC-02, AC-04 | Rojo: `TelemetryDisabledTest` detectó `management.tracing.enabled=true` al proporcionar la antigua variable. Verde focalizado: 3 pruebas de configuración, ausencia de clases/exportadores y contexto real de Spring con variables antiguas activas. La ruta de salud respondió 503 en el test porque el SMTP local no estaba disponible; se verificó que la ruta seguía accesible, no que todos sus componentes estuvieran sanos. `mvnw dependency:tree` no mostró dependencias OpenTelemetry, bridge de trazas ni registro OTLP. |
| T-04: probar y desactivar exportación del motor | AC-03, AC-04 | Rojo: 2 pruebas detectaron la inicialización de OpenTelemetry con destino Grafana o genérico. Verde: 3 pruebas con el endpoint de salud; suite completa del motor: 84 pruebas correctas. |
| T-05: actualizar documentación y textos de privacidad | AC-05 | Rojo: 2 pruebas de política no describían la desactivación ni la posible retención histórica. Verde: ambas políticas dentro del grupo focalizado de 11 pruebas. README y documentación de analítica actualizados; los textos requieren revisión legal. |
| T-06: validar regresiones y registrar limitaciones | AC-01 a AC-06 | Web: 11 pruebas focalizadas, lint, `tsc --noEmit` y build correctos; avisos de Browserslist y tamaño de bundle. Motor: 84 pruebas correctas. `docker compose config --quiet`: correcto. API: 495 pruebas, 2 fallidas; ambas se reprodujeron contra el código original con la misma configuración local. No se han probado servicios desplegados ni exportadores externos. |
| T-07: valorar despliegue y tratamiento de datos históricos | Fuera de la aprobación de implementación | Requiere autorización independiente; no ejecutado. |

## Evidencia del borrador

Se revisaron `observability.ts`, `application.yaml`, `main.py`, `docker-compose.yml` y los Jenkinsfiles. En el código anterior los predeterminados estaban desactivados, pero se podían habilitar mediante configuración. En esta versión se desactivó el arranque integrado y se retiraron los exportadores del motor y la API. No se ha inspeccionado ni modificado el entorno desplegado.

## Bloqueos de la suite completa de API

- `FeedbackControllerTest.submitFeedback_withoutAuth_returns401`: espera 401, pero la configuración actual permite `POST /api/feedback` sin autenticación y devuelve 200. Se reprodujo en una copia limpia del `HEAD` original sin cambios de Grafana.
- `DeckFlowIntegrationTest.frontdeskTicketNoteModerationAndExistingSessionEnforcement`: espera 201 pero recibe 401 con la configuración local de la API. En la copia limpia original pasó sin esa configuración y volvió a fallar con el mismo `.env` local cargado. No se modificaron credenciales, reglas de seguridad ni estas pruebas.
- Tras la suite de 495 pruebas se añadió la comprobación de contexto `TelemetryDisabledIntegrationTest`, ejecutada por separado junto a `TelemetryDisabledTest`: 3 pruebas correctas. No se ha repetido la suite completa con ese test adicional.
