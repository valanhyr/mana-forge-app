# Analítica en Mana Forge Web

Esta guía describe la implementación de Google Analytics 4 (GA4) y el
consentimiento del frontend. La implementación está en la rama de trabajo y
**aún debe validarse con la etiqueta y una propiedad GA4 reales antes del
despliegue**. Las pruebas actuales no acreditan que Google haya recibido eventos.

## Configuración

- **Proveedor:** Google Analytics 4 mediante Google tag (`gtag.js`).
- **ID de medición:** `G-YR4GEC9XWL`, definido en
  [`src/services/AnalyticsService.ts`](src/services/AnalyticsService.ts).
  Es un identificador público, no una credencial. Actualmente no hay una
  variable de entorno para cambiarlo.
- **Consentimiento:** Klaro, configurado en
  [`src/components/ui/KlaroConsent.tsx`](src/components/ui/KlaroConsent.tsx).
- **Contenido de las FAQ:** la API devuelve los códigos estables de Directus
  como `id` del tema y de la pregunta. La web no envía el contenido del JSON
  local a Google.

## Consentimiento

1. Al entrar sin una elección previa, las estadísticas están desactivadas y la
   aplicación no carga la etiqueta de Google.
2. Al aceptar estadísticas, se carga la etiqueta y se habilitan las vistas de
   página y los eventos descritos abajo. No se envían acciones anteriores a la
   aceptación.
3. Al rechazar, no se carga Google Analytics. La elección puede cambiarse desde
   el botón flotante **Gestionar consentimiento**.
4. Al retirar el consentimiento, la aplicación deja de emitir eventos, activa
   `ga-disable-G-YR4GEC9XWL` e intenta eliminar cookies de GA accesibles para el
   dominio y la ruta. No puede cancelar peticiones ya iniciadas ni garantiza
   borrar cookies inaccesibles o de otros dominios.

Klaro guarda la elección en `localStorage`, bajo `mana_forge_klaro`, y la
sincroniza entre pestañas. La preferencia del banner anterior (`cookie_consent`)
no se convierte automáticamente en una aceptación; se vuelve a preguntar.
Las elecciones ya guardadas en Klaro se conservan al ampliar las métricas; está
pendiente revisar si es necesario solicitar de nuevo el consentimiento antes del
despliegue.
El código inicializa los estados de consentimiento de Google como denegados y
concede `analytics_storage` al aceptar; las opciones publicitarias permanecen
denegadas. No se usa el modo avanzado de medición sin cookies antes de aceptar.

El gestor no controla la sesión ni Cloudflare Turnstile. Faro está desactivado
en el código actual, aunque no se ha verificado el despliegue existente. La
política de cookies y privacidad del sitio se encuentra actualmente en
[`src/core/mocks/legalPages.mock.json`](src/core/mocks/legalPages.mock.json);
su texto requiere revisión legal antes de publicar.

## Eventos

### `faq_open`: apertura de pregunta

Se envía al **abrir** una pregunta frecuente con ratón o teclado, siempre que
se haya aceptado la categoría de estadísticas y la etiqueta esté disponible.
Cerrar la pregunta, cambiar de pestaña o mostrar la sección no genera el evento.
Cada reapertura posterior cuenta como otra apertura.

| Parámetro | Significado | Ejemplo |
|---|---|---|
| `faq_code` | Código estable de la pregunta en Directus | `what-can-i-do` |
| `faq_topic` | Código estable de la pestaña en Directus | `general` |
| `faq_language` | Idioma seleccionado en la aplicación | `es` o `en` |

Ejemplo lógico del evento:

```js
gtag('event', 'faq_open', {
  faq_code: 'what-can-i-do',
  faq_topic: 'general',
  faq_language: 'es',
});
```

`faq_language` es distinto del campo estándar `language` de Google, que suele
representar el idioma del navegador. Los códigos deben ser estables entre
traducciones y no deben contener datos personales ni información sensible. El
evento no añade el texto de la pregunta o respuesta, IDs de usuario ni email.
Google puede recoger otras señales técnicas según la configuración de su
etiqueta y de la propiedad; no se debe asumir que los datos son anónimos.

Si Google está bloqueado, falla o todavía no ha terminado de cargarse, la FAQ
sigue funcionando y esa apertura no se almacena para reenviarla más tarde.

### Mazos y análisis de IA

| Evento | Cuándo se emite | `app_screen` |
|---|---|---|
| `deck_created` | La API confirma la creación de un mazo nuevo. Una actualización no cuenta. | `deck_builder` |
| `deck_cloned` | La API confirma la duplicación de un mazo. Copiar su lista no cuenta. | `deck_viewer` |
| `ai_analysis_started` | La aplicación inicia la petición de análisis. | `home` o `deck_builder` |
| `ai_analysis_finished` | Llega el resultado del análisis o falla la petición. | `home` o `deck_builder` |

Todos incluyen `user_type`, calculado con el estado de sesión conocido en el
frontend al **iniciar la acción**:

