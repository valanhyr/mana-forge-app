# Plan: analítica de mazos e IA

**Estado: implementado y validado automáticamente; revisión externa pendiente.** Referencia: `spec.md`.

## Diseño

1. Extender `mana-forge-web/src/services/AnalyticsService.ts` con funciones tipadas y valores permitidos para los cuatro eventos; reutilizar su control de consentimiento y evitar que los errores de analítica afecten a los flujos. No construir un cliente alternativo ni enviar datos directamente desde la API.
2. Proteger los metadatos automáticos: usar rutas de plantilla conocidas y un valor genérico para rutas no reconocidas; configurar títulos seguros sin contenido suministrado por usuarios. Considerar la precedencia y la recogida automática de `page_location`, `page_path`, `page_title` y `page_referrer` en GA4, incluyendo cambios de historial. No cambiar la barra de direcciones ni el SEO de la aplicación. La propiedad y la etiqueta real requieren validación aparte; no prometer un filtrado universal sin comprobarlos.
3. Instrumentar creación y duplicación únicamente después de la respuesta exitosa en `DeckBuilder.tsx` y `DeckViewer.tsx`, con eventos distintos. No registrar actualizaciones ni IDs del resultado.
4. Instrumentar los dos puntos que llaman `DeckService.analyzeDeck`: inicio y constructor. Capturar al comienzo `user_type` y pantalla y conservarlos hasta el resultado. Revisar la respuesta observable: `fallback` prevalece sobre éxito; `error`, vacío o resultado no reconocible es error; un resultado con `general_summary` válido representa éxito. No alterar el resultado, los mensajes, cuotas ni los flujos del producto.
5. Actualizar `mana-forge-web/ANALYTICS.md` con nombres, clasificación, limitaciones, privacidad y dimensiones personalizadas que el responsable puede registrar manualmente en GA4. Alinear los textos informativos de Klaro y las páginas locales de cookies y privacidad con las nuevas acciones, sin afirmar cumplimiento legal automático.

## Estrategia de pruebas

- TDD por cada comportamiento: probar primero una falla por la ausencia de eventos o por metadatos inseguros, ejecutar el test, implementar lo mínimo, ejecutar verde y refactorizar. Registrar comandos y evidencias en `tasks.md`.
- Adaptador: sin consentimiento, aceptado y retirado; errores de Google; solo parámetros permitidos; rutas conocidas y no reconocidas sin IDs ni títulos de usuario; transición de sesión y retardo del script.
- Creación/duplicación: éxito, error, actualización, copia al portapapeles y doble acción real. Verificar que un `deck_cloned` no se cuenta como `deck_created`.
- IA: ambas pantallas; visitante, autenticado y sesión en carga; inicio, éxito, respuesta cacheada, `fallback`, error HTTP, error en el cuerpo y respuesta vacía. Comprobar que los eventos de una petición usan el mismo estado inicial y respetan un cambio de consentimiento antes de la respuesta.
- Ejecutar pruebas afectadas, `npm run lint`, `npx tsc --noEmit` y `npm run build`; ejecutar suite web completa si es viable. Probar en navegador con Google simulado; únicamente usar una propiedad GA4 real o cambiar dimensiones con autorización independiente.

## Riesgos y dependencias

- La clasificación de usuario depende del estado del frontend y puede ser imprecisa si la sesión del servidor cambia fuera del cliente. El valor `unknown` evita clasificar como visitante mientras se comprueba la sesión. No usar la cabecera cacheada incorrecta ni corregir controles de abuso en este alcance.
- Las respuestas de respaldo de IA se confunden fácilmente con éxito si solo se comprueba el HTTP. Una interacción exitosa desde caché no significa invocación ni coste adicional del motor.
- La normalización de rutas/títulos reduce el detalle de las métricas de navegación existentes. Las funciones automáticas o medición mejorada de GA4 podrían añadir metadatos o vistas: verificar con etiqueta y propiedad reales antes de desplegar.
- La integración de consentimiento anterior aún espera revisión legal, auditoría de dependencias y validación de GA4 real. Ninguna prueba con mocks acredita la recepción de datos o el cumplimiento legal.
- Sin migraciones, cambios en Directus, envío a Google real ni despliegue automático.

## Aprobación

El usuario respondió «ok» a la propuesta de implementar los eventos y proteger rutas y títulos. La aprobación no incluye desplegar ni modificar GA4.
