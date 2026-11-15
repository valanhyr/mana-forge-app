# Tareas: preguntas frecuentes en inicio

Estado: implementado y validado automáticamente; revisión visual manual pendiente. Spec y plan aprobados en conversación.

| Tarea | Criterios | Estado y evidencia |
|---|---|---|
| T-01: contrato JSON vacío y pruebas de comportamiento | AC-01 a AC-06 | Rojo confirmado: `npx vitest run src/__tests__/views/DashboardFaq.test.tsx`, 4 fallos por ausencia de la región, preguntas y pestañas. Se observaron además avisos `act` por las cargas asíncronas existentes del dashboard. |
| T-02: fuente local, acordeón, pestañas y conexión a inicio | AC-01 a AC-06 | Verde inicial: `npx vitest run src/__tests__/views/DashboardFaq.test.tsx`, 4 pruebas superadas. Refactor con Prettier; pruebas adicionales cubren vacío, un tema, cambio de tema disponible y otras rutas. |
| T-03: regresión y validación | AC-01 a AC-06 | En Windows con Node 22.14.0: `npm test` pasó 424 pruebas en 66 archivos; `npm run lint`, `npx tsc --noEmit` y `npm run build` pasaron. Sin revisión visual manual en navegador; pendiente verificar móvil y escritorio con contenido de prueba. |
| T-04: añadir tres ejemplos bilingües en dos temas | AC-07 | Rojo confirmado: `npx vitest run src/__tests__/components/home/FaqContent.test.tsx`, 2 fallos porque no había temas ni preguntas. Verde: 15 pruebas en 4 archivos (`FaqContent`, `FaqSection`, `DashboardFaq`, `Dashboard`); `npm run lint`, `npx tsc --noEmit` y `npm run build` correctos. La revisión visual manual sigue pendiente. |
| T-05: reemplazar ejemplos por FAQ sobre la operativa real | AC-08 | Rojo confirmado: `npx vitest run src/__tests__/components/home/FaqContent.test.tsx`, 1 fallo por faltar los temas y flujos reales; 1 prueba ya pasaba con los ejemplos. Verde: 15 pruebas en 4 archivos (`FaqContent`, `FaqSection`, `DashboardFaq`, `Dashboard`); `npm run lint`, `npx tsc --noEmit` y `npm run build` correctos. Las fuentes se recogen en el plan. El usuario valoró positivamente el aspecto previo; no se ha revisado manualmente el nuevo contenido. |

La suite mostró tres avisos de `window.scrollTo` no implementado por jsdom. El build terminó con avisos de datos Browserslist antiguos, importación mixta de `DeckService` y tamaño de bundle. Ninguno impidió la validación. La navegación por teclado se verificó con tests; el aspecto responsivo requiere revisión visual. No se realizó despliegue.

Hallazgo fuera del alcance: en `DeckServiceImpl.getDeckView`, el acceso por ID no comprueba `isPrivate`, mientras que `getDeckById` sí lo hace; `GET /api/**` está permitido anónimamente en `SecurityConfig`. Es un riesgo potencial de exposición de mazos privados por ID, identificado por lectura del código y pendiente de prueba y corrección separadas. Tampoco se corrige aquí el mensaje existente que promete análisis ilimitados al iniciar sesión.

## Extensión propuesta: FAQ desde Directus

**Estado: implementación realizada; validación parcialmente bloqueada.** El usuario autorizó comenzar y pidió una rama. Las evidencias históricas anteriores no prueban esta integración.

| Tarea | Criterios | Dependencias | Estado y evidencia |
|---|---|---|---|
| CMS-T-01: confirmar contrato Directus y acordar reglas para datos inválidos | CMS-AC-01 a 03 | Descripción del esquema real | Completado por confirmación del usuario: nombres y campos coinciden; omitir códigos vacíos o duplicados y ordenar valores sin `sort` al final. No se ha consultado ni modificado la instancia: `docker ps` no pudo conectar con Docker Desktop y el snapshot no contiene las colecciones FAQ. Relaciones y permisos reales pendientes de validación. |
| CMS-T-02: probar y construir consulta, traducción, publicación, orden y paginación | CMS-AC-02, 03, 07, 09 | CMS-T-01 | Implementado con WireMock. Rojo: `DirectusFaqServiceTest` falló porque no existía `getFaqs`; verde: 3 pruebas iniciales. Se añadieron posteriormente pruebas de paginación y respuesta inválida, verdes en la suite; no se afirma un rojo separado para ellas. Validación con Directus real pendiente. |
| CMS-T-03: probar y construir endpoint, negociación de idioma y errores seguros | CMS-AC-01, 04, 05, 09 | CMS-T-02 | Rojo: `ContentControllerTest` produjo 404 en las tres pruebas nuevas. Verde: `DirectusFaqServiceTest,ContentControllerTest`, 10 pruebas. La suite posterior ejecutó 12 pruebas entre ambas clases tras añadir dos pruebas más del servicio. |
| CMS-T-04: probar y conectar carga asíncrona en la web | CMS-AC-04 a 08 | CMS-T-03 | Rojo: `FaqService.test.ts` falló por servicio síncrono; verde: 2 pruebas. `DashboardFaq.test.tsx` falló porque el componente recibía una promesa; verde: 8 pruebas. Respuesta malformada: rojo por aceptarla y verde al validarla. Se añadió después el caso de idioma detectado. |
| CMS-T-05: validar regresiones y recorrido manual | CMS-AC-01 a 09 | CMS-T-02 a 04 | Parcial: `npx vitest run --maxWorkers=2` pasó 433 pruebas en 68 archivos; `npm run lint`, `npx tsc --noEmit` y `npm run build` pasaron. `npm test` con configuración por defecto agotó 180 s; con 2 workers pasó. API `./mvnw test`: 493 pruebas, 1 fallo en `FeedbackControllerTest.submitFeedback_withoutAuth_returns401`, reproducido aisladamente; `SecurityConfig` en HEAD ya permite `POST /api/feedback`. Falta validar contra Directus real y revisión visual manual. |

Rama creada: `feat/directus-faq`. El build frontend mostró avisos de Browserslist antiguo, importación mixta de `DeckService` y tamaño de bundle; la suite web mostró avisos de `window.scrollTo` de jsdom. El esquema y permisos reales de Directus están pendientes de comprobación: Docker no estaba disponible. Despliegue, migración y cambios en la instancia requieren autorización separada.
