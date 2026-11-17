# Analítica de acceso, contacto y errores

**Estado: aprobado para implementación.** Esta propuesta responde a la petición de ampliar la analítica de login, registro, contacto, mazos y errores. El usuario aprobó la spec y el plan, incluida la medición aproximada de Google y la semántica general de verificación. Despliegue y cambios externos siguen sin aprobarse.

## Objetivo

Medir interacciones y fallos observables desde la web para entender el uso y detectar fricciones, sin identificar a personas ni enviar contenido escrito por usuarios. Las cifras de GA4 son parciales: dependen del consentimiento, de la disponibilidad de la etiqueta y de bloqueadores.

## Situación comprobada

- `AnalyticsService.ts` ya controla el consentimiento y contiene `faq_open`, `deck_created`, `deck_cloned`, `ai_analysis_started` y `ai_analysis_finished`. Este último ya distingue `success`, `fallback` y `error`; no se propone otro evento para el mismo fallo de análisis.
- En el informe GA4 de los últimos 30 días consultado durante esta conversación no aparecieron eventos de mazos o IA. Esto no demuestra por sí solo si están desplegados, si no hubo actividad o si las acciones no fueron registradas.
- El login local y el registro comparten `Login.tsx`, usado como página y modal. El registro local crea la cuenta pero no inicia sesión; el email se verifica después.
- `VerifyEmail.tsx` usa el mismo endpoint tanto para verificar una cuenta como para confirmar un cambio de email. La respuesta no distingue los dos casos; no debe interpretarse toda verificación como nuevo registro.
- Google vuelve mediante una redirección del backend. La restauración de sesión no indica por sí sola si acaba de producirse un login de Google ni si se creó una cuenta nueva.
- El constructor puede fallar antes de guardar mientras obtiene puntuaciones; el fallo visible de la operación no equivale necesariamente a un fallo del endpoint de guardado.
- Contacto distingue un 403 y requiere conservar intactos Turnstile, el honeypot, los tiempos de relleno y el rate limit. Una respuesta exitosa significa que la API aceptó la solicitud, no que un correo se entregara.
- `NotFound.tsx` representa la ruta genérica 404. Faro se inicializa solo si existe `VITE_FARO_URL`; no se ha verificado su estado ni la protección de datos en producción.

## Contrato propuesto

Todos los eventos son observaciones del navegador, no registros operativos exactos. Cada acción se emite como máximo una vez por resultado o navegación observada; repetir realmente la acción puede producir otro evento. No se encolan ni se reproducen acciones anteriores al consentimiento o a la disponibilidad de Google.

| Evento | Momento | Parámetros permitidos | Interpretación |
|---|---|---|---|
| `registration_started` | La persona cambia explícitamente a la pestaña de registro. | Ninguno. | Apertura del formulario, no intento enviado ni usuario único. |
| `sign_up` | La API confirma la creación de una cuenta mediante formulario local. | `method=local` | Cuenta creada, no email verificado ni sesión iniciada. No incluye altas de Google. |
| `email_verification_completed` | La API confirma la verificación de un email desde la pantalla correspondiente. | Ninguno. | Incluye verificaciones de registro y cambios de email; no es una conversión exclusiva de registro. |
| `login` | El login local se confirma; para Google, únicamente una vuelta de flujo explícita con sesión confirmada y las limitaciones descritas abajo. | `method=local` o `google` | Inicio de sesión observado, no restauración de sesión ordinaria. Un primer acceso con Google también puede crear la cuenta. |
| `contact_submitted` | `ContactService.send` termina correctamente. | Ninguno. | Solicitud aceptada por la API; no prueba de entrega de correo. |
| `deck_list_copied` | `navigator.clipboard.writeText` termina correctamente en el visualizador. | Ninguno. | Copia completada, sin contenido ni identificador de mazo. |
| `page_not_found` | Se muestra la ruta genérica 404. | Ninguno. | Una visualización por navegación, sin ruta solicitada. No cubre cada recurso inexistente de rutas válidas. |
| `deck_save_failed` | La operación de guardar o actualizar muestra su error tras fallar una petición o preparación en el flujo. | Ninguno. | Error del flujo de guardado, incluida la obtención de puntuaciones; no necesariamente error de la API de mazos. No incluye validación local. |
| `contact_submit_failed` | La petición de contacto falla tras pasar la validación del formulario. | Ninguno. | Fallo o rechazo observado; no afirma una causa. No incluye validación local ni detalles del anti-spam. |

