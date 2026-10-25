# Autenticación de operadores de Frontdesk (colección propia + TOTP)

Estado: **in-progress** (aprobada la fase 1; fases 2 a 4 pendientes de decisiones).

## Problema y objetivo

Frontdesk autentica operadores con el login público de usuarios (`POST /api/users/login`
o Google) y los autoriza con una lista de IDs de `users` en `FRONTDESK_OPERATOR_IDS`.
El backoffice envía correos, banea usuarios y lee datos personales. Comprometer una
cuenta de cliente (phishing, recuperación, bug en registro o en Google login) basta
para operar, y no hay segundo factor.

Objetivo: que solo exista una identidad de operador **separada** de los usuarios
públicos, con contraseña + TOTP obligatorio, sesión propia de vida corta y defensa
contra fuerza bruta. Un operador (el propietario). Sin allowlist de IP: el operador se
conecta desde IP variables.

## Estado actual verificado

Rutas relativas a `mana-forge-api/src/main/java/com/manaforge/api/` y
`mana-forge-frontdesk/src/`.

- `config/SecurityConfig.java:63-66`: `/api/frontdesk/**` se autoriza con
  `FrontdeskAccessService.isOperator(authentication)`; una sola `SecurityFilterChain`
  compartida con la API pública, sesión `IF_REQUIRED`, CSRF exigido en
  `/api/frontdesk/**`.
- `service/FrontdeskAccessService.java`: resuelve el `User` de la sesión (local u
  OAuth2), exige id en `frontdesk.operator-ids`, estado `ACTIVE` y `validated`.
  `requireOperator` devuelve `User`; lo usan `FrontdeskController` (10 puntos),
  `SupportTicketService.assign` (`operatorById`), `NewsletterDispatcher` y
  `AnnouncementDispatcher` (revalidan `isOperator(User)` antes de cada envío).
- `controller/UserController.java:274`: login local con BCrypt, sin límite de
  intentos ni segundo factor; registra `USER_LOGIN` en auditoría.
- `application.yaml:48-56`: cookie de sesión global `HttpOnly`, `Secure`,
  `SameSite=None` (necesario hoy para Frontdesk en otro subdominio).
- Frontdesk (`views/SessionGate.tsx`, `infrastructure/api/http-repositories.ts:139-151`)
  hace login con usuario/contraseña a `/users/login` y ofrece Google.
- La colección `frontdesk_operators` existe en Mongo con un documento creado a mano
  (email, `passwordHash` BCrypt, `status`, campos TOTP vacíos). **Los nombres de campo
  quedan fijados por esta spec**; el documento actual debe ajustarse si difiere.

## Alcance

- Colección `frontdesk_operators` como única fuente de identidad de operador.
- Login `email + contraseña` y segundo paso TOTP; enrolamiento TOTP en el primer
  acceso con códigos de recuperación de un solo uso.
- Sesión de operador independiente de la sesión de usuario público.
- Bloqueo temporal por intentos fallidos, mensajes de error genéricos, Turnstile en
  el login.
- Auditoría de login, fallos, bloqueos, enrolamiento y uso de códigos de recuperación.
- Retirar de Frontdesk el login de usuario normal y Google, y retirar
  `FRONTDESK_OPERATOR_IDS` del control de acceso.

## No objetivos

- Varios operadores, roles o UI de gestión de operadores (el alta es manual/script).
- Passkeys/WebAuthn (candidato a fase posterior).
- Allowlist de IP, VPN o Cloudflare Access (se pueden añadir fuera de la app).
- Migrar o reescribir historial: los `operatorId` ya guardados en tickets y auditoría
  apuntan a IDs de `users` y se muestran como legado.
- Recuperación de contraseña por correo (el operador la restablece con el script).

## Requisitos y criterios de aceptación

- **AC-01** Un `User` público, aunque esté en `FRONTDESK_OPERATOR_IDS`, no puede
  acceder a `/api/frontdesk/**` (401/403). Un operador no puede usar endpoints
  autenticados públicos con su sesión de operador.
- **AC-02** `POST /api/frontdesk/auth/login` con credenciales correctas y TOTP
  habilitado no crea sesión: devuelve un desafío de un solo uso y caducidad corta.
  Sin sesión no se accede a ningún endpoint privado.
- **AC-03** `POST /api/frontdesk/auth/totp` con desafío válido y código correcto
  (ventana ±1 paso de 30 s, sin reutilizar el mismo paso) crea la sesión. Un código
  incorrecto, caducado, reutilizado o un desafío ya consumido devuelve 401 genérico.
- **AC-04** Si `totpEnabled=false`, tras contraseña correcta solo se permite el
  enrolamiento: se emite secreto y URI `otpauth://`; al confirmar un código válido se
  habilita TOTP, se muestran 10 códigos de recuperación **una sola vez** (se guardan
  hasheados) y se crea la sesión. El secreto se guarda cifrado.
