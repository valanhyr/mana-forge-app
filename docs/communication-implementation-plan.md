# Plan de implementación: comunicación, chat y tickets

Fecha: 2026-10-10.

Estado: **propuesto, pendiente de implementación**. Este documento registra el plan;
las casillas no implican que una funcionalidad ya esté disponible.

## Objetivo

Cerrar el circuito completo:

**Usuario pide ayuda → Frontdesk detecta la consulta → operador responde por el canal
correcto → usuario recibe aviso → ambos pueden continuar → caso resuelto y trazable.**

Mantener las conversaciones de soporte basadas en tickets, separadas del chat entre
amigos. Usar refresco periódico inicialmente; WebSockets no son necesarios para
resolver los bloqueos actuales.

## Restricciones

- Leer `ARCHITECTURE.md` y `docs/frontdesk-api.md` antes de cambiar comunicación,
  permisos, controles de abuso o correo.
- No conceder acceso a tickets por coincidencia de email. Conservar la propiedad por
  usuario y la visibilidad explícita de los tickets existentes.
- Mantener notas internas separadas de respuestas públicas, avisos y correos.
- Conservar sesión, autorización de operadores, CSRF y controles de abuso existentes.
- No publicar plantillas ni tokens de Directus; usar políticas privadas.
- Distinguir aceptación SMTP de entrega al buzón. No reintentar automáticamente
  envíos con resultado incierto.
- No tratar persistencia de respuesta, auditoría y SMTP como una transacción indivisible.
- No enviar pruebas a destinatarios reales ni aplicar migraciones destructivas.
- Añadir textos nuevos en español e inglés y respetar accesibilidad y uso móvil.

## Diagnóstico que motiva el plan

- Contacto crea tickets no visibles al cliente; una respuesta guardada desde Frontdesk
  no envía correo y puede no llegar a la persona.
- Frontdesk no refresca periódicamente los tickets cuando el cliente escribe.
- El primer chat entre amigos carece de una entrada clara: se ocultan conversaciones
  sin mensajes y Amigos no ofrece iniciar un mensaje.
- La ficha de usuario no conecta acciones de correo, creación de tickets y seguimiento.
- Correo e historial de tickets están separados en la interfaz.
- El contador de mensajes de la web no contempla respuestas de soporte.
- Faltan filtros por responsable, recordatorios y una consulta completa de urgentes.
- El feedback del banner se guarda por separado y no llega a una bandeja de Frontdesk.

La revisión original fue de código y pruebas, no una validación visual completa en
navegador. Se ejecutaron 18 pruebas de web, 70 de Frontdesk y 35 de backend, todas
correctas; esas pruebas no cubren todos los recorridos propuestos.

## Fase 1. Canales explícitos y respuestas visibles

Prioridad: **crítica**.

Artefactos de la fase: [spec](specs/support-communication-channels/spec.md),
[plan](specs/support-communication-channels/plan.md) y
[tareas](specs/support-communication-channels/tasks.md).
Estado: **in-progress**, aprobación e inicio confirmados por el usuario el 2026-10-10.
Implementación y pruebas automatizadas registradas en tareas; revisión visual/manual
pendiente. Docker local actualizado con autorización posterior del usuario (API y
Frontdesk saludables, conexiones existentes conservadas). Sin cambios de permisos,
migraciones adicionales ni publicación de imágenes; evidencia y autorización en tareas.

### Tareas

- [ ] Definir y añadir al contrato del ticket origen, visibilidad para el usuario y
  canales disponibles: conversación web y/o correo.
- [ ] Definir compatibilidad para tickets antiguos sin inventar su origen ni cambiar
  su visibilidad actual.
- [ ] Mostrar en Frontdesk si el usuario puede leer la conversación en la web.
- [ ] Identificar claramente contactos sin acceso a la conversación web.
- [ ] Para esos contactos, no presentar guardar una respuesta como comunicación
  efectiva; ofrecer responder por correo.
- [ ] Mantener la acción de nota interna inequívoca y separada.

### Archivos principales

- `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/SupportTicket.java`
- `mana-forge-api/src/main/java/com/manaforge/api/dto/FrontdeskDtos.java`
- `mana-forge-api/src/main/java/com/manaforge/api/service/SupportTicketService.java`
- `mana-forge-frontdesk/src/core/domain/ticket.ts`
- `mana-forge-frontdesk/src/components/tickets/TicketDetail.tsx`
- `mana-forge-frontdesk/src/components/tickets/ReplyBox.tsx`

### Criterios de aceptación

- [ ] El operador sabe dónde llegará la respuesta antes de enviarla.
- [ ] Ninguna coincidencia de email concede acceso a una conversación.
- [ ] Tickets antiguos y notas internas mantienen sus garantías de privacidad.

## Fase 2. Inicio fácil de soporte y chat

### Tareas