### Google OAuth: limitación aceptada

Se propone identificar el retorno de Google **solo como estimación**: guardar en `sessionStorage` una marca sin datos personales al iniciar expresamente el flujo con consentimiento, consumirla una sola vez al regresar y exigir que la comprobación de sesión confirme un usuario autenticado. La marca debe caducar, eliminarse ante retirada del consentimiento o cancelación y no generar un evento si falta consentimiento o la etiqueta no está lista. No almacenar tokens, IDs, contenido de usuario ni eventos pendientes.

Esto no demuestra de forma absoluta que la sesión se creara mediante ese retorno: otra pestaña u otra autenticación concurrente pueden influir. Nunca se emitirá `sign_up` de Google ni se tratará una restauración normal como login. Si se necesitan cifras exactas o distinguir las altas de Google, hace falta estudiar una señal del servidor y una aprobación adicional; queda fuera de esta propuesta.

## Criterios de aceptación

- **AC-01 — Consentimiento:** sin consentimiento, tras retirarlo o sin etiqueta disponible no se envían eventos nuevos ni se reproducen más tarde; los flujos siguen funcionando si la analítica falla. La marca opcional de Google tampoco se crea sin consentimiento y se elimina al retirarlo.
- **AC-02 — Privacidad:** solo se envían los eventos y valores de la tabla. No enviar emails, nombres, IDs, IP, contraseñas, tokens, textos, listas de cartas, mensajes de error, URL o rutas solicitadas como parámetros nuevos. Seguir saneando rutas y títulos; no describir GA4 como anónimo. La recogida automática de Google/Faro debe revisarse por separado.
- **AC-03 — Registro y login local:** evento de apertura solo al cambiar explícitamente a registro; `sign_up` y `login` solo tras éxito confirmado, tanto en página como en modal. No emitir ante validación o fallo; la restauración de sesión no es un login.
- **AC-04 — Verificación:** un único evento por éxito confirmado del endpoint y ninguno por token ausente, inválido o petición fallida. No incluir ni conservar el token; no interpretar el evento como alta nueva. Cubrir remounts y React Strict Mode sin duplicar la medición.
- **AC-05 — Google:** la medición aproximada cumple las condiciones y limitaciones de la decisión pendiente; no provoca cambios en el backend ni crea eventos de alta. Probar éxito, cancelación, caducidad, sesión preexistente, recarga, retirada de consentimiento y fallo de Google.
- **AC-06 — Contacto y copia:** un evento por envío aceptado o por fallo de petición, excluyendo validación local; un evento por copia completada, ninguno por rechazo del portapapeles. No alterar los controles antiabuso, respuestas, UX ni correos.
- **AC-07 — Errores y métricas existentes:** `page_not_found` registra la vista genérica sin rutas y evita duplicados artificiales por Strict Mode; `deck_save_failed` cubre el fallo visible de toda la operación pero no validaciones. Se conserva `ai_analysis_finished` sin duplicar sus fallos ni modificar caché, cuotas o Turnstile.
- **AC-08 — Documentación y validación:** documentar semántica, límites, privacidad y posibles dimensiones personalizadas; actualizar la información local de consentimiento si corresponde y dejar constancia de la revisión legal pendiente. Cubrir casos de éxito, fallo, consentimiento y duplicados con pruebas; simular Google para validación local. No afirmar recepción real sin comprobarla.

## Fuera de alcance

No cambiar la autenticación, los contratos de la API, los controles antiabuso, el envío de correo, cuotas o caché. No modificar la configuración de GA4, Faro ni Grafana; no añadir captura genérica de excepciones o mensajes a GA4. No enviar datos a una propiedad real ni desplegar sin autorización separada. No deducir eventos históricos ni prometer cifras exactas de registros, logins o entregas.

## Decisiones para aprobar

1. Aceptada la medición **aproximada** del login de Google descrita arriba.
2. Aceptado `email_verification_completed` como verificación general, que también puede incluir cambios de email, sin presentarlo como registro completado.

## Aprobación

El usuario respondió «ok» tras presentar esta spec y su plan, señalando expresamente las dos limitaciones. La aprobación incluye la implementación; no incluye despliegue ni cambios de GA4, Faro u otros servicios externos.
