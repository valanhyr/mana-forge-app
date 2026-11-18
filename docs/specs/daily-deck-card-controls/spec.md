# Corregir los botones de la tarjeta del mazo del día

**Estado: implementado y validado; no desplegado.** El usuario mostró el error de React por botones anidados y aprobó separarlos manteniendo aspecto, manejo con teclado y pruebas, sin modificar la CSP. Se aplica la ruta ligera de `docs/spec-driven-development.md`.

## Requisitos observables

- **AC-01:** La tarjeta del mazo del día no contiene botones dentro de otros botones. El control de apertura y las cinco estrellas son botones independientes.
- **AC-02:** La tarjeta sigue abriendo el detalle mediante clic, Enter y Espacio. Las estrellas siguen puntuando sin abrir el detalle; un visitante sin sesión sigue viendo el aviso de inicio de sesión y no envía una puntuación.
- **AC-03:** Las estrellas de la tarjeta tienen nombres accesibles traducidos y un indicador visible de foco. La tarjeta conserva la presentación y las interacciones del modal, incluidas sus estrellas.
- **AC-04:** No cambiar las políticas CSP, Google Analytics, los contratos de la API ni los controles de seguridad. Las advertencias de Tag Assistant se investigan por separado y no se tratan como confirmación de un fallo de la aplicación.

## Plan y tareas

1. Añadir pruebas que reproduzcan el anidamiento y cubran las interacciones de tarjeta/estrellas, incluidos teclado y nombres accesibles; ejecutar rojo por el defecto existente. Mantener las pruebas del modal apuntando explícitamente a sus controles.
2. Separar visualmente los controles usando botones nativos hermanos, manteniendo el estilo y sin enviar datos adicionales. Ejecutar verde y refactorizar si es necesario.
3. Ejecutar las pruebas afectadas, `npm run lint`, `npx tsc --noEmit` y el build web. Registrar resultados y limitaciones abajo. El despliegue no está incluido.

## Evidencia

- Diagnóstico previo: `Dashboard.tsx` contiene un `<button>` exterior con cinco botones de puntuación dentro. Las pruebas existentes de estrellas solo cubrían las del modal.
- La propuesta de corregir exclusivamente este problema sin modificar CSP fue aprobada por el usuario con «ok».
- Rojo: `npx vitest run src/__tests__/views/Dashboard.test.tsx --maxWorkers=2` falló en tres pruebas por el botón anidado y la ausencia de nombres accesibles en las estrellas de la tarjeta. La prueba de apertura por teclado ya pasaba; no se atribuye a un rojo inexistente.
- Tras separar los controles se corrigió una aserción de prueba que confundía el botón de cerrar del aviso con el del modal. Verde final: `npx vitest run src/__tests__/views/Dashboard.test.tsx src/__tests__/views/DashboardFaq.test.tsx --maxWorkers=2`, 21 pruebas correctas.
- `npm run lint`, `npx tsc --noEmit` y `npm run build`: correctos. El build mostró avisos de Browserslist antiguo y tamaño de bundle.
- Chrome headless con build local, API simulada y conexiones HTTPS bloqueadas: a 390 y 1280 píxeles los controles tenían áreas de clic independientes, pulsar la estrella no abría el modal y pulsar la tarjeta sí. La apertura con Enter/Espacio y la puntuación con teclado se comprobaron en Vitest.
- No se modificó la CSP ni se verificó la extensión Tag Assistant; no se ha desplegado el cambio.