- [ ] Añadir acceso visible «Ayuda / Soporte» en navegación de escritorio y móvil.
- [ ] Dirigir a usuarios identificados a `/messages/support`; ofrecer a visitantes
  iniciar sesión o usar `/contact`.
- [ ] Recomendar soporte autenticado desde Contacto cuando haya sesión.
- [ ] Mostrar confirmación de creación de ticket con enlace a la conversación.
- [ ] Añadir «Enviar mensaje» en Amigos y «Nueva conversación» en Mensajes.
- [ ] Permitir elegir amigos aunque todavía no haya mensajes.
- [ ] Añadir acciones concretas a los estados vacíos.
- [ ] Evitar duplicados al pulsar Enter repetidamente y resultados antiguos al cambiar
  de conversación.

### Archivos principales

- `mana-forge-web/src/components/layout/Layout.tsx`
- `mana-forge-web/src/views/contact/Contact.tsx`
- `mana-forge-web/src/views/messages/Inbox.tsx`
- `mana-forge-web/src/views/messages/Support.tsx`
- `mana-forge-web/src/views/messages/Messages.tsx`
- `mana-forge-web/src/views/friends/Friends.tsx`
- `mana-forge-api/src/main/java/com/manaforge/api/controller/MessageController.java`

### Criterios de aceptación

- [ ] Soporte se encuentra desde cualquier página sin conocer una URL.
- [ ] Se puede iniciar el primer chat sin copiar IDs ni escribir URLs manualmente.
- [ ] El acceso al chat conserva las reglas de amistad y autenticación.

## Fase 3. Usuario, tickets y correo conectados en Frontdesk

### Tareas

- [ ] Añadir a la ficha del usuario: ver tickets, crear consulta, enviar correo y ver
  actividad.
- [ ] Conectar un formulario de creación al endpoint existente de tickets.
- [ ] Añadir `userId` a los filtros de tickets del frontend.
- [ ] Desde un ticket, permitir abrir la ficha, preparar correo y consultar envíos
  asociados.
- [ ] Pasar `ticketId` al compositor y rellenar destinatario y macros conocidas:
  `user.name`, `ticket.id`, `ticket.subject`.
- [ ] No inventar valores para variables desconocidas; mantener el contenido editable.
- [ ] Conservar contexto y borradores al cambiar de vista, sin mezclar usuarios o tickets.
- [ ] Incorporar navegación mediante URL para enlaces directos y Atrás/Adelante.

### Archivos principales

- `mana-forge-frontdesk/src/App.tsx`
- `mana-forge-frontdesk/src/views/UsersView.tsx`
- `mana-forge-frontdesk/src/views/TicketsView.tsx`
- `mana-forge-frontdesk/src/views/EmailOutreachView.tsx`
- `mana-forge-frontdesk/src/components/users/User360View.tsx`
- `mana-forge-frontdesk/src/components/emails/EmailComposer.tsx`
- `mana-forge-frontdesk/src/core/ports/ticket-repository.port.ts`
- `mana-forge-frontdesk/src/infrastructure/api/http-repositories.ts`

### Criterios de aceptación

- [ ] Desde un usuario o ticket se puede contactar y consultar historial sin copiar datos.
- [ ] Los correos preparados desde un ticket conservan su referencia y destinatario.
- [ ] Cambiar de persona o cerrar sesión no reutiliza datos privados del contexto anterior.

## Fase 4. Actualización automática y mensajes no leídos

### Tareas

- [ ] Refrescar periódicamente conversación, lista y contadores en Frontdesk.
- [ ] Actualizar al volver a la pestaña y pausar consultas periódicas cuando esté oculta.
- [ ] Evitar consultas solapadas y sobrescrituras por resultados antiguos.
- [ ] Registrar lectura de mensajes públicos de soporte para usuario y operador.
- [ ] Excluir notas internas del contador de novedades del usuario.
- [ ] Mostrar indicadores de novedades en navegación y listas.
- [ ] Añadir actualización manual y estado de última sincronización.
- [ ] Desplazar al último mensaje solo si la persona ya estaba al final.

### Archivos principales

- `mana-forge-frontdesk/src/hooks/use-tickets.ts`
- `mana-forge-frontdesk/src/App.tsx`
- `mana-forge-web/src/views/messages/Support.tsx`
- `mana-forge-web/src/views/messages/Messages.tsx`
- `mana-forge-web/src/components/layout/Layout.tsx`
- Contratos, modelo y servicios de soporte de `mana-forge-api`.

### Criterios de aceptación

- [ ] Una respuesta aparece automáticamente en la conversación visible.
- [ ] Existe un indicador fiable de novedades públicas pendientes de leer.
- [ ] Actualizar no borra borradores ni interrumpe la lectura de mensajes anteriores.

## Fase 5. Correo y conversación integrados de forma segura

### Tareas

