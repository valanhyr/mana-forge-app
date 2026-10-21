# Plan: comunicados globales de servicio

- Estado: `draft`, pendiente de aprobación.
- Referencia: [spec](spec.md) y [tareas](tasks.md).
- Método: TDD por tarea (test rojo comprobado, mínimo para pasar, refactor en verde).

## Enfoque

Reutilizar el patrón de newsletter (campaña persistida + ejecutor asíncrono + envío por
destinatario) con política de elegibilidad y de plantilla propias. No se modifica el
comportamiento de newsletter.

## Backend (`mana-forge-api`)

1. **Modelo y repositorio.** `AnnouncementCampaign` (documento Mongo) y
   `AnnouncementCampaignRepository`, con el mismo estado y los mismos contadores que
   `NewsletterCampaign`.
2. **Elegibilidad.** `AnnouncementService.eligible(User)` según D-01 y
   `recipients(query, tier, page, size)`, con la misma búsqueda y el mismo filtro de tier que
   `NewsletterService.subscribers`, sin filtro de consentimiento.
3. **Categorías.** Extender `FrontdeskEmailService` con un canal `sendAnnouncement`, sin
   cabecera de baja, y validar `ANNOUNCEMENT` frente a `BROADCAST` y operativo (AC-04).
   Corregir las pruebas que dependen de la condición actual `BROADCAST != unsubscribeUrl`.
4. **Campaña y ejecutor.** `AnnouncementCampaignService` (validación, idempotencia por
   `campaignId`) y `AnnouncementDispatcher` (recarga operador y destinatario antes de cada
   envío, uno por destinatario, sin reintentos). Ejecutor propio o `newsletterExecutor`
   compartido: decidir en T-04.
5. **Cuerpo.** Añadir el pie fijo de aviso de servicio en es/en (D-05).
6. **Controlador.** Rutas de `/api/frontdesk/announcements` en `FrontdeskController`, con
   `requireOperator`.
7. **Configuración.** Sin variables nuevas salvo que T-04 decida un ejecutor propio, y en
   ese caso con `${ENV_VAR:default}`.

## Frontend (`mana-forge-frontdesk`)

1. Dominio y puerto: tipos `AnnouncementPayload`, `AnnouncementCampaign`, y los métodos del
   puerto de email.
2. Adaptadores HTTP y mocks, y hooks en `use-emails`.
3. Componente `AnnouncementComposer` (solo plantillas `ANNOUNCEMENT`) y la pestaña en
   `EmailOutreachView`, con aviso «no es newsletter», selección, estado e historial.
4. Cadenas es/en.

## Directus

Crear plantillas de categoría `ANNOUNCEMENT` en `email_templates`. No requiere cambio de
esquema: `category` ya es un string libre. Se hace a mano, fuera de este plan.

## Documentación

Actualizar `docs/frontdesk-api.md` con el contrato y `ARCHITECTURE.md` con la separación entre
newsletter y comunicado y su razón.

## Validación

- `.\mvnw.cmd test` en `mana-forge-api`; la suite base es de 374 tests y no debe regresar.
- `npx vitest run`, `npm run lint` y `npx tsc --noEmit` en `mana-forge-frontdesk`.
- Validación manual con SMTP de pruebas, sin entrega real.

## Fuera de este plan

Despliegue, migración de datos y permisos de Directus: se confirman por separado.
