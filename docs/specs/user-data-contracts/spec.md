# Contratos y persistencia de datos de usuario

Estado: **done** (implementado y validado localmente; no desplegado). Fecha: 2026-10-17.

## Objetivo y autorización

Cerrar el recorrido registro/autenticación → MongoDB → API → web/Frontdesk,
con fechas de significado inequívoco, privacidad y escrituras seguras frente a
cambios concurrentes. Afecta a titulares de cuentas, otros usuarios y operadores.

El usuario respondió «adelante con ello» tras la revisión y la propuesta general
de separar contratos, definir fechas y proteger escrituras. Autoriza avanzar en
esta preparación; posteriormente respondió «ok» a los contratos y decisiones
concretos de este documento y del [plan](plan.md), aprobando su implementación.
No autoriza despliegues, migraciones, índices reales ni envíos de correo.

## Estado actual verificado

- `users` es una colección Mongo. `config/MongoConfig.java` selecciona `production`
  fuera del perfil de pruebas; no se ha conectado a esa base en esta revisión.
- `model/mongo/User.java` tiene `createdAt` y `lastLoginAt`, no `updatedAt` ni
  `lastSeenAt`. No hay auditoría automática de fechas configurada.
- `controller/UserController.java` fija creación en el registro local y último
  login tras validar credenciales, estado y verificación. `GET /users/me` solo lee.
- `service/OAuth2LoginSuccessHandler.java` fija ambas fechas en el alta Google y
  actualiza último login en cuentas existentes. No recupera fechas históricas.
- El historial Git sitúa la incorporación de fechas en `5c1497c`, del 2026-10-09;
  no prueba que ese commit esté desplegado.
- Frontdesk expone fechas anulables; la web principal no las recibe. El perfil 360
  calcula estadísticas desde mazos, tickets y cuota, no desde campos de `users`.
- El registro deserializa `User`: protege varios campos, pero conserva, entre
  otros, `friends` y `pendingEmail` aportados por el cliente.
- Perfil, contraseña, verificación, amistad y el runner de cifrado usan guardados
  completos; login, moderación y newsletter tienen actualizaciones parciales.
- Amigos, búsqueda, seguidores y conversaciones reutilizan `UserDto` y exponen
  email ajeno. `AuthService.register()` promete `User` pero recibe `PublicUserDto`.
- No hay índices únicos de username/email definidos en el código revisado; su
  existencia en Mongo real es desconocida, no una ausencia confirmada.

Rutas anteriores relativas a `mana-forge-api/src/main/java/com/manaforge/api/`.
Fuentes adicionales: `mana-forge-web/src/services/AuthService.ts`,
`mana-forge-web/src/core/models/User.ts`,
`mana-forge-frontdesk/src/core/domain/user.ts` y
[contrato actual de Frontdesk](../../frontdesk-api.md).

## Alcance y decisiones aprobadas

Decisiones aprobadas el 2026-10-17:

| Decisión | Propuesta |
|---|---|
| D-01: fechas | Alta inmutable, modificación del documento y último login separados. No incorporar seguimiento de actividad `lastSeenAt`. |
| D-02: exposición | Fechas en perfil propio y Frontdesk; ninguna fecha ni email en perfiles públicos/sociales. Frontdesk muestra además última modificación. |
| D-03: entrada | DTO de registro explícito. Ignorar campos ajenos al contrato sin persistirlos, conservando compatibilidad de clientes anteriores. |
| D-04: concurrencia | Actualizaciones parciales y condiciones atómicas para operaciones sensibles; no añadir una versión obligatoria a los contratos HTTP existentes. |
| D-05: histórico/operación | No inferir ni rellenar fechas. Preparar diagnóstico de solo lectura de tipos, duplicados e índices; ejecución real y cualquier corrección se separan de la implementación. |

## Fechas

Las fechas son instantes UTC: BSON Date en Mongo, ISO 8601 con zona en JSON y
`string | null` en TypeScript. La precisión garantizada es de milisegundos.

| Campo | Regla observable |
|---|---|
| `createdAt` | El servidor lo fija al crear la cuenta; no cambia en ediciones ni logins. Histórico ausente/nulo sigue desconocido. |
| `updatedAt` | Fecha de la última modificación efectiva del documento por la aplicación, incluido login, perfil, contraseña, verificación, amistad, moderación, newsletter y cifrado del email. En altas coincide con creación. En históricos se inicia con la próxima modificación real, sin inventar creación. |
| `lastLoginAt` | Último login aceptado local/Google. Alta local: nulo; alta Google: igual a creación. Nunca retrocede por escrituras concurrentes. No equivale a última visita. |
| `newsletterConsentAt` | Mantiene su significado y reglas actuales; no se usa como fecha general ni como prueba de actividad. |

Lecturas, escrituras sin cambios de datos, errores de validación y autenticaciones
rechazadas no deben actualizar estas fechas. Repetir una baja ya aplicada no es una
modificación. No se exige exactitud entre múltiples documentos/auditoría ni prueba
de que el navegador haya recibido la respuesta. No se prometen fechas para futuras
ediciones manuales en Mongo fuera de la aplicación.

## Contratos

### Registro

`POST /api/users`: `username`, `email`, `password`; opcionales `name`, `biography`,
`avatar`, `betaAccepted`, manteniendo validación/defaults de esos campos de perfil.
Username no vacío, email obligatorio con formato válido y contraseña de al menos
seis caracteres, no en blanco. No se introduce normalización global de emails,
cambio de mayúsculas/minúsculas ni modificación de identidades históricas.

