# API de Frontdesk

## Alcance

La API vive en `mana-forge-api`, bajo `/api/frontdesk`. Usa las sesiones existentes
(login local o Google), MongoDB para los datos operativos y Directus para las plantillas.
No utiliza JWT ni requiere una base de datos adicional.

`mana-forge-frontdesk` utiliza adaptadores HTTP por defecto, con sesión, CSRF,
paginación y cuota diaria. Los mocks son un opt-in (`VITE_USE_MOCKS=true`), sin fallback
ante fallos de la API. El frontend no publica eventos de auditoría ni autores arbitrarios.
Newsletter usa consentimiento persistente, bajas y campañas de hasta 100 destinatarios
con ID idempotente. No existe un endpoint que simule éxito para campañas.

## Configuración

| Variable | Valor por defecto | Uso |
|---|---|---|
| `FRONTDESK_OPERATOR_IDS` | vacío | IDs de `users` autorizados, separados por comas. Vacío deniega todo acceso. |
| `FRONTDESK_URL` | vacío | Origen CORS exacto del backoffice, por ejemplo `http://localhost:5174`. |
| `FRONTDESK_CONTACT_TICKETS_ENABLED` | `true` | Guardar los contactos aceptados como tickets antes de enviar sus correos. |
| `FRONTDESK_EMAIL_TEMPLATE_COLLECTION` | `email_templates` | Nombre de la colección de Directus. |

El frontend tiene Dockerfile y servicio Compose optativo `frontdesk`. `FRONTDESK_PORT`
(5174 por defecto, bind solo a 127.0.0.1) y `FRONTDESK_IMAGE` configuran su despliegue;
no se pasan al backend. `FRONTDESK_API_URL` (`/api`) y `FRONTDESK_USE_MOCKS` (`false`)
se usan como argumentos públicos de build. Instrucciones y sesión Google entre
subdominios: `mana-forge-frontdesk/README.md`.

Se reutilizan `MONGODB_URI`, `EMAIL_ENCRYPTION_KEY`, SMTP, Redis y la configuración de
Directus (`DIRECTUS_URL`, `DIRECTUS_API_TOKEN`, con `DIRECTUS_TOKEN` como alternativa).
Los operadores deben ser cuentas verificadas y activas. La lista usa IDs persistentes,
no nombres, emails ni roles suministrados por el navegador. No hay un endpoint para
autoconcederse permisos. Los nuevos registros ignoran ID, tier, estado y fechas enviados
por el cliente.

### Sesión y CSRF

1. Autenticarse mediante el login existente. Las llamadas HTTP deben incluir credenciales.
2. Consultar `GET /api/frontdesk/me` para comprobar acceso.
3. Consultar `GET /api/frontdesk/csrf`. Devuelve `{ "headerName": "X-CSRF-TOKEN", "token": "…" }`.
4. Enviar ese token en la cabecera indicada para todos los `POST` y `PATCH` del backoffice.
   Obtener un token nuevo después de iniciar otra sesión.

La regla privada se evalúa antes del `GET /api/**` público. Las cuentas suspendidas o
baneadas no pueden iniciar sesión; sus sesiones existentes tampoco pueden usar `/api/**`
excepto para cerrar sesión. La suspensión no puede impedir que alguien use endpoints
públicos después de cerrar sesión: el visitante vuelve a ser anónimo.

## Endpoints

Todos los siguientes requieren acceso de operador. Los listados paginados devuelven
`{ items, page, size, total }`. `page` empieza en 0; `size` vale 25 por defecto y admite 1–100.

