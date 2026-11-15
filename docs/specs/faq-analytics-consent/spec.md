# Analítica de FAQ y consentimiento

**Estado: implementado; pendiente de revisión legal y de validación contra Google real.** Esta funcionalidad es independiente de la integración de FAQ con Directus en `../home-faq/`; esa extensión excluía expresamente eventos y cambios de consentimiento. El usuario aprobó implementar Klaro y después el evento de FAQ en conversación con «ok».

## Objetivo y alcance

Medir en Google Analytics 4 la apertura de preguntas frecuentes, utilizando los códigos estables de tema y pregunta, sin enviar los textos ni datos personales. Antes de que Google Analytics se cargue o reciba eventos, solicitar consentimiento para estadísticas mediante Klaro, alojado con la aplicación. Mantener el funcionamiento y accesibilidad actuales de la FAQ.

Estado actual comprobado: `mana-forge-web/index.html` carga `gtag.js` y lo configura sin esperar consentimiento; `src/components/layout/Layout.tsx` realiza seguimiento de navegación; `src/components/ui/CookieConsent.tsx` guarda preferencias en `localStorage`, pero no controla la carga de Google y `handleSavePreferences` solo cierra la vista. `FaqSection.tsx` abre preguntas mediante botón accesible y recibe códigos como IDs. Klaro no está instalado. No se ha comprobado el estado de una propiedad GA4 real.

## Requisitos y criterios de aceptación

- **AC-01:** Sustituir el banner actual por Klaro, con interfaz en español e inglés, aceptación, rechazo y preferencias accesibles. Las estadísticas están desactivadas por defecto; no considerar un cierre, ausencia de elección o valor anterior como consentimiento nuevo. Permitir consultar y modificar la elección posteriormente. La ventana de novedades espera a que se resuelva el aviso para no bloquearlo.
- **AC-02:** Con consentimiento de estadísticas ausente o rechazado, Google Analytics no se carga y no se realizan peticiones de analítica a Google, ni siquiera mediciones sin cookies. Se propone Consent Mode básico, no avanzado. Los servicios necesarios para la sesión y la protección Turnstile no deben quedar bloqueados.
- **AC-03:** Cuando se aceptan estadísticas, cargar GA una sola vez y reanudar el seguimiento de páginas del SPA sin duplicar la primera visualización ni enviar visitas de antes de la aceptación. Con consentimiento válido guardado, restaurar la configuración al iniciar la web.
- **AC-04:** Cuando se retira el consentimiento, detener nuevos eventos y vistas de página en esa misma sesión y evitar nueva escritura de cookies de analítica. Gestionar la retirada de cookies de GA del dominio donde sea técnicamente posible; no prometer cancelar peticiones ya enviadas ni borrar cookies inaccesibles de terceros. Los cambios se conservan tras recargar.
- **AC-05:** Al abrir una pregunta FAQ con ratón o teclado y con estadísticas aceptadas, enviar un evento GA4 `faq_open` con `faq_code`, `faq_topic` y `faq_language` (`es` o `en`). Una reapertura posterior cuenta como otro evento; cerrar una pregunta, cambiar de pestaña o renderizar no envía ese evento. No enviar el texto de la pregunta o respuesta, IDs de usuario, email ni otros datos personales.
- **AC-06:** Sin consentimiento, con GA ausente, bloqueado o con error, no se envía el evento y la FAQ sigue funcionando sin error. No acumular eventos anteriores al consentimiento para enviarlos después.
- **AC-07:** La implementación permite cambiar o retirar consentimiento sin alterar la sesión, el selector de idioma ni el uso de Turnstile. Mantener sin cambios Grafana Faro y su política actual; su clasificación legal debe revisarse por separado, sin afirmar que el uso sin cookies excluye obligaciones de privacidad.
- **AC-08:** Documentar en `tasks.md` las pruebas automáticas y manuales y cualquier limitación. Una prueba con mocks no demuestra que GA4 haya recibido un evento; comprobar DebugView solo si existe acceso autorizado a una propiedad de pruebas.
- **AC-09:** No enviar parámetros de consulta ni fragmentos de las URL en las vistas de página ni en el contexto de los eventos; sanear también la URL de referencia antes de enviarla. Esta decisión pierde el desglose por parámetros y fue aprobada expresamente por el usuario para evitar filtrar posibles tokens.

## Escenarios

1. Dado un visitante nuevo, cuando entra y abre una FAQ sin aceptar, entonces no se carga la etiqueta de Google y no se registra ningún evento.
2. Dado que ha aceptado estadísticas, cuando abre una FAQ con `faq_code=what-can-i-do` y `faq_topic=general`, entonces se envía `faq_open` con esos códigos y el idioma activo. Al cerrarla no se envía otro evento.
3. Dado que ha aceptado, cuando retira el consentimiento y abre otra FAQ o navega, entonces no se envían nuevos eventos o páginas y al recargar la decisión sigue vigente.
4. Dado que cambian las traducciones, los códigos permanecen estables y se sigue midiendo la misma FAQ sin enviar su texto.

## Exclusiones y decisiones

No añadir seguimiento de clics en pestañas, backend de analítica, datos personales, cambios en Directus, Google Ads ni configuración remota de GA4 sin autorización separada. No modificar Turnstile, el inicio de sesión ni la configuración de Faro. El antiguo `cookie_consent` no se migrará como aceptación automática; se pedirá una nueva elección. El evento y sus parámetros pueden requerir registrar dimensiones personalizadas en GA4 para informes; ese ajuste externo no se realizará sin autorización.

No se declara cumplimiento legal por instalar una herramienta. Se corrigieron los textos locales ES/EN que afirmaban que continuar navegando implica consentimiento y se añadió información sobre Google Analytics. Revisar textos, categorías y base legal con quien corresponda antes del despliegue. La configuración de Google y el comportamiento del script real requieren validación independiente.

## Aprobación

**Aprobado:** el usuario respondió «ok» a la propuesta explícita de implementar Klaro y después el evento de apertura, tras presentar esta spec y su plan. Después eligió «Omitir parámetros» al advertirle de la pérdida de desglose por URL y aprobó cambiar `language` por `faq_language`, para no confundir el campo propio de Google con el idioma elegido en la aplicación. Despliegue, modificaciones en Google Analytics y pruebas contra datos reales necesitan confirmación separada.