Campos internos enviados, incluidos `id`, `friends`, `pendingEmail`, estado, plan,
validación, tokens, fechas y newsletter, se ignoran. El servidor crea una entidad
nueva y segura: sin amigos, sin email pendiente y sin consentimiento de newsletter.
Respuesta 201 con perfil público, sin inicio de sesión automático.

### Lecturas

| Destino | Contrato |
|---|---|
| Público y social | `userId`, `name`, `username`, `biography`, `avatar`. Sin email, amigos, tokens, consentimiento, fechas ni capacidades del titular. Incluye usuarios anidados en solicitudes y conversaciones. |
| Propio: login, `GET/PATCH /users/me` | Campos actuales de `UserDto`, incluidos `pendingEmail` y `canChangeEmail`, más `createdAt`, `updatedAt`, `lastLoginAt`, anulables. Nunca contraseña ni tokens. |
| Frontdesk | Conserva ID `id`, email autorizado, plan, estado, estadísticas y fechas existentes; añade `updatedAt` anulable. No se amplían permisos ni se añaden credenciales. |

La web tipa la respuesta de registro como perfil público; los mocks deben reproducir
esa forma. Tipar un JSON no constituye una validación de contrato: se probarán las
respuestas reales de controladores y las expectativas de los adaptadores.
Clientes nuevos toleran fechas ausentes de una API antigua como desconocidas, no
como fechas actuales. No se añade formulario de cambio de email ni otras nuevas
capacidades de edición; solo se tipa lo ya expuesto.

### Mutaciones y concurrencia

Cada operación modifica únicamente los campos de su responsabilidad. Un perfil o
una amistad no puede restaurar una contraseña, estado, fecha o consentimiento
leídos antes de un cambio concurrente. Dos altas/bajas de amigos independientes
no deben perderse por reemplazar un array leído previamente.

Las precondiciones sensibles se comprueban también al escribir: contraseña actual,
token de verificación vigente y email que el runner pretende cifrar. Una operación
obsoleta falla sin efectos ni correo de éxito; no se reintentan ciegamente correos.
Los códigos 400/401/403/404/409 existentes se conservan donde corresponda; un
conflicto concurrente sin código específico devuelve 409 `CONCURRENT_UPDATE`.
La sesión por cambio de username solo se modifica tras confirmar persistencia.

Las actualizaciones en documentos distintos (amistad bilateral, auditoría, SMTP)
siguen sin transacción global. Se conserva esa limitación y no se presenta como
consistencia exactamente-una-vez.

## Criterios de aceptación

| ID | Criterio |
|---|---|
| AC-01 | Altas local y Google guardan fechas del servidor con las reglas anteriores y ningún campo interno forjado. |
| AC-02 | Histórico sin fechas se lee sin escribir; creación sigue nula tras una edición o login; solo se inician las fechas observables nuevas. |
| AC-03 | Login aceptado actualiza último login de forma monotónica; login rechazado, sesión restaurada y lecturas no lo hacen. |
| AC-04 | Todas las rutas de escritura de `users` actualizan modificación efectiva sin alterar creación; errores y no-ops no la cambian. |
| AC-05 | Intercalaciones de perfil/login/moderación/newsletter/amistad preservan campos ajenos; contraseña/token/email obsoletos no se aplican. |
| AC-06 | Respuestas públicas/sociales, incluidas anidadas, excluyen email y datos privados, manteniendo navegación y relaciones existentes. |
| AC-07 | Registro, perfil propio y Frontdesk tienen tipos/mocks alineados con la API; fechas nuevas/ausentes/nulas y capacidades existentes se manejan correctamente. |
| AC-08 | Frontdesk presenta creación, modificación y último login, distinguiendo desconocido; labels nuevas en ambos idiomas y sin exponer fechas a terceros. |
| AC-09 | Se prepara diagnóstico sin PII de tipos/fechas, duplicados e índices; se informa si no se ejecuta. No se afirma unicidad sin evidencia de la base. |
| AC-10 | Regresiones, permisos y límites de esta spec quedan documentados con evidencia; ningún despliegue, índice real, backfill ni SMTP real sin autorización específica. |

Escenarios principales: alta local seguida de verificación/login (AC-01/03);
cuenta histórica seguida de lectura/edición (AC-02/04); copia de perfil anterior a
una suspensión o baja de newsletter (AC-05); búsqueda de otra cuenta y detalle de
conversación (AC-06); API antigua sin `updatedAt` (AC-07/08).

## Fuera de alcance

- Recuperar fechas de ObjectId, auditoría o backups; migrar documentos o corregir
  identidades/duplicados; crear índices en entornos reales.
- Nuevas fechas de verificación/contraseña/moderación o tracking de páginas/actividad.
- Rediseñar linking de Google, sesiones, CSRF, cifrado determinista de emails,
  entrega SMTP, roles, cuotas, facturación o la API de mazos.
- Cambiar preferencias de marketing o inferir consentimiento de datos antiguos.

Referencias: [arquitectura](../../../ARCHITECTURE.md), especialmente cifrado de
email y consistencia de Frontdesk; [proceso SDD/TDD](../../spec-driven-development.md).

## Aprobación

El 2026-10-17, el usuario respondió «ok» a la presentación de esta spec y plan,
aprobando D-01–D-05 y las fases P-1–P-4. P-5 permite preparar diagnóstico, no acceder
a producción o modificar datos/índices. Despliegue y efectos externos no autorizados.

## Entrega

P-1–P-4 completadas localmente. Evidencia y límites en `tasks.md`. P-5 preparada en
`docs/user-data-contracts.md`, sin ejecutar contra una base real; no se afirma que
los índices, datos históricos ni versión desplegada estén comprobados.