| Método | Ruta relativa a `/api/frontdesk` | Función |
|---|---|---|
| GET | `/me` | Identidad del operador, sin credenciales. |
| GET | `/csrf` | Token para mutaciones. |
| GET | `/tickets?status=&priority=&category=&userId=&query=&page=&size=` | Resúmenes sin conversación. |
| GET | `/tickets/{id}` | Ticket con conversación y notas internas. |
| POST | `/tickets` | Crear ticket. |
| POST | `/tickets/{id}/messages` | Añadir respuesta web si el cliente tiene acceso, o nota interna; no envía correo automáticamente. |
| PATCH | `/tickets/{id}/status` | Cambiar estado. |
| PATCH | `/tickets/{id}/assignee` | Asignar un operador activo/verificado de la lista. |
| GET | `/users?query=&page=&size=` | Buscar por nombre, username, ID o email exacto. |
| GET | `/users/{id}` | Perfil 360 con estadísticas y cinco mazos recientes. |
| PATCH | `/users/{id}/status` | Activar, suspender o banear; no permite autobloqueo. |
| POST | `/users/{id}/ai-quota/reset` | Reiniciar únicamente la cuota autenticada de hoy en Redis. |
| GET | `/audit?targetUserId=&action=&page=&size=` | Auditoría de solo lectura. |
| GET | `/email-templates` | Hasta 100 plantillas publicadas de Directus, traducidas según `Accept-Language`. |
| POST | `/email-templates/{id}/render` | Interpolar macros para previsualización en el idioma de `Accept-Language`. |
| POST | `/emails` | Envío individual por SMTP, en texto plano. |
| GET | `/emails?ticketId=&page=&size=` | Historial de intentos; destinatario cifrado. |
| GET | `/newsletter/subscribers?query=&tier=&page=&size=` | Solo suscritos activos/verificados; username o email exacto, plan opcional. |
| POST | `/newsletter/campaigns` | Crear una campaña, respuesta 202 con estado; no implica entrega. |
| GET | `/newsletter/campaigns/{id}` | Estado y contadores de intentos, fallos y omitidos. |
| GET | `/newsletter/campaigns?page=&size=` | Historial recuperable después de recargar la interfaz. |

No hay endpoints de edición/borrado de auditoría. El servidor deriva el actor de la
sesión; no acepta eventos arbitrarios del cliente. Las búsquedas por nombre usan texto
literal, no expresiones regulares proporcionadas por el usuario. El email cifrado solo
admite búsqueda exacta, como en la aplicación existente.

### Ejemplos de cuerpos

Crear ticket:

```json
{
  "userId": null,
  "userEmail": "customer@example.com",
  "userName": "Customer",
  "subject": "Importación del mazo",
  "category": "DECK_BUILDER",
  "priority": "MEDIUM",
  "initialMessage": "Necesito ayuda con la importación.",
  "metadata": null
}
```

Si se indica `userId`, la API obtiene nombre y email del usuario real. Para un contacto
anónimo no hace falta crear una cuenta. El formulario de contacto conserva sus controles
anti-spam y solo crea tickets después de superarlos; una dirección de contacto no prueba
la identidad del remitente.

Otros cuerpos:

```json
{ "content": "Nota para el equipo", "isInternalNote": true }
```

```json
{ "status": "WAITING_USER" }
```

```json
{ "operatorId": "ID_DEL_OPERADOR" }
```

```json
{ "status": "SUSPENDED" }
```

```json
{ "variables": { "user.name": "Customer", "ticket.id": "ticket-123" } }
```

```json
{
  "to": "customer@example.com",
  "recipientName": "Customer",
  "subject": "Tu consulta",
  "body": "Hemos revisado tu caso.",
  "templateId": null,
  "ticketId": null
}
```

Con `ticketId`, el destinatario debe coincidir con el contacto del ticket. Si se indica
`templateId`, debe existir una plantilla publicada. Las macros desconocidas permanecen
visibles en la previsualización; un cuerpo con macros sin resolver no se puede enviar.
Las notas internas no se incluyen automáticamente en ningún correo.

### Origen, visibilidad y canales de soporte

El DTO privado de ticket añade los siguientes campos en listados, detalle y respuestas
de creación/mutación. No se añaden al DTO del cliente `/api/support/**`:

| Campo | Contrato |
|---|---|
| `origin` | `SUPPORT_WEB`, `CONTACT_FORM`, `FRONTDESK` o `UNKNOWN`. El servidor fija la entrada de creación, no el canal de una respuesta. |
| `customerVisible` | Visibilidad persistida explícita; histórico ausente o nulo equivale a falso. |
| `availableChannels` | Lista sin duplicados de `WEB` y/o `EMAIL`; `[]` es válida y no implica entrega. |
| `webUnavailableReason` | `null` con `WEB`; en otro caso `NOT_CUSTOMER_VISIBLE`, `NO_OWNER`, `OWNER_NOT_FOUND`, `OWNER_INACTIVE` u `OWNER_UNVERIFIED`, por ese orden. |

`WEB` exige flag verdadero, propietario por ID y cuenta existente, activa y verificada.
No exige sesión del cliente conectada en ese momento. Se revalida al procesar respuesta
pública; el flag no se borra al suspender una cuenta ni el canal la reactiva. Los tickets
cerrados/resueltos siguen siendo consultables según las reglas actuales.

