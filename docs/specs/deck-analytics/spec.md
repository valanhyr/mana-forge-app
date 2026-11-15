# Analítica de mazos y análisis de IA

**Estado: implementado y validado automáticamente; revisión externa pendiente.** El usuario pidió métricas de creación y análisis, confirmó que «usuario directo» significa visitante sin sesión, eligió medir los mazos duplicados como evento separado y aprobó la spec y el plan con «ok».

## Objetivo

Medir acciones de mazos y análisis en GA4, diferenciando visitantes y usuarios autenticados sin enviar como parámetros nombres, identificadores o contenido de mazos ni datos personales. Todos los eventos quedan sujetos al consentimiento de estadísticas de Klaro y reutilizan el adaptador de `mana-forge-web/src/services/AnalyticsService.ts`.

## Comportamiento actual comprobado

- Actualmente la web envía `page_view` y `faq_open`, pero no eventos de creación, duplicación o análisis de mazos. Ver `mana-forge-web/ANALYTICS.md`.
- `DeckAnalyzerSection.tsx` llama al análisis desde inicio; permite visitantes y usuarios autenticados. `DeckBuilder.tsx` lo llama desde el constructor, una ruta protegida.
- El constructor crea con `DeckService.saveDeck` y actualiza con `updateDeck`; duplicar desde `DeckViewer.tsx` usa `cloneDeck`. El guardado exige sesión.
- El análisis puede devolver resultado en caché, un objeto con `error`, una respuesta vacía o un respaldo marcado con `fallback`. HTTP 200 no garantiza un análisis real satisfactorio. `DeckServiceImpl.analyzeDeck` puede devolver un mazo de respaldo si falla el motor. Una respuesta cacheada no implica una nueva llamada al proveedor de IA.
- `UserContext` expone `isAuthenticated` y `isSessionLoading`. Durante la comprobación inicial de sesión no debe asumirse que una persona es visitante. El estado del frontend es indicativo, no una prueba de identidad verificada por el servidor. La cabecera `X-Analysis-Authenticated` no es fiable para esta clasificación en respuestas cacheadas: `DeckController` pasa `true` en esa rama. No cambiar cuotas, caché ni controles antiabuso para esta funcionalidad.
- `AnalyticsService` elimina parámetros y fragmentos de URL, pero conserva segmentos dinámicos como `/deck-viewer/<id>` y `/deck-builder/<id>`. Además, `DeckViewer` establece el título de la página a partir del nombre del mazo; Google puede recoger `document.title` de forma automática. El diseño debe abordar ambos riesgos, no solo omitir los datos de los parámetros personalizados.

## Contrato de eventos propuesto

| Evento | Momento | Parámetros específicos |
|---|---|---|
| `deck_created` | La API confirma la creación de un mazo desde el constructor. No incluye actualizaciones. | `user_type`, `app_screen` |
| `deck_cloned` | La API confirma la duplicación de un mazo desde su visualizador. | `user_type`, `app_screen` |
| `ai_analysis_started` | La aplicación inicia la petición de análisis, después de las comprobaciones previas. | `user_type`, `app_screen` |
| `ai_analysis_finished` | Llega la respuesta o falla la petición. | `user_type`, `app_screen`, `analysis_status` |

- `user_type`: `guest`, `authenticated` o `unknown` si la sesión sigue cargándose. Es el estado conocido en el frontend **al iniciar la acción** y se mantiene para su resultado, aunque cambie la sesión mientras espera.
- `app_screen`: `home`, `deck_builder` o `deck_viewer`, según corresponda. No contiene rutas, IDs ni texto libre.
- `analysis_status`: `success` para un resultado de análisis reconocido; `fallback` para una respuesta marcada como respaldo; `error` para fallo HTTP, resultado vacío, objeto de error o respuesta no reconocible. No enviar el mensaje de error ni datos del mazo. La implementación detallará en el plan la comprobación del contrato del resultado y la probará.
- Un análisis servido desde caché puede contar como `success`: estas métricas miden interacciones observadas por el navegador, no llamadas cobradas al motor ni uso total del servidor.
- Se emitirá cada evento solo si el consentimiento de estadísticas está activo en ese momento y Google está disponible. No se encolarán eventos previos al consentimiento. Una retirada o aceptación durante una petición puede dejar solo uno de los eventos de inicio/fin.