- **AC-05** Un código de recuperación válido sustituye al TOTP una sola vez y se
  invalida; queda auditado.
- **AC-06** Tras 5 fallos consecutivos (contraseña o TOTP) la cuenta se bloquea
  15 minutos (`lockedUntil`), incluso con credenciales correctas. La respuesta no
  distingue «usuario inexistente», «contraseña errónea» ni «bloqueado». Además hay
  límite por IP.
- **AC-07** La sesión de operador usa una cookie propia, `HttpOnly`, `Secure`, con
  caducidad por inactividad (30 min) y absoluta (8 h), se rota al autenticar y se
  invalida en `POST /api/frontdesk/auth/logout`. Deshabilitar el operador
  (`status=DISABLED`) invalida sus sesiones activas en la siguiente petición.
- **AC-08** Las mutaciones siguen exigiendo `X-CSRF-TOKEN`.
- **AC-09** El login exige un token Turnstile válido (mismo mecanismo que el formulario
  de contacto); sin él se rechaza antes de tocar contraseñas.
- **AC-10** Auditoría: eventos de login correcto, fallo, bloqueo, enrolamiento, uso de
  recuperación y logout, sin registrar contraseñas, códigos ni secretos. Los logs de
  petición ya redactan cookies y `X-CSRF-TOKEN`; añadir el nombre de la cookie nueva.
- **AC-11** Los flujos existentes de Frontdesk (tickets, emails, newsletter,
  anuncios, usuarios) funcionan con el operador de la nueva colección como actor, y
  los despachadores siguen revalidando que el operador está activo antes de cada envío.
- **AC-12** Frontdesk muestra login de correo/contraseña, paso TOTP/recuperación y
  enrolamiento; elimina el enlace de Google y el login contra `/users/login`.

## Escenarios (Dado / Cuando / Entonces)

1. Dado un operador activo con TOTP, cuando envía contraseña correcta y luego un código
   válido, entonces recibe sesión y `GET /api/frontdesk/me` responde 200.
2. Dado el mismo operador, cuando envía contraseña correcta y un código erróneo, entonces
   401 genérico, sin sesión y `failedAttempts` +1.
3. Dado un usuario público listado en `FRONTDESK_OPERATOR_IDS`, cuando abre Frontdesk con su
   sesión de cliente, entonces 401.
4. Dado un operador con 5 fallos, cuando envía credenciales correctas, entonces 401 genérico
   hasta pasados 15 minutos.
5. Dado `totpEnabled=false`, cuando se autentica con contraseña, entonces solo puede
   completar el enrolamiento y no accede a datos privados antes.
6. Dado un operador con sesión, cuando `status` pasa a `DISABLED`, entonces la siguiente petición
   devuelve 401.

## Privacidad y seguridad

- Hash de contraseña BCrypt (compatible con el existente); códigos de recuperación
  hasheados; secreto TOTP cifrado con la clave de `EmailEncryptionService` o una clave
  propia (decisión pendiente).
- Comparaciones en tiempo constante; respuesta con coste similar si el email no existe
  (hash ficticio) para evitar enumeración.
- **Riesgo conocido de enrolamiento:** mientras `totpEnabled=false`, quien conozca la
  contraseña puede enrolar su propio TOTP. Mitigaciones: enrolar inmediatamente tras
  desplegar, Turnstile y bloqueo por intentos. Alternativa descartada por ahora:
  generar el secreto TOTP en el script de alta.

## Decisiones pendientes (bloquean el plan)

1. **Almacén de sesión del operador**: sesión servlet existente (una sola cookie, no
   separable) vs token opaco propio con almacén dedicado (cookie independiente).
   El plan propone token opaco propio.
2. **Clave de cifrado del secreto TOTP**: reutilizar `EMAIL_ENCRYPTION_KEY` o variable nueva.
3. **Librería TOTP**: dependencia nueva vs implementación RFC 6238 con JDK.
4. **Cookie y origen (resuelta):** web, API y Frontdesk comparten origen `mana-forge.com` (`/api`, `/frontdesk`, `/directus`). La cookie de operador es `SameSite=Strict` y `Path=/api/frontdesk`; no hace falta CORS para Frontdesk. Riesgo asumido: un XSS en la web pública podría usar la sesión del operador desde el mismo origen; se mitiga con CSP estricta y reautenticación TOTP para acciones de alto impacto (fase 4).

## Aprobación

Aprobado («ok, adelante») para ejecutar la **fase 1** del plan. Fases 2 a 4 a la espera
de las decisiones 1, 4 y 5. Decisiones 2 y 3 resueltas durante la fase 1: ver
`tasks.md` (clave propia `FRONTDESK_TOTP_KEY` con AES-GCM; TOTP con el JDK).