| `user_type` | Significado |
|---|---|
| `guest` | Visitante sin sesión iniciada. |
| `authenticated` | Usuario con sesión iniciada. |
| `unknown` | La sesión aún se está comprobando o su estado no está disponible. |

Crear o duplicar mazos requiere sesión. El valor es una clasificación del estado
conocido por la web, no una verificación de identidad por el servidor, y se
mantiene entre el inicio y el resultado de una misma petición.

`ai_analysis_finished` añade `analysis_status`:

| `analysis_status` | Significado |
|---|---|
| `success` | Respuesta reconocida como análisis; puede proceder de caché. |
| `fallback` | La API marcó la respuesta como contenido de respaldo. |
| `error` | Error HTTP, error en el cuerpo, respuesta vacía o no reconocible. |

Ejemplo lógico:

```js
gtag('event', 'ai_analysis_finished', {
  user_type: 'guest',
  app_screen: 'home',
  analysis_status: 'success',
});
```

Los cuatro eventos solo incluyen esos parámetros de valores controlados; no
añaden nombres, IDs o listas de mazos, cartas, usuarios, emails, tokens ni
mensajes de error. Una respuesta en caché puede contar como `success`: estas
métricas describen interacciones en la web, **no** el número de llamadas ni el
coste del proveedor de IA. Las puntuaciones automáticas y la generación del mazo
diario no se cuentan como análisis de estos eventos.

El consentimiento se comprueba por separado al inicio y al final. Si cambia
durante la petición, es posible recibir únicamente uno de los eventos. Las
acciones sin consentimiento o con Google bloqueado no se reenvían después.

### Acceso, contacto y errores

| Evento | Cuándo se emite | Parámetros propios |
|---|---|---|
| `registration_started` | La persona cambia explícitamente al formulario de registro. | Ninguno. |
| `sign_up` | La API confirma la creación de una cuenta local. No implica verificación ni sesión iniciada. | `method=local` |
| `email_verification_completed` | La API confirma una verificación de email. También incluye cambios de dirección; no equivale a un alta nueva. | Ninguno. |
| `login` | Se confirma el acceso local o se estima un retorno de Google con sesión confirmada. | `method=local` o `google` |
| `contact_submitted` | La API acepta el envío del formulario. No garantiza la entrega del correo. | Ninguno. |
| `contact_submit_failed` | La petición de contacto falla o es rechazada. La validación local no cuenta. | Ninguno. |
| `deck_list_copied` | El portapapeles confirma la copia desde el visualizador. | Ninguno. |
| `page_not_found` | Se muestra la página genérica 404, una vez por navegación. No cubre recursos inexistentes dentro de rutas válidas. | Ninguno. |
| `deck_save_failed` | Falla la operación de guardar o actualizar, incluida la obtención previa de puntuaciones. La validación local no cuenta. | Ninguno. |

El login de Google es una **estimación**, no una confirmación del proveedor ni
de la creación de una cuenta. Solo si hay consentimiento y la sesión ya está
comprobada como no iniciada, un clic normal en Google guarda en `sessionStorage`
una marca por pestaña con la hora; no contiene credenciales ni datos de usuario.
Al volver se consume una vez: si tiene hasta cinco minutos, la sesión está
confirmada y Google Analytics está listo, se emite `login` con `method=google`.
Se descarta si falla la comprobación, caduca o se retira el consentimiento.
No se reenvía más tarde si la etiqueta no estaba lista. Otra autenticación
concurrente puede causar una atribución errónea y abrir el flujo en otra pestaña
no se cuenta. Las altas de Google no producen `sign_up`.

Los eventos propios no incluyen datos de usuario, mensajes, rutas solicitadas,
errores, IDs, nombres ni listas de cartas. Esto no garantiza que los metadatos
automáticos de Google estén saneados: requieren revisión independiente. Faro
está desactivado en el código actual; su estado en instalaciones ya desplegadas
y la posible retención de datos anteriores no se han comprobado.
El error de análisis se mide con `ai_analysis_finished`, no con un evento nuevo.

### `page_view`: navegación

[`src/components/layout/Layout.tsx`](src/components/layout/Layout.tsx) informa
al adaptador de la ruta actual. Una vez aceptadas las estadísticas, el adaptador
envía una vista de página inicial y otra al cambiar de ruta en la aplicación.
No vuelve a emitirla si la ruta no cambia; una nueva aceptación después de
retirar el consentimiento puede generar una nueva vista de la ruta actual.

La aplicación elimina los parámetros de consulta y fragmentos de la ruta y de
la URL de referencia que pasa a Google. Sustituye también los segmentos
dinámicos por plantillas: por ejemplo, registra `/deck-viewer/:deckId`, no el
ID real. Las rutas no reconocidas se registran como `/other`; el título de
página enviado por el adaptador es siempre `Mana Forge`, no `document.title`.
Para referencias de otro origen se envía solo el origen. Esto reduce el detalle
de navegación disponible en los informes, pero no cambia la URL ni el título
visibles en el navegador. La etiqueta de script usa una política de referencia
`origin`.