`EMAIL` indica una dirección válida del **ticket**, no disponibilidad de SMTP, existencia
del buzón, autenticidad del remitente ni entrega. No se reemplaza por otra dirección de
una cuenta. Dirección ausente/vacía/inválida excluye correo; fallo de descifrado se
propaga como error, no como disponibilidad confirmada. Se conserva el cifrado y la
comparación exacta de destinatario del endpoint de envío.

Contacto puede conservar `userId` como asociación operativa por email coincidente, pero
siempre crea con `customerVisible=false` y `origin=CONTACT_FORM`; esa coincidencia no
autentica ni publica conversación, incluso con sesión. Soporte de sesión crea
`SUPPORT_WEB`; Frontdesk crea `FRONTDESK`, con las reglas actuales de selección explícita
de cuenta por ID. Campos de capacidades/visibilidad añadidos a un cuerpo no conceden acceso.

Los documentos antiguos sin origen o con un valor no reconocido devuelven `UNKNOWN`.
No se deduce origen de mensajes/email/auditoría ni se migra al leer. Los valores de origen
no reconocidos se conservan en persistencia al editar una nota/estado. Flag explícito
verdadero y propiedad válida mantienen el acceso; el desconocimiento de origen no lo revoca.

Una respuesta no interna (`isInternalNote=false`, nulo o ausente) sin `WEB` devuelve
**409** con `code=WEB_CHANNEL_UNAVAILABLE` antes de escribir mensaje, fecha, estado
o auditoría de respuesta. No es un fallo 403 de permisos/CSRF. Las notas siguen
autorizadas y privadas, con límites y `@Version` existentes. El error concurrente mantiene
`code=CONCURRENT_UPDATE`. Ni respuesta ni nota disparan SMTP.

En Frontdesk, el detalle muestra origen, acceso web, destino y motivos. «Responder en
la web» confirma persistencia, no entrega/lectura. «Responder por correo» prepara un
compositor local de Tickets con dirección fija y `ticketId`; abrir/cancelar no escribe,
el envío explícito utiliza `/emails`, sin copiar notas, añadir respuesta web ni cambiar
estado. SMTP aceptado sigue sin confirmar entrega. No se importan respuestas por email
ni se integra su cronología en esta fase.

Si una API anterior no informa capacidades válidas, Frontdesk muestra canales no
disponibles y bloquea acciones públicas/contextuales; no las reconstruye por email/ID.
Las notas mantienen el flujo autorizado. Desplegar API antes de Frontdesk; un cliente
antiguo recibe 409 seguros al intentar responder a tickets ocultos. No hay backfill ni
cambios de políticas requeridos. Spec y evidencia: `docs/specs/support-communication-channels/`.

## MongoDB

### Bandeja de soporte del usuario

`/messages` mantiene las conversaciones entre usuarios; `/messages/support` abre soporte.
`GET /api/support/tickets` devuelve resúmenes paginados; `GET /api/support/tickets/{id}`
devuelve solo mensajes públicos. `POST /api/support/tickets` recibe
`{ subject, category, content }`; `POST /api/support/tickets/{id}/messages` recibe
`{ content }`. Requieren cuenta activa/verificada y sesión; las mutaciones también
necesitan el token de `GET /api/support/csrf`. El actor siempre procede de la sesión.
No se admite responder a tickets `CLOSED`; responder a `RESOLVED` los reabre.
Máximo 20 tickets abiertos por cuenta y límite de 10 escrituras/minuto por identidad
en memoria (no compartido entre réplicas). No se manda un email automáticamente.

El acceso exige `userId` propio **y** `customerVisible=true`. Los contactos anónimos
no obtienen ese flag por coincidencia de email; tampoco se migran automáticamente
los tickets antiguos. Crear un ticket desde Frontdesk indicando una cuenta concreta
es una asignación explícita y sí lo hace visible a esa cuenta. Las notas internas,
asignaciones y direcciones no forman parte del DTO del usuario.

### Consentimiento, baja y campañas

