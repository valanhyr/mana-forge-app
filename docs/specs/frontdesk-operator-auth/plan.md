# Plan: autenticación de operadores de Frontdesk

Estado: **in-progress** (fase 1 implementada). Spec: `docs/specs/frontdesk-operator-auth/spec.md`.

## Diseño

- **Entidad** `FrontdeskOperator` en `model/mongo/` (`@Document("frontdesk_operators")`):
  `id`, `email` (único, minúsculas), `passwordHash`, `totpSecretEncrypted`,
  `totpEnabled`, `lastTotpStep`, `recoveryCodeHashes`, `status`
  (`ACTIVE|DISABLED`), `failedAttempts`, `lockedUntil`, `lastLoginAt`, `createdAt`.
  Repositorio `FrontdeskOperatorRepository`.
- **Paquete** `com.manaforge.api.frontdesk` con servicios de login, TOTP, sesión y
  bloqueo. El código público no lo importa.
- **Sesión propia**: cookie `MF_OPERATOR` con token opaco aleatorio (256 bits). Se
  guarda solo su hash en `frontdesk_operator_sessions` (índice TTL por caducidad,
  `lastSeenAt` para inactividad). Un filtro dedicado resuelve el token y crea la
  autenticación; no depende de la sesión servlet.
- **Cadena de seguridad separada** `@Order(1)` con `securityMatcher("/api/frontdesk/**")`:
  autenticación solo por el filtro de operador, CSRF activo, sin `oauth2Login`. La
  cadena actual queda para el resto y deja de contener la regla de Frontdesk.
- **Desafío intermedio**: token opaco de un solo uso y 5 min guardado hasheado
  (colección con TTL) que enlaza contraseña verificada con el segundo paso.
- **Actor operador**: `requireOperator` pasa a devolver un `OperatorPrincipal`
  (`id`, `email`/nombre visible). Hay que revisar en la fase 2 cada servicio que hoy
  recibe `User operator` (tickets, emails, campañas, anuncios, usuarios, auditoría,
  asignación) y cambiarlo a `OperatorPrincipal`. `operatorById` valida contra la nueva
  colección; los despachadores revalidan `ACTIVE` con el repositorio nuevo.
- **Endpoints** bajo `/api/frontdesk/auth/`: `login`, `totp`, `recovery`,
  `enroll/start`, `enroll/confirm`, `logout`. `GET /me` y `GET /csrf` se mantienen.
- **Turnstile y rate limit**: reutilizar el servicio existente de contacto
  (verificar su API antes de usarlo, ver `ARCHITECTURE.md`).
- **Alta/reset**: script en `scripts/` para crear o restablecer contraseña del
  operador y resetear TOTP, ejecutado a mano con la URI de Mongo en entorno.
- **Config**: `FRONTDESK_SESSION_IDLE_MINUTES:30`, `FRONTDESK_SESSION_MAX_HOURS:8`,
  `FRONTDESK_LOGIN_MAX_ATTEMPTS:5`, `FRONTDESK_LOCK_MINUTES:15`, patrón
  `${ENV_VAR:default}`. Se elimina `FRONTDESK_OPERATOR_IDS` al final.

## Alternativas

- *Sesión servlet con otro nombre*: no es posible con una sola cookie servlet; se
  descarta.
- *JWT*: dificulta revocar inmediatamente; con un operador, una tabla de sesiones
  es más simple y revocable.
- *Servicio separado*: descartado en la conversación; ver aislamiento por paquete.

## Fases

1. **Identidad y TOTP (backend)**: entidad, repositorio, bloqueo, login, desafío, TOTP
   y recuperación, enrolamiento. Pruebas unitarias y de servicio.
2. **Sesión, cadena de seguridad y actor**: filtro, cadena `@Order(1)`, cookie,
   logout, `OperatorPrincipal` y migración de servicios consumidores. Pruebas de
   integración MockMvc (AC-01, 07, 08, 11).
3. **Frontend**: `SessionGate` con login, TOTP, recuperación y enrolamiento; quitar
   Google y `/users/login`; actualizar mocks y tests.
4. **Endurecimiento y cierre**: Turnstile, rate limit por IP, auditoría y redacción de
   logs, script de alta, retirar `FRONTDESK_OPERATOR_IDS`, actualizar
   `ARCHITECTURE.md`, `docs/frontdesk-api.md` y READMEs.

Cada fase es entregable por separado; la fase 2 es la que cambia la barrera de acceso.

## Estrategia de pruebas

TDD por tarea: prueba roja que falla por el motivo previsto, código mínimo, verde,
refactor. Backend: JUnit + MockMvc (`./mvnw test`; `-Dtest=` por clase). TOTP con reloj
inyectable para probar ventana y reutilización. Frontend:
`npx vitest run`, `npx tsc --noEmit`; el paquete no tiene script `lint` (verificar).

## Compatibilidad y recuperación

- Entre fases 2 y 4 hay que mantener un único modo de acceso para no dejar Frontdesk
  inaccesible: el despliegue de la fase 2 y la 3 deben salir juntos, o la API acepta
  ambos mecanismos hasta que el frontend nuevo esté publicado (decisión al aprobar).
- Si se pierde el TOTP y los códigos de recuperación: el script resetea
  `totpEnabled` (requiere acceso a Mongo).
- Tickets y auditoría existentes conservan IDs de `users`; se muestran como legado.

## Seguridad

Sin secretos en repo; el hash de la contraseña viene del script. Revisión de logs para
que no aparezcan contraseña, códigos ni cookie. Despliegue, cambio de variables en
producción y creación del documento real requieren confirmación aparte.

## Aprobación

Pendiente.