Si se navega entre dos mazos distintos, se registran dos vistas con la misma
plantilla, sin enviar los identificadores. Cambiar solo parámetros de consulta
no genera una vista adicional.

La aplicación configura `send_page_view: false` y emite sus propios eventos
`page_view`. **Hay que revisar la medición mejorada de la propiedad GA4**: sus
eventos automáticos de cambios de historial pueden producir vistas duplicadas o
tener un tratamiento diferente de las URL. No se ha modificado esa propiedad.

## Consultar los datos en GA4

Con autorización para modificar la propiedad correspondiente:

1. En GA4, abre **Administrar → Definiciones personalizadas**.
2. Crea dimensiones personalizadas con ámbito **Evento** para los parámetros
   que quieras consultar: `faq_code`, `faq_topic`, `faq_language`, `user_type`,
   `app_screen`, `analysis_status` y, si se necesita desglosar acceso, `method`.
3. Después de que se recopilen y procesen los datos, usa los eventos y esas
   dimensiones en Informes o Exploraciones.

Registrar las dimensiones no es necesario para que el navegador intente enviar
el evento, pero sí para consultar sus parámetros en informes habituales. La
disponibilidad puede tardar hasta 48 horas y el registro no garantiza recuperar
datos anteriores. No se ha creado ninguna dimensión en Google desde este repo.

## Comprobación local

Para probar **sin enviar datos reales**, usa una propiedad de pruebas
autorizada o intercepta/bloquea las peticiones de Google. El ID de medición
actual apunta a la propiedad configurada en el código; no actives el envío real
sin autorización.

Con las herramientas de desarrollo del navegador:

1. En una sesión nueva, abre **Red** y visita la web sin aceptar. Comprueba que
   no se solicita `gtag/js`; abre una FAQ y comprueba que no hay evento.
2. Rechaza estadísticas y repite la comprobación.
3. Acepta estadísticas, abre una FAQ, ciérrala y vuelve a abrirla. Debe haber
   un `faq_open` por cada apertura, no por el cierre.
4. Retira el consentimiento desde el botón flotante, abre otra FAQ y navega:
   la aplicación no debe añadir nuevos eventos. Recarga y comprueba que la
   elección se conserva.
5. Revisa en **Aplicación → Cookies** las cookies de GA que sean accesibles y,
   en **Almacenamiento local**, la clave `mana_forge_klaro`. Prueba también el
   cambio de consentimiento desde otra pestaña.

Para inspeccionar las órdenes presentes en la capa de datos, sin generar
eventos adicionales:

```js
(window.dataLayer ?? [])
  .filter((entry) => entry?.[0] === 'event')
  .map((entry) => Array.from(entry));
```

Si se dispone de una propiedad de pruebas autorizada, se puede comprobar la
recepción en **DebugView** usando un cliente marcado como dispositivo de
depuración. La presencia de una orden en `dataLayer` o una prueba con Google
simulado **no demuestra** la recepción en GA4.

## Código y pruebas

| Ruta | Función |
|---|---|
| [`src/services/AnalyticsService.ts`](src/services/AnalyticsService.ts) | Carga de Google, control de consentimiento y envío de eventos. |
| [`src/components/ui/KlaroConsent.tsx`](src/components/ui/KlaroConsent.tsx) | Configuración de Klaro, idiomas y preferencias. |
| [`src/components/home/FaqSection.tsx`](src/components/home/FaqSection.tsx) | Detecta la apertura de una pregunta. |
| [`src/views/dashboard/Dashboard.tsx`](src/views/dashboard/Dashboard.tsx) | Conecta las FAQ con el evento y el idioma activo. |
| [`src/components/home/DeckAnalyzerSection.tsx`](src/components/home/DeckAnalyzerSection.tsx) | Análisis de IA desde inicio. |
| [`src/views/deck-builder/DeckBuilder.tsx`](src/views/deck-builder/DeckBuilder.tsx) | Creación y análisis desde el constructor. |
| [`src/views/deck-viewer/DeckViewer.tsx`](src/views/deck-viewer/DeckViewer.tsx) | Duplicación de mazos. |
| [`src/__tests__/services/AnalyticsService.test.ts`](src/__tests__/services/AnalyticsService.test.ts) | Pruebas del adaptador de analítica. |
| [`src/__tests__/components/ConsentAnalyticsIntegration.test.tsx`](src/__tests__/components/ConsentAnalyticsIntegration.test.tsx) | Integración de consentimiento y eventos con Google simulado. |

Desde `mana-forge-web` se puede ejecutar:

```powershell
npx vitest run src/__tests__/services/AnalyticsService.test.ts src/__tests__/components/ConsentAnalyticsIntegration.test.tsx
```

El estado y la evidencia completa del trabajo están en
[`../docs/specs/faq-analytics-consent/tasks.md`](../docs/specs/faq-analytics-consent/tasks.md)
y [`../docs/specs/deck-analytics/tasks.md`](../docs/specs/deck-analytics/tasks.md).
