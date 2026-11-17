# Plan: analítica de acceso, contacto y errores

**Estado: aprobado para implementación.** Referencia: `spec.md`. El usuario aceptó la estimación de Google y la verificación general; despliegue y cambios externos requieren autorización separada.

## Diseño

1. Ampliar `mana-forge-web/src/services/AnalyticsService.ts` con funciones tipadas y parámetros de catálogo cerrado para el contrato aprobado. Reutilizar su comprobación de consentimiento y su aislamiento ante errores; no añadir clientes ni envíos desde la API. Asegurar que un evento nuevo no incorpora datos variables del formulario ni de rutas.
2. Instrumentar `Login.tsx` en la transición explícita al registro, el resultado exitoso del registro local y el login local confirmado. Cubrir tanto página como modal; no contar `UserContext` al restaurar sesión. En `VerifyEmail.tsx`, medir solo la respuesta exitosa como verificación general, con protección frente a efectos duplicados y sin copiar el token a la analítica.
3. **Solo si se aprueba la estimación de Google:** añadir una marca local por pestaña, sin identificadores, creada únicamente al iniciar Google con consentimiento. Definir caducidad corta, consumo único, limpieza ante retirada/cancelación y una comprobación explícita de sesión tras el retorno. No inferir el proveedor de una sesión ordinaria ni almacenar eventos para reenvío. Documentar los falsos positivos y negativos posibles; si no se puede garantizar el contrato sin cambiar autenticación, detener y volver a consultar.
4. Instrumentar `Contact.tsx` después de que la API responda o falle, excluyendo validación local; no cambiar el reto, honeypot, tiempo, respuestas ni correos. En `DeckViewer.tsx`, medir únicamente después de que el portapapeles confirme la copia.
5. Instrumentar la vista genérica `NotFound.tsx` sin ruta ni identificadores, una vez por navegación, incluyendo Strict Mode. En `DeckBuilder.tsx`, medir el fallo del flujo de guardado, incluidas las puntuaciones previas, sin alterar sus controles. Conservar el evento de resultado de análisis existente sin duplicarlo.
6. Actualizar `mana-forge-web/ANALYTICS.md` y revisar los textos locales de privacidad y Klaro para describir las nuevas categorías, sin afirmar cumplimiento legal. Documentar `method` y su posible registro como dimensión personalizada, sujeto a autorización independiente. Advertir sobre la medición mejorada y los metadatos automáticos de Google; no afirmar que el filtrado de parámetros propios controla todos los datos de la etiqueta.

## Pruebas y validación

- Para cada criterio, escribir primero pruebas que fallen por el comportamiento ausente, ejecutar y registrar el rojo, implementar lo mínimo, comprobar verde y refactorizar. Si un rojo no se ejecuta o falla por otro motivo, registrarlo sin atribuirlo a TDD.
- Adaptador: consentimiento ausente, concedido y retirado; `gtag` ausente y fallando; parámetros permitidos y no transmisión de datos privados; no reenvío de acciones anteriores. Validar saneamiento de rutas y títulos en las órdenes controladas por la aplicación.
- Flujos: registro y login local exitosos/fallidos, página/modal, restauración de sesión; verificación exitosa, inválida, repetida, cambio de email y Strict Mode; copia exitosa/rechazada; contacto aceptado/403/429/error de red/validación local, sin variar sus respuestas; 404 una vez por navegación y guardado fallido en puntuación o persistencia sin eventos en validación local.
- Google, si se aprueba: flujo iniciado sin consentimiento, retorno exitoso, sesión no confirmada/preexistente, otra autenticación concurrente como limitación, cancelación, caducidad, recarga, duplicados y retirada de consentimiento; no emitir `sign_up` ni eventos al restaurar sin marca válida. Probar que el almacenamiento no contiene tokens ni datos personales.
- IA: verificar regresión de `ai_analysis_finished` para error y fallback sin duplicados. No instrumentar la infraestructura de errores con contenido libre.
- Ejecutar Vitest focalizado, `npm run lint`, `npx tsc --noEmit`, `npm run build` y la suite web completa si es viable; documentar comandos, resultados y bloqueos en `tasks.md`. Hacer recorrido local con Google simulado. Las pruebas o llamadas a una propiedad GA4 real, la habilitación de dimensiones, cambios de Faro/Grafana y despliegue necesitan confirmación separada.

## Riesgos y límites

- La verificación de email no diferencia alta de cambio; el evento no puede construir un embudo fiable de altas por sí solo.
- La atribución de Google con marca de pestaña es aproximada y solo aplica si el usuario acepta esa limitación; no modificar seguridad para mejorar la métrica.
- El `catch` de guardado incluye puntuaciones previas; el nombre del evento describe un fallo del flujo, no una API específica.
- Una respuesta de contacto exitosa no garantiza entrega. Un 403 puede ser un rechazo previsto, no necesariamente una caída.
- GA4 y sus automatismos pueden recopilar metadatos adicionales. Al redactar este plan, Faro capturaba consola y su estado y tratamiento de datos en producción no se habían verificado. El cambio posterior de `../disable-grafana/` lo desactiva en el código, sin verificar producción ni datos históricos. No presentar los datos como anónimos ni prometer cumplimiento legal.
- El consentimiento puede cambiar durante una operación y producir conteos parciales. Si no está activo en el momento de emitir, la acción se pierde para analítica.
- Las preferencias de Klaro existentes se conservan; no se ha determinado si la ampliación de las categorías exige solicitar de nuevo el consentimiento. Revisarlo con quien corresponda antes del despliegue; cambiar esa conducta exigiría una decisión adicional.

## Aprobación

El usuario respondió «ok» tras presentarse explícitamente la spec, el plan, el login de Google aproximado y la semántica general de verificación. No incluye despliegue, consultas de prueba reales ni cambios en servicios externos.
