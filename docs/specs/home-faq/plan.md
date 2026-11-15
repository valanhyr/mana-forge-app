# Plan: preguntas frecuentes en inicio

Estado: implementado; validación visual manual pendiente. Referencia: `spec.md`.

1. Añadir JSON local vacío para `es` y `en`, con contrato tipado de temas y preguntas; encapsular su lectura para poder sustituirla posteriormente. No hay peticiones ni conexión CMS.
2. Escribir pruebas de comportamiento con contenido ficticio exclusivamente de test y comprobar que fallan por ausencia de la funcionalidad.
3. Implementar sección de presentación independiente del origen: acordeón de un elemento abierto, resaltado de pregunta, pestañas Radix con variante subrayada local, foco visible y adaptación móvil.
4. Conectar la sección al final del contenido de `Dashboard`, manteniendo el footer global sin modificaciones y usando las traducciones de interfaz existentes.
5. Ejecutar pruebas afectadas, lint, comprobación de tipos y build cuando sea viable; revisar diseño móvil y escritorio si hay un navegador disponible. Registrar evidencia y bloqueos en `tasks.md`.

La fase inicial no incluía preguntas. Extensión solicitada por el usuario: comprobar mediante pruebas la presencia y correspondencia de los ejemplos entre idiomas, añadir tres preguntas provisionales en dos temas al JSON y ejecutar las comprobaciones afectadas. El paso a CMS, sus contratos y cualquier despliegue requieren una aprobación futura.

## Sustitución de ejemplos por contenido real

Petición posterior del usuario: revisar los flujos de inicio, análisis, mazos, registro y soporte en la web y API; sustituir los ejemplos por preguntas útiles en ambos idiomas; comprobar agrupación, paridad de IDs, navegación y contenido; ejecutar pruebas y validaciones del frontend. Las cuotas son configurables: no se prometen cifras fijas ni análisis ilimitados. No se harán afirmaciones de privacidad de mazos que no se cumplan en todas sus rutas. No se modifican los flujos existentes.

Fuentes de los contenidos:

- Uso sin cuenta y rutas protegidas: `mana-forge-web/src/App.tsx` y `src/components/layout/ProtectedRoute.tsx`.
- Lista, mínimo de 40 cartas, verificación, cuota y resultados: `src/components/home/DeckAnalyzerSection.tsx`, `src/utils/decklistParser.ts`, `src/components/ui/AnalysisQuotaSummary.tsx` y `mana-forge-api/src/main/java/com/manaforge/api/controller/DeckController.java`.
- Creación, importación y validación: `src/views/deck-builder/DeckBuilder.tsx`; exploración y copia: `src/views/deck-explorer/DeckExplorer.tsx` y `src/views/deck-viewer/DeckViewer.tsx`.
- Registro, amistades, mensajes y soporte: `src/views/auth/Login.tsx`, `src/views/friends/Friends.tsx`, `src/views/messages/Inbox.tsx`, `src/views/messages/Support.tsx` y `src/views/contact/Contact.tsx`.

Las rutas `src/` anteriores son relativas a `mana-forge-web`, salvo indicación expresa. La interfaz ya contiene un mensaje de análisis ilimitados para usuarios registrados, pero `mana-forge-api/src/main/resources/application.yaml` configura por defecto una cuota para ellos. No se ha modificado ese mensaje en esta tarea.

## Extensión propuesta: integración con Directus

**Estado: implementado; validación real de Directus y regresión completa de API pendientes.** Referencia: extensión `CMS-AC-*` de `spec.md`. Las fases históricas anteriores siguen siendo evidencia de la implementación local, no de esta integración.

### Diseño y comprobaciones previas