## Privacidad y comportamiento esperado

- **AC-01:** Al guardar correctamente un mazo nuevo desde el constructor se envía un único `deck_created`; editar un mazo existente o fallar el guardado no lo envía. Cada creación realmente confirmada por la API se cuenta como una operación independiente.
- **AC-02:** Al duplicar correctamente se envía un único `deck_cloned`; una duplicación fallida o la copia de texto al portapapeles no lo envían. Se registra por separado de `deck_created`.
- **AC-03:** Cada petición de análisis iniciada desde inicio o el constructor genera un `ai_analysis_started` y, al completarse o fallar, un `ai_analysis_finished`, condicionado al consentimiento en cada momento. El resultado clasifica como `fallback` las respuestas marcadas como respaldo y no confunde una respuesta vacía o un error con éxito.
- **AC-04:** El estado de usuario diferencia `guest` y `authenticated`; durante la carga de sesión usa `unknown` sin atribuir el evento a un usuario concreto. Los dos eventos de una misma petición conservan la clasificación capturada al inicio. No depender de la cabecera de autenticación de la rama cacheada.
- **AC-05:** Los eventos personalizados contienen únicamente parámetros de catálogo cerrado: `user_type`, `app_screen` y, cuando corresponda, `analysis_status`. No incluir email, username, user ID, ID o nombre de mazo, cartas, listas, tokens, IP ni mensajes de error. GA4 puede recopilar señales técnicas propias; no describir estos datos como totalmente anónimos.
- **AC-06:** Antes de ampliar las métricas, sustituir en los datos enviados a GA las rutas dinámicas por plantillas sin IDs y usar títulos de página seguros no derivados de texto de usuario. Esto modifica el detalle disponible en las vistas de página actuales y requiere aprobación junto con esta spec. Cubrir al menos las rutas de mazos, mensajes y tickets con parámetros, además de las demás rutas dinámicas registradas; una ruta no reconocida debe usar un valor genérico sin segmentos de usuario. No cambiar las URL que ve el navegador ni el SEO visible.
- **AC-07:** Sin consentimiento, tras retirarlo o si Google falla, no se envían eventos ni se bloquea la acción. No se debilitan Turnstile, cuotas, caché, validaciones de mazos ni permisos.
- **AC-08:** Actualizar `mana-forge-web/ANALYTICS.md` y los textos informativos de consentimiento y privacidad con las nuevas acciones; registrar pruebas y limitaciones. El recuento en GA4 será parcial: excluye visitantes sin consentimiento, bloqueadores, problemas de red y acciones previas a la inicialización de Google. Los textos siguen pendientes de revisión legal.

## Escenarios

1. Dado un visitante sin sesión y con consentimiento, cuando solicita un análisis desde inicio, se envían los eventos de inicio y resultado con `user_type=guest` y `app_screen=home`, sin lista de cartas.
2. Dado un usuario autenticado, cuando crea un mazo nuevo, se envía `deck_created` con `user_type=authenticated`; si después lo actualiza, no se cuenta como creación.
3. Dado un usuario autenticado, cuando duplica un mazo, se envía `deck_cloned`, no `deck_created`.
4. Dado un análisis con respuesta `fallback`, el resultado no se cuenta como análisis exitoso aunque el HTTP sea 200.
5. Dada una URL `/deck-viewer/123` con un título escrito por un usuario, GA recibe una ruta de plantilla y un título seguro, no el identificador ni el título libre como metadatos que configura la aplicación.

## Exclusiones y aprobación

Sin eventos para actualizaciones, copiar listas, generación del mazo diario ni puntuaciones automáticas (`/decks/scores`). Sin cambios de backend, Directus, políticas de seguridad, cuenta de GA4 o despliegue. No se obtendrán métricas históricas retroactivas. Antes del despliegue siguen pendientes la revisión legal y la validación real de Google de la integración de consentimiento.

**Aprobado:** el usuario respondió «ok» tras presentar la propuesta y solicitar aprobación de su implementación, incluida la protección de rutas y títulos. La aprobación incluye la clasificación `unknown` y el tratamiento de respaldos descritos aquí. Despliegue, pruebas en GA4 real o cambios de su propiedad requieren autorización separada.
