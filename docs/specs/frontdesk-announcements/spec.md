# Comunicados globales de servicio desde Frontdesk

- Estado: `draft`, pendiente de aprobación del spec y del plan.
- Fecha: 2026-10-21.
- Artefactos: [plan](plan.md) y [tareas](tasks.md).
- Decisiones confirmadas por el usuario el 2026-10-21 («me parece todo genial»), sobre las
  propuestas D-01–D-07 de abajo. **No** es aprobación de implementación: falta aprobar este
  spec y el plan.

## Problema y objetivo

Un operador puede enviar un correo individual (`POST /api/frontdesk/emails`) o una newsletter
a usuarios con consentimiento (`POST /api/frontdesk/newsletter/campaigns`). No puede enviar un
aviso de servicio (cambio de términos, mantenimiento, incidencia de seguridad) a varios
usuarios seleccionados que no consintieron newsletter. Objetivo: un canal propio, el
**comunicado**, que no es newsletter y no puede usarse para promoción.

## Comportamiento actual verificado

| Hecho | Evidencia |
|---|---|
| El canal operativo rechaza plantillas `BROADCAST`, y el de newsletter solo acepta `BROADCAST`. | `FrontdeskEmailService.send` |
| Newsletter exige suscripción, validación y cuenta activa; omite al resto. | `NewsletterService.eligible`, `NewsletterDispatcher` |
| Las campañas están limitadas a 100 IDs, se ejecutan en `newsletterExecutor` (no durable) y no se reintentan. | `NewsletterCampaignService`, `NewsletterDispatcher`, `ARCHITECTURE.md` |
| Los emails de usuario se guardan cifrados. | `EmailEncryptionService` |
| La selección de destinatarios en Frontdesk usa `GET /newsletter/subscribers`, que filtra por consentimiento. | `NewsletterService.subscribers`, `EmailOutreachView.tsx` |

## Decisiones aprobadas

| ID | Decisión |
|---|---|
| D-01 | Elegibles: usuarios con `validated=true` y estado `ACTIVE`, además de `active` distinto de `false`. Se excluyen `SUSPENDED` y `BANNED`. Se ignora `newsletterSubscribed`. |
| D-02 | Solo avisos de servicio. La promoción exige consentimiento y pertenece a newsletter. Frontdesk lo indica de forma visible y la política es operativa; el servidor no puede detectar el contenido. |
| D-03 | Selección por IDs reutilizando buscador y filtro de tier, con máximo 100 destinatarios por comunicado. Sin modo «todos» ilimitado. |
| D-04 | Categoría de plantilla Directus nueva: `ANNOUNCEMENT`. El servidor la valida en cada canal. |
| D-05 | Sin enlace de baja ni `List-Unsubscribe`. Pie fijo que indica que es un aviso de servicio y no una newsletter. |
| D-06 | Tercera pestaña «Comunicado» en `EmailOutreachView`, con aviso de que no es newsletter. |
| D-07 | Campaña persistida con historial y contadores enviados/fallidos/omitidos. Sin reintentos automáticos. |

## Alcance

1. Endpoint privado de selección de destinatarios elegibles (sin filtro de consentimiento).
2. Endpoint para iniciar un comunicado y consultar su estado y su historial.
3. Envío por destinatario, con comprobación de elegibilidad justo antes de cada SMTP.
4. Separación de categorías: `ANNOUNCEMENT` solo en el canal comunicado; `BROADCAST` solo en
   newsletter; el resto, en el canal operativo.
5. Pestaña de Frontdesk con selección, composición, estado e historial.

### No objetivos

- Cola durable, reintentos, deduplicación entre reinicios o garantía de entrega exacta.
- Detección del contenido promocional.
- Modo «todos los usuarios» sin límite de 100.
- Cambios en el flujo de newsletter, en tokens de baja o en datos existentes.
- Creación de plantillas o campos en Directus, y despliegue.

## Contrato

- `GET /api/frontdesk/announcements/recipients?query&tier&page&size`: usuarios elegibles según
  D-01. Devuelve `id`, `username`, `email` descifrado, `tier`, como el listado de suscriptores.
- `POST /api/frontdesk/announcements` (`202 Accepted`): `campaignId` (idempotencia, como en
  newsletter), `subject`, `body`, `templateId` opcional, `recipientIds` (1–100, sin
  duplicados). Responde con la campaña.
- `GET /api/frontdesk/announcements/{id}` y `GET /api/frontdesk/announcements`: estado y
  contadores `total`, `sent`, `failed`, `skipped`.
- Solo operadores (`FrontdeskAccessService.requireOperator`). Las rutas requieren la misma
  autenticación y CSRF que las de newsletter.

## Criterios de aceptación

| ID | Criterio |
|---|---|
| AC-01 | El listado incluye usuarios validados y activos sin consentimiento de newsletter y excluye suspendidos, baneados, no validados e inactivos. |
| AC-02 | Un comunicado no modifica `newsletterSubscribed`, `newsletterConsentAt` ni los tokens de baja. |
| AC-03 | Cada correo no lleva `List-Unsubscribe`, ni enlace de baja, y sí el pie de aviso de servicio. |
| AC-04 | Una plantilla `BROADCAST` es rechazada por el canal comunicado, y una `ANNOUNCEMENT` es rechazada por el operativo y por newsletter. |
| AC-05 | Se rechazan 0 o más de 100 IDs, IDs duplicados, asunto con saltos de línea y macros sin resolver. |
| AC-06 | Si un destinatario deja de ser elegible entre la selección y el envío, se omite y se cuenta como `skipped`. |
| AC-07 | Si el operador pierde acceso durante la campaña, esta termina en `FAILED` sin más envíos. |
| AC-08 | Un fallo SMTP cuenta `failed`, no se reintenta y no detiene al resto. Queda `EmailDelivery` y auditoría por destinatario. |
| AC-09 | Repetir el mismo `campaignId` con el mismo contenido no vuelve a enviar. Con contenido distinto responde conflicto. |
| AC-10 | Solo un operador puede listar, iniciar o consultar comunicados. |
| AC-11 | La pestaña muestra el aviso «no es newsletter», bloquea el envío con la selección vacía, mantiene el borrador ante errores y muestra contadores. |
| AC-12 | Textos en es/en. Accesible con teclado y lector de pantalla. |
| AC-13 | Newsletter y envío operativo siguen pasando su suite actual sin cambios de comportamiento. |

## Riesgos

- Un aviso a quien no consintió newsletter es defendible solo si es de servicio. Se
  recomienda validación legal (RGPD y similares) antes de usarlo en producción. No es una
  decisión de código.
- El ejecutor no es durable: un reinicio deja campañas `RUNNING` que hay que reconciliar a
  mano, igual que newsletter.
- Un comunicado con contenido promocional rompería el modelo de consentimiento. Solo lo
  mitigan la política y el aviso de la interfaz.