- [ ] Ofrecer acciones explícitas: responder en web, responder en web y avisar por correo,
  responder por correo para contactos sin acceso web.
- [ ] Asociar el envío al ticket y mostrarlo en su cronología.
- [ ] Distinguir respuesta guardada, envío pendiente, aceptación SMTP y fallo/resultado
  incierto.
- [ ] Incluir en avisos a usuarios registrados un enlace a la conversación, sin notas
  internas ni credenciales.
- [ ] Introducir identificadores de operación y deduplicación para no duplicar respuesta
  ni envío al repetir una petición.
- [ ] Persistir intención antes de SMTP y definir recuperación de escrituras parciales.
- [ ] No reintentar automáticamente resultados inciertos.
- [ ] Indicar en el correo dónde continuar hasta que exista recepción integrada.

### Archivos principales

- `mana-forge-api/src/main/java/com/manaforge/api/service/FrontdeskEmailService.java`
- `mana-forge-api/src/main/java/com/manaforge/api/service/SupportTicketService.java`
- `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/EmailDelivery.java`
- Contratos y repositorios de envío y soporte de `mana-forge-api`.
- Componentes de ticket, compositor e historial de `mana-forge-frontdesk`.
- `ARCHITECTURE.md` y `docs/frontdesk-api.md` para las garantías y limitaciones.

### Criterios de aceptación

- [ ] Cada contacto queda vinculado al caso y a su resultado de envío.
- [ ] Un fallo SMTP no borra la respuesta ni causa reenvíos silenciosos.
- [ ] Repetir una operación no duplica mensajes ni envíos confirmados.
- [ ] No se presenta aceptación SMTP como entrega efectiva o lectura del correo.

**Fuera de esta fase:** recepción de respuestas por email. Requiere un diseño posterior
de proveedor, autenticidad, asociación a tickets y protección frente a abuso; no debe
anunciarse como disponible antes de implementarlo.

## Fase 6. Seguimiento operativo y cierre

### Tareas

- [ ] Añadir vistas: mis tickets, sin asignar, pendientes del equipo, esperando al usuario.
- [ ] Permitir cambiar prioridad, reasignar y retirar asignación.
- [ ] Añadir próximo seguimiento y lista de vencidos.
- [ ] Consultar urgentes desde el backend, no filtrar únicamente la primera página.
- [ ] Separar última actividad pública y última respuesta del usuario de notas y cambios
  administrativos; no sustituir esos datos con `updatedAt`.
- [ ] Añadir acciones claras de responder y resolver/cerrar respetando el resultado del
  canal elegido.
- [ ] Diseñar bandeja de feedback o conversión manual a ticket, sin convertir sugerencias
  anónimas en conversaciones identificadas automáticamente.
- [ ] Completar traducciones y revisar móvil y navegación por teclado.

### Criterios de aceptación

- [ ] Se identifica quién debe actuar, sobre qué caso y cuándo.
- [ ] Los urgentes antiguos no desaparecen por quedar fuera de la primera página.
- [ ] Notas internas o reasignaciones no ocultan la antigüedad de una petición pendiente.
- [ ] Resolución, cierre y reapertura tienen reglas visibles y coherentes en ambos clientes.

## Validación por fase

- [ ] Usuario crea ticket → operador lo detecta → responde → usuario lo recibe.
- [ ] Contacto anónimo → operador responde por correo → envío queda asociado al caso.
- [ ] Primer chat entre amigos y envío posterior.
- [ ] Notas internas nunca visibles al cliente ni incluidas en avisos.
- [ ] Fallos de red, sesión expirada, concurrencia, cambio de conversación y doble envío.
- [ ] Seguimiento y urgentes fuera de la primera página.
- [ ] Pruebas de componentes, contratos API y recorridos con servicios simulados.
- [ ] Validación visual en navegador de escritorio y móvil, incluida navegación por teclado.

Comandos disponibles, ejecutados desde cada servicio:

```powershell
# Backend
.\mvnw.cmd test

# Web
npx vitest run
npm run lint
npx tsc --noEmit

# Frontdesk
npx vitest run
npx tsc --noEmit
npm run build
```

Frontdesk no tiene script `lint` actualmente; no documentarlo ni llamarlo como disponible
sin añadir su configuración previamente. Los correos de pruebas deben usar mocks o un
servidor SMTP de pruebas, nunca destinatarios reales.

## Orden de entrega y despliegue

1. Fases 1–4: resolver bloqueos de canal, entrada, navegación y actualización.
2. Fase 5: completar correo asociado, avisos y recuperación segura.
3. Fase 6: seguimiento, responsables, cierre y feedback.

Entregar cambios pequeños con pruebas y documentación actualizada. Validar cada fase
en Docker local antes de producción. Revisar cualquier cambio de datos y su compatibilidad
por separado; no cambiar políticas públicas de Directus ni ejecutar migraciones
destructivas como parte de un despliegue rutinario.
