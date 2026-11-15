# Plan: analítica de FAQ y consentimiento

**Estado: implementado; validación y revisión pendientes.** Referencia: `spec.md`.

## Diseño

1. Añadir Klaro con una versión fijada, integrado y servido con el frontend, con textos ES/EN y un mecanismo accesible para reabrir preferencias. Inventariar el estado inicial del banner previo; no traducir su clave `cookie_consent` a una aceptación de Klaro. Mantener un solo banner activo. La ventana de novedades se monta después de resolver el aviso, evitando dos ventanas que compitan por el foco; la decisión se sincroniza también entre pestañas.
2. Desacoplar la inicialización de GA del HTML incondicional. Bloquear la carga y eventos hasta el consentimiento de estadísticas; usar Consent Mode básico, evitando pings antes de aceptar. Asegurar que un fallo al inicializar Klaro o al leer el consentimiento mantiene GA bloqueado.
3. Centralizar en un adaptador la inicialización de Google y el envío de vistas y eventos para respetar el consentimiento en todo momento. Sustituir el seguimiento directo de `Layout.tsx`, con comportamiento definido para aceptación, navegación SPA, recarga, retirada y recuperación. Evitar doble inicialización y doble vista inicial. Documentar la limpieza de cookies y sus limitaciones.
4. Pasar una función de seguimiento a `FaqSection` o usar un adaptador mantenible: enviar `faq_open` solo al pasar de cerrado a abierto. Identificar con `item.id`, `topic.id` y el idioma activo; no modificar el contrato de Directus ni enviar textos. Mantener teclado y acordeón actuales.
5. Revisar textos y enlaces de privacidad/cookies aplicables sin afirmar cumplimiento legal automático. Evitar cambios de alcance en Faro, Turnstile o autenticación.
6. Sanear URLs y referencias antes de pasarlas a Google: omitir parámetros y fragmentos, incluyendo en `page_location` y `page_referrer`. El usuario aceptó expresamente perder el desglose por parámetros para evitar posibles filtraciones de tokens.

## Validación

- TDD por comportamiento: escribir y ejecutar pruebas rojas de consentimiento, carga de GA y eventos, implementar el mínimo, ejecutar verdes y refactorizar. Registrar comandos y resultados en `tasks.md`.
- Pruebas unitarias y de componentes para ausencia, rechazo, aceptación, persistencia, retirada y errores; recarga; teclado y ratón; repetición de apertura; no evento al cerrar o cambiar pestaña; códigos e idioma, sin textos ni datos personales.
- Pruebas de integración del SPA para primera vista y cambios de ruta; ausencia de doble carga/evento y ninguna cola de acciones previas al consentimiento.
- Revisar `npm run lint`, `npx tsc --noEmit`, build y pruebas web afectadas; ejecutar regresión completa si el entorno lo permite.
- En navegador y entorno autorizado, inspeccionar red y cookies antes de decidir, después de rechazar, aceptar y retirar, incluida una recarga. Verificar que la sesión y Turnstile no se rompen. Verificar eventos en DebugView únicamente con propiedad de pruebas autorizada; si no está disponible, registrar el bloqueo y no atribuir a los mocks una entrega real.

## Riesgos y dependencias

- La sustitución del banner es un cambio de privacidad transversal y requiere revisión, no solo añadir un `gtag` al botón. La etiqueta actual se carga antes de consentir; debe retirarse de la ruta incondicional, así como los envíos de `Layout`.
- Klaro debe gestionar explícitamente los scripts o sus inicializadores; instalarlo por sí solo no garantiza el bloqueo. Se validará su versión y estrategia de integración antes de elegir una dependencia concreta.
- El backend y Directus no se modifican. Despliegue, cambios de configuración en Google y pruebas contra datos reales requieren autorización independiente. Los trabajos no relacionados ni los cambios sin confirmar en la rama se conservan.
- Klaro 0.7.21 es una dependencia fijada en el lockfile. `npm audit --omit=dev --package-lock-only` informó 31 incidencias frente a 21 en el lockfile anterior; la dependencia incluye herramientas de build y hace que paquetes que eran de desarrollo aparezcan también en el árbol de producción. Revisar estas alertas antes de un despliegue; no se ejecutó `npm audit fix`.

## Explotación de eventos

Con estadísticas aceptadas, el evento se denomina `faq_open` y envía `faq_code`, `faq_topic` y `faq_language`. Los códigos proceden de las FAQ y no del texto traducido. El usuario aprobó `faq_language` en lugar de `language`, que es un campo propio de Google. Para usar estos parámetros en informes GA4 puede ser necesario registrarlos como dimensiones personalizadas de ámbito de evento; no se ha modificado la propiedad de Google. Si la medición mejorada de GA4 también emite vistas de página al cambiar el historial, revisar esa configuración para evitar duplicados. Las URLs enviadas por la aplicación omiten parámetros y fragmentos.

En GA4, si el responsable lo autoriza, crear en **Administrar → Definiciones personalizadas** una dimensión de ámbito de evento por cada parámetro (`faq_code`, `faq_topic`, `faq_language`) y verificar después su disponibilidad en los informes. La API y la web no configuran estas dimensiones. Los códigos de Directus son contenido editorial: deben ser identificadores estables, sin datos personales ni información sensible; la integración no puede deducir si un código introducido por un editor contiene datos sensibles.

## Aprobación

Aprobado por el usuario con «ok» a la propuesta de implementar Klaro y después el evento de FAQ. Las FAQ de Directus y su validación real siguen siendo una tarea separada.
