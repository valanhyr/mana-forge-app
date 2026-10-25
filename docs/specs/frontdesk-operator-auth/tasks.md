# Tareas: autenticación de operadores de Frontdesk

Estado: **in-progress**. Fases 1 y 2 (backend) implementadas y verificadas con pruebas\nautomáticas. Fase 3 (frontend) y fase 4 pendientes.

Aprobación: «ok, adelante» tras presentar spec y plan (fase 1) y «ok» a empezar la fase 2\ntras resolver las decisiones 1, 4 y 5 (sesión propia en Mongo; origen único `mana-forge.com`;\nfases 2 y 3 se despliegan juntas). Alcance ejecutado: **fases 1 y 2**.
La fase 3 (frontend) y la 4 siguen sin ejecutar.

| Tarea | Criterio | Estado | Evidencia |
|---|---|---|---|
| T-01 Entidad, repositorios, índices | AC-01 (parcial, la barrera llega en T-07) | Hecho | Clases de modelo y repositorios sin lógica; ejercitados por `OperatorAuthServiceTest`. Índices `frontdesk_operators.email` único y TTL de desafíos en `scripts/mongodb/frontdesk-indexes.js`, **sin ejecutar** en ninguna base. TDD: no aplicable a una clase de datos. |
| T-02 Bloqueo por intentos y mensajes genéricos | AC-06 (sin límite por IP ni Turnstile, ver T-10) | Hecho | Rojo: no compilaba (clases inexistentes). Verde: 16 tests en `OperatorAuthServiceTest`. |
| T-03 Login con contraseña y desafío de un solo uso | AC-02 | Hecho | Mismo ciclo; el desafío se guarda solo como SHA-256 y caduca a los 5 min. |
| T-04 Verificación TOTP | AC-03 | Hecho | Rojo: `TotpService` inexistente. Verde: 6 tests con vectores del RFC 6238, deriva ±1, sin reutilizar paso. |
| T-05 Enrolamiento y códigos de recuperación | AC-04, AC-05 | Hecho | El secreto solo se guarda tras un código válido, cifrado con AES-GCM (`TotpSecretCipherTest`, 5 tests, rojo previo confirmado). 10 códigos hasheados, de un solo uso. |
| T-06 Sesión propia, filtro y logout | AC-07 | Hecho | `OperatorSessionServiceTest` 10 tests (inactividad 30 min, límite absoluto 8 h, revocación al deshabilitar/bloquear/borrar operador, hash en reposo); `OperatorSessionFilterTest` 4; `OperatorAuthControllerTest` 8 (cookie `HttpOnly`/`Secure`/`SameSite=Strict`/`Path=/api/frontdesk`, logout). Tests escritos antes que el código, pero el rojo de este grupo no se ejecutó de forma aislada salvo `OperatorAuthControllerTest` (no compilaba) y `OperatorSessionServiceTest`. |
| T-07 Cadena de seguridad separada y CSRF | AC-01, AC-08 | Hecho | Cadena `@Order(1)` sin sesión servlet; CSRF derivado de la cookie. `FrontdeskOperatorChainTest` 6 y `OperatorCsrfTokenRepositoryTest` 5. Rojo real: el test de CSRF destapó que `CsrfAuthenticationStrategy` sustituye el token tras autenticar; `generateToken` devuelve ahora el derivado. |
| T-08 `OperatorPrincipal` en servicios consumidores | AC-11 | Hecho | Tickets, emails, usuarios, newsletter, anuncios, despachadores y auditoría migrados; los despachadores revalidan `activeOperator` antes de cada envío. `FrontdeskAccessService` es solo de operadores y la resolución de cuenta pública pasó a `AccountAccessService` (que rechaza tokens de operador). Tests existentes actualizados a `OperatorPrincipal`; `DeckFlowIntegrationTest` usa la colección nueva. |
| T-09 Frontend | AC-12 | Pendiente | — |
| T-10 Turnstile, rate limit por IP | AC-06, AC-09 | Pendiente | — |
| T-11 Auditoría y redacción de logs | AC-10 | Pendiente | — |
| T-12 Script de alta y reset; retirar `FRONTDESK_OPERATOR_IDS` | AC-01 | Parcial | `FRONTDESK_OPERATOR_IDS` retirada del código y de `application.yaml`. El script de alta/reset sigue pendiente (el operador actual se creó a mano en 3T). |
| T-13 Documentación | todos | Parcial | `ARCHITECTURE.md` (sección Backoffice Frontdesk) actualizado. Faltan `docs/frontdesk-api.md` y los README. |

