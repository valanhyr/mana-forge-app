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
