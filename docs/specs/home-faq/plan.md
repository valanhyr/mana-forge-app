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