## Validación ejecutada (fase 1)

| Comando | Resultado |
|---|---|
| `.\mvnw.cmd test -Dtest=OperatorAuthServiceTest,TotpServiceTest,TotpSecretCipherTest` | 27 tests, 0 fallos |
| `.\mvnw.cmd test` (con mis cambios) | 442 tests, **1 fallo**: `FeedbackControllerTest.submitFeedback_withoutAuth_returns401` (esperado 401, recibido 200) |
| `.\mvnw.cmd test -Dtest=FeedbackControllerTest` en árbol limpio (cambios en stash) | **Mismo fallo**: es previo y ajeno a este trabajo |

Nada de lo implementado está conectado todavía: ningún controlador ni cadena de
seguridad usa `OperatorAuthService`, así que **el comportamiento de acceso actual no ha
cambiado**.

## Validación ejecutada (fase 2)

| Comando | Resultado |
|---|---|
| `.\mvnw.cmd test` completo | 485 tests, **1 fallo**: el previo `FeedbackControllerTest.submitFeedback_withoutAuth_returns401` |
| `OperatorLoginFlowIntegrationTest` (contexto completo, Mongo embebido, cookies y filtros reales) | 5 tests: login+TOTP+cookie, CSRF, logout, replay de TOTP, bloqueo, revocación al deshabilitar, cookie falsa |

Hallazgos durante la fase 2: `FrontdeskAccessService` hacía además de resolutor de usuarios
públicos (usado por `AccountAccessService` y `WebConfig`); se separó para que un token de
operador no pueda resolverse nunca como cliente. `with(csrf())` de spring-security-test
sustituye el repositorio CSRF del contexto compartido, por lo que los tests del CSRF derivado
viven en su propia clase/contexto.

## ⚠ No desplegar la fase 2 sola

El frontend actual (`mana-forge-frontdesk`) sigue haciendo login contra `/api/users/login` y
Google, que **ya no autentican `/api/frontdesk/**`**. Con solo la API nueva, Frontdesk queda
inaccesible. Fases 2 y 3 deben salir juntas, con `FRONTDESK_TOTP_KEY` definida y el
TOTP del operador enrolado en el primer acceso. Rescate si falla: restablecer el documento
del operador en `frontdesk_operators` con 3T.

Antes del despliegue (todo requiere confirmación aparte): ejecutar los índices de
`scripts/mongodb/frontdesk-indexes.js`, definir `FRONTDESK_TOTP_KEY`, y revisar que el
proxy sirve la cookie con `Secure` (HTTPS) en `mana-forge.com`.
## Decisiones tomadas durante la fase 1

- **Cifrado del secreto TOTP (decisión 2):** no se reutiliza `EmailEncryptionService`
  (AES-ECB determinista, sin IV ni autenticación). Se usa `TotpSecretCipher`
  (AES-256-GCM, IV aleatorio) con clave propia `FRONTDESK_TOTP_KEY` (Base64 de 32
  bytes). Sin la variable, los beans de login no se crean y no hay acceso de operador.
- **Librería TOTP (decisión 3):** implementación RFC 6238 con el JDK, sin dependencia nueva.
- Variables nuevas: `FRONTDESK_TOTP_KEY`, `FRONTDESK_LOGIN_MAX_ATTEMPTS` (5),
  `FRONTDESK_LOCK_MINUTES` (15).

## Limitaciones y riesgos conocidos

- El contador de fallos es lectura-modificación-escritura sobre un documento: intentos
  verdaderamente paralelos pueden contarse de menos. El límite por IP de T-10 lo acota.
- El enrolamiento TOTP sigue abierto a quien conozca la contraseña hasta que el operador
  lo complete (ver spec).
- `FRONTDESK_TOTP_KEY` debe generarse y guardarse como secreto antes de la fase 2;
  perderla invalida todos los TOTP enrolados.

## Bloqueos y autorizaciones pendientes

- Decisiones 1 (almacén de sesión), 4 (dominio / `SameSite`) y 5 (orden de despliegue)
  antes de empezar la fase 2.
- Confirmar el estado real del documento ya insertado en `frontdesk_operators` (campos
  `email` en minúsculas, `status: "ACTIVE"`, `passwordHash`).
- Ejecutar los índices en la base real requiere confirmación aparte.
- Fallo previo `FeedbackControllerTest` por investigar, ajeno a este trabajo.