1. El usuario confirmó que los nombres y campos coinciden con la propuesta. Comprobar relaciones, traducciones y permisos en una instancia autorizada durante la validación; no modificarla. Si difieren del contrato, ajustar spec y plan y solicitar aprobación de cambios materiales.
2. Omitir las entradas con código vacío o duplicado dentro de su colección y registrar el problema; ordenar entradas sin `sort` al final, por código en caso de empate. Las traducciones duplicadas para un elemento e idioma son datos inválidos y no deben resultar en una elección arbitraria. No basarse en que Directus imponga unicidad sin comprobarlo.
3. La fuente del endpoint será Directus, usando el token y la configuración existentes en servidor. Solicitar explícitamente los campos necesarios, filtrar ambos niveles por publicación, recuperar todas las páginas relevantes y mapear a DTOs públicos sin exponer IDs internos, credenciales ni datos de borradores. Seleccionar exactamente la traducción requerida; no reutilizar el fallback a la primera traducción de `DirectusService.pickTranslation`.
4. `GET /api/v1/content/faqs` aceptará `locale` explícito, prioritario sobre `Accept-Language`. La web usará `locale` desde `LanguageContext`; así evita el desfase entre detección inicial del navegador y el interceptor de `api.ts`, sin cambiar todas las peticiones de la aplicación. La cabecera es alternativa para otros clientes.
5. No aplicar caché en esta fase: una petición completa deberá consultar el CMS, lo que garantiza que una caída no se enmascara con datos cacheados. Valorar límites, rendimiento y caché como cambio posterior separado si el tráfico lo requiere. No modificar la configuración de caché existente ni su invalidación.

### Fases y archivos previstos

1. **API:** añadir DTOs de FAQ, lectura y mapeo en `mana-forge-api/src/main/java/com/manaforge/api/service/DirectusService.java` o un servicio específico, y endpoint en `controller/ContentController.java`. Implementar manejo seguro de errores. Mantener el GET público de acuerdo con `SecurityConfig.java`. Antes de cada comportamiento, añadir y ejecutar el test rojo correspondiente.
2. **Web:** hacer asíncrono `mana-forge-web/src/services/FaqService.ts` usando `src/services/api.ts`; cargar desde `src/views/dashboard/Dashboard.tsx` en función del idioma activo. Evitar resultados tardíos y limpiar contenido anterior al cambiar idioma o fallar. Mantener `FaqSection` montado o preservar explícitamente su selección para cumplir CMS-AC-08, sin mostrar contenido obsoleto. Mantener sus comportamientos accesibles.
3. **Pruebas existentes:** adaptar `src/__tests__/views/DashboardFaq.test.tsx`, que actualmente mockea el JSON síncrono, a respuestas asíncronas. Sustituir en `src/__tests__/components/home/FaqContent.test.tsx` las suposiciones de que el servicio sirve contenido fijo por pruebas de contrato y fixtures; conservar la cobertura significativa de presentación y teclado, sin exigir que el CMS real contenga ya las 13 preguntas. El JSON permanece solo como referencia editorial, sin import en ejecución.
4. **Validación:** ejecutar la suite de API con el wrapper y las pruebas web afectadas, lint, comprobación de tipos y build. Si hay una instancia Directus de prueba y acceso autorizado, verificar manualmente relaciones, idiomas, borradores, orden, permisos y el escenario cuatro temas/una FAQ. Registrar la ausencia de esa comprobación si no es posible. No desplegar ni crear contenido.

### Estrategia de pruebas y riesgos

- API: WireMock o equivalente para traducciones, estados, relaciones, orden, paginación, respuesta vacía, fallo de Directus y datos inválidos; MockMvc para endpoint público, selección de idioma y error sin información sensible. Asegurar que un error no se traduzca en `200 []`.
- Web: mocks de API con respuestas diferidas para probar idioma inicial detectado, cambio rápido y carreras; carga, vacío, fallo y recuperación; un tema, varios temas, interacción con teclado y ausencia de sección en otras rutas.
- Verificar que la retirada de las dependencias del JSON no elimina cobertura útil. No modificar el flujo de consentimiento ni la analítica.
- Riesgo operativo: sin caché hay más solicitudes a Directus; un CMS inaccesible implica sección oculta. La integridad del contenido, permisos y traducciones en una instancia real no queda demostrada por tests con mocks.

**Aprobación:** el usuario solicitó «crea una rama para ello y adelante» tras presentar la spec y este plan. Confirmó el esquema propuesto y la regla de códigos y órdenes incompletos. Migraciones, cambios en Directus y despliegue requieren autorización separada.
