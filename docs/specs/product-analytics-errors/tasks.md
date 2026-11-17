# Tareas: analítica de acceso, contacto y errores

**Estado: aprobado para implementación.** Referencias: `spec.md`, `plan.md`. El usuario aceptó las dos limitaciones propuestas; despliegue y cambios externos requieren autorización separada.

| Tarea | Criterios | Dependencias | Estado y evidencia |
|---|---|---|---|
| T-01: acordar contratos y decisiones pendientes | AC-01 a AC-08 | Ninguna | Aprobado: el usuario respondió «ok» tras presentar la spec, el plan y sus dos limitaciones. |
| T-02: probar y ampliar adaptador con consentimiento y parámetros cerrados | AC-01, AC-02 | T-01 | Rojo: `ProductAnalytics.test.ts`, 4 fallos por funciones ausentes. Verde posterior con `AnalyticsService.test.ts`: 17 pruebas. |
| T-03: medir registro, login local y verificación general | AC-03, AC-04 | T-02 | Rojo junto con T-05/T-06: faltaban llamadas a los eventos. Verde focalizado: 60 pruebas en 7 archivos, incluidos login y verificación en Strict Mode. |
| T-04: medir login Google si se aprueba la estimación | AC-01, AC-02, AC-05 | T-01, T-02 | Rojo: 2 pruebas por no iniciar ni consumir la marca; rojo adicional: 2 pruebas por no limpiar la cancelación/restauración de página. Verde posterior: 19 pruebas en adaptador, contexto e integración OAuth simulada. |
| T-05: medir contacto y copia del mazo | AC-01, AC-02, AC-06 | T-02 | Rojo conjunto con T-03/T-06 por eventos ausentes; verde focalizado y prueba de integración con consentimiento simulado. El test de portapapeles rechazado detectó además un rechazo no manejado ya existente; tras manejarlo no se contabiliza la copia. |
| T-06: medir 404 y fallo del flujo de guardado; preservar análisis existente | AC-01, AC-02, AC-07 | T-02 | Rojo conjunto por eventos ausentes; verde focalizado, incluidos Strict Mode y fallos al puntuar/guardar. Las pruebas existentes de resultado de análisis también pasaron. |
| T-07: actualizar documentación y textos de consentimiento | AC-02, AC-08 | T-03 a T-06 | Rojo: 3 pruebas de Klaro/políticas por categorías no documentadas. Verde: pruebas de Klaro y política en español e inglés dentro de un grupo de 25 pruebas. `ANALYTICS.md` actualizado; revisión legal y de Faro pendientes. |
| T-08: ejecutar regresiones y recorrido local con Google simulado | AC-01 a AC-08 | T-03 a T-07 | `npm run lint`, `npx tsc --noEmit` y `npm run build`: correctos. Pruebas focalizadas y recorridos jsdom con Google y API simulados: correctos. Suite completa `npx vitest run --maxWorkers=2`: 84 archivos y 484 pruebas correctas; avisos de Browserslist, cierre de workers y `window.scrollTo` de jsdom. No se ha probado la etiqueta real. |
| T-09: proponer validación real y despliegue | AC-08 | T-08 | Requiere autorización independiente; sin llamadas reales nuevas ni cambios externos. |

## Evidencia del borrador

- Se revisaron las rutas de autenticación, verificación, contacto, 404, mazos, el adaptador de analítica y la inicialización de Faro.
- Se revisaron las decisiones de antiabuso y caché de `ARCHITECTURE.md`; no se propone modificarlas.
- Se confirmó que la verificación de email comparte endpoint para registros y cambios de email, y que el fallo visible de guardado incluye la obtención previa de puntuaciones.
- Las pruebas y recorridos indicados usan mocks o jsdom. No se han enviado eventos de prueba a GA4 real ni se ha desplegado esta implementación.
- Las elecciones anteriores de Klaro se conservan. Antes de desplegar queda pendiente la revisión legal, incluida la necesidad o no de solicitar de nuevo el consentimiento para las nuevas categorías, y la revisión independiente de los datos enviados a Faro y de la medición automática de GA4.
- En la revisión inicial, `observability.ts` habilitaba captura de consola; `DeckBuilder.tsx` escribe objetos de error de guardado y `AuthService.ts` registra cuerpos de error de registro. El cambio posterior de `../disable-grafana/` desactiva Faro en el código, pero no verifica la instancia desplegada ni los datos históricos. No se han modificado esos flujos de consola.