`users.newsletterSubscribed` empieza en `false`; el antiguo interruptor visual no
constituye consentimiento. `PATCH /api/newsletter/preference` recibe
`{ subscribed: true|false }`, exige cuenta verificada/activa y CSRF obtenido desde
`GET /api/newsletter/csrf`. Se guarda la fecha de consentimiento y un token aleatorio
cifrado para generar enlaces, con hash SHA-256 para buscarlos. Un cambio de dirección
verificado borra el consentimiento: la nueva dirección debe suscribirse explícitamente.

Los correos añaden un enlace `${FRONTEND_URL}/newsletter/unsubscribe#TOKEN` y la cabecera
`List-Unsubscribe`. El fragmento no llega a logs HTTP ni al Referer. La página pide
confirmación explícita; `POST /api/newsletter/unsubscribe` recibe `{ token }` y no exige
login. No hay mutación por GET ni implementación RFC 8058 one-click. Los tokens antiguos
dejan de funcionar cuando se concede una nueva suscripción. Una baja no afecta a emails
de cuenta/soporte. Configurar `FRONTEND_URL` al origen real de la web, también en local.

La campaña recibe `{ campaignId, recipientIds, subject, body, templateId? }`;
`campaignId` es un UUID generado por el cliente. Una repetición idéntica devuelve el
estado guardado **sin reenviar**; reutilizarlo con otro contenido/operador devuelve 409.
Se deduplican los IDs y se admite hasta 100 destinatarios; los no elegibles se omiten.
El trabajador recarga permisos del operador y consentimiento de cada destinatario
antes de enviar. Las plantillas de este canal usan `category=BROADCAST`; el canal de
emails operativos rechaza esas plantillas. Las macros deben estar ya resueltas.

Una sola tarea envía cada campaña en un executor con un trabajador y cola de 10 tareas.
La intención, contadores e historial se guardan en `newsletter_campaigns`; cada intento
SMTP se registra en `email_deliveries.campaignId`. **El executor no es una cola durable**:
un reinicio puede dejar campañas `RUNNING` sin trabajador. No se reanudan ni reintentan
automáticamente; reconciliar por ID/historial/proveedor antes de crear otra campaña.
`sent` significa aceptación SMTP; `failed` incluye resultados sin confirmar y no garantiza
que el proveedor no haya aceptado el mensaje. No hay garantía exactamente-una-vez.

No es necesario añadir columnas manualmente. Se usan:

- `support_tickets`: conversación embebida, ID, versión, contacto, estado, categoría,
  prioridad, asignación, fechas y metadatos. Límite de 500 mensajes, 8.000 caracteres
  por mensaje; control optimista para que una escritura concurrente devuelva 409 y no
  borre mensajes. La colección vacía `ticket_messages`, si ya se creó, no se utiliza
  en esta primera implementación; no hay que borrarla.
- `audit_events`: fecha, actor, usuario afectado, acción, detalles y referencias.
- `email_deliveries`: intención de envío y resultado `PENDING`, `SENT` o `FAILED`.
  Guarda destinatario cifrado y referencia SMTP, pero no el cuerpo.
- `users`: campos `tier`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`, `newsletterSubscribed`,
  `newsletterConsentAt`, `newsletterTokenHash`, `newsletterTokenEncrypted` (tokens nunca en DTOs).
- `decks`: nuevos campos `createdAt`, `updatedAt`.

Los documentos antiguos siguen siendo válidos: `active=false` equivale a suspendido si
no hay estado más específico; el tier por defecto es `FREE`. Las fechas históricas
desconocidas se devuelven como `null`: no se inventan fechas de registro. El último acceso
se registra desde el próximo login y las fechas de mazo desde la próxima creación/edición.

`users.updatedAt` registra la modificación efectiva del documento por la aplicación,
incluido login, perfil, contraseña, verificación, amistad, estado y preferencias.
No cambia por lecturas ni operaciones sin cambios. En cuentas antiguas puede existir
modificación sin creación conocida: no se infiere alta desde ObjectId ni auditoría.
Las tres fechas se exponen al titular y a Frontdesk, con `null` para desconocido;
el perfil 360 añade `updatedAt` y la vista distingue modificación de último login.
No se registra última visita/actividad con una sesión ya abierta.

El registro recibe un DTO permitido, no la entidad Mongo. Los usuarios anidados en
amigos/seguidores/conversaciones usan el perfil público sin email ni fechas privadas.
Las ediciones son parciales y las precondiciones sensibles se comprueban al escribir;
los conflictos obsoletos devuelven 409 `CONCURRENT_UPDATE`. No hay una transacción
global de amistad bilateral, auditoría y correo. Contratos y consultas preparadas
de solo lectura, sin ejecutar contra producción: [datos de usuario](user-data-contracts.md).

El perfil 360 se calcula, no se duplica en Mongo. La API devuelve `aiQueriesToday`,
`aiQuotaLimit`, `aiQuotaPeriod="DAILY"` y `aiQuotaResetsAt`. `aiQueriesThisMonth` y
`failedImportsCount` son `null` porque aún no existe telemetría histórica fiable para ellos.
La condición de PRO/PATREON no altera los límites diarios actuales ni integra cobros.

Los índices no se crean automáticamente al arrancar. El script
`scripts/mongodb/frontdesk-indexes.js` crea únicamente índices, sin borrar ni migrar
documentos. Revisarlo y aplicarlo con la conexión adecuada y una ventana de mantenimiento;
**no se ha ejecutado contra producción**.

### Consistencia y envío

La conversación y los cambios del ticket se guardan juntos mediante una versión.
La auditoría y los intentos de email se guardan en documentos independientes: no existe
una transacción Mongo entre todas las operaciones. Una caída entre escrituras puede
dejar una acción sin evento o un envío en `PENDING`; debe reconciliarse operativamente.
`SENT` significa aceptación por SMTP, no entrega en el buzón: no hay webhooks de entrega.
No reintentar automáticamente correos después de un timeout sin comprobar el proveedor;
todavía no existe garantía de envío exactamente una vez.

## Directus: colección `email_templates`

Crear estos campos (nombres exactos):

| Campo | Tipo | Uso |
|---|---|---|
| `id` | UUID o entero, clave primaria | Se devuelve como string. |
| `status` | String / desplegable | `draft`, `published`, `archived`; solo se leen `published`. |
| `title` | String | Nombre visible. |
| `category` | String | Agrupación operativa (por ejemplo `SUPPORT`); **`BROADCAST`** para newsletter. |
| `available_macros` | JSON | Array de strings, por ejemplo `["user.name", "ticket.id"]`. |
| `translations` | Relación de traducciones | Alias hacia `email_templates_translations`. |

En `email_templates_translations`:

| Campo | Tipo | Uso |
|---|---|---|
| `id` | Clave primaria | Generada por Directus. |
| `email_templates_id` | Relación M2O | Plantilla de la colección principal. |
| `languages_code` | Relación M2O a `languages.code` | Idioma, por ejemplo `es` o `en`. |
| `subject` | String | Asunto traducido; admite macros. |
| `body_template` | Text | Cuerpo traducido en texto plano; admite macros. |

La API lee `translations.languages_code`, `translations.subject` y
`translations.body_template`; ya no consulta `subject` ni `body_template` en la colección
principal. Si se migra desde el esquema sin traducciones, copiar el contenido al registro
de su idioma antes de desplegar la API.

Listado y renderizado seleccionan el idioma de mayor prioridad en `Accept-Language`,
normalizando variantes como `es-ES` a `es`. Sin cabecera se usa `en`. Si falta una
traducción completa (asunto y cuerpo no vacíos), se usa inglés y después la primera
traducción completa disponible. Asunto y cuerpo siempre pertenecen al mismo registro;
no se mezclan idiomas. Una plantilla publicada sin ninguna traducción completa produce
`502`, igual que un fallo de Directus, en lugar de devolver una lista vacía engañosa.
El contrato de respuesta de Frontdesk no cambia: `subject` y `bodyTemplate` contienen
el texto seleccionado, no un array de traducciones. Frontdesk ya envía `Accept-Language`.

Dar permiso de **lectura** al token de servicio configurado en la API mediante una
política privada: `email_templates` (incluido el alias `translations`) y
`email_templates_translations` (incluidos idioma, asunto y cuerpo). No añadir esos
permisos a la política Public, aunque el usuario del token también la tenga asignada;
eso expondría las plantillas al acceso anónimo. No incluir el token en el frontend.
Esta API no crea campos ni plantillas en tu instancia de Directus. Las plantillas se
consultan sin caché para que archivar/despublicar una plantilla tenga efecto inmediato.

## Verificación local

Desde `mana-forge-api`, en PowerShell:

```powershell
.\mvnw.cmd test
```

Las pruebas usan mocks, WireMock en localhost y MongoDB embebido con el perfil `test`.
No requieren la conexión de producción ni envían correos reales.
