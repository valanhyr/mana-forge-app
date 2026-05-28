# Profile Username & Email Editing — Design Spec

**Goal:** Permitir que usuarios locales editen **username** y soliciten cambio de **email** desde Profile, sin romper el login por sesión. Para usuarios Google OAuth, el **email queda bloqueado**.

## Contexto
- Auth es **session-based**.
- Login local guarda el `principal` como **username**.
- Login Google usa `OAuth2User` y el email de Google (en claro) se encripta para buscar el usuario en DB.
- Actualmente el Profile bloquea inputs de `username` y `email`, y el backend (`PATCH /api/users/me`) solo permite `biography`, `avatar`, `betaAccepted`.

## Requisitos funcionales

### 1) Cambiar username (usuarios locales)
- En Profile, permitir editar `username`.
- Backend debe validar:
  - `username` no vacío
  - `username` único (si existe otro usuario con ese username → 409)
- Al cambiar el username de un usuario **local**, la sesión debe seguir funcionando:
  - El backend debe actualizar el `SecurityContext` / sesión para que el `principal` pase a ser el nuevo username.

### 2) Cambiar email (usuarios locales) con verificación previa
- En Profile, permitir editar `email`.
- El cambio **no se aplica inmediatamente**.
- Flujo:
  1. Usuario solicita cambio de email.
  2. Backend guarda `pendingEmail` (encriptado) + genera `verificationToken`.
  3. Backend envía un email de verificación al **nuevo email**.
  4. Usuario hace click en link `/verify-email?token=...`.
  5. Backend `GET /api/users/verify?token=...` aplica el cambio: `email = pendingEmail`, limpia `pendingEmail`, limpia token, deja `validated=true`.
- Backend debe validar:
  - email formato básico (se usa el mismo enfoque que registro si aplica)
  - email único (si ya existe otro usuario con ese email → 409)
  - si el email solicitado es igual al actual → no hacer nada.

### 3) Bloquear cambio de email para usuarios Google OAuth
- Si el usuario no tiene contraseña local (actualmente `password == ""` en usuarios Google), el backend debe rechazar cambios de email:
  - `PATCH /api/users/me` con `email` → 400 `"Email change not allowed for OAuth accounts"` (mensaje exacto no crítico, pero consistente).
- Frontend debe mostrar el input `email` como disabled cuando el backend indique que no se puede cambiar.

### 4) DTO / UI feedback
- `GET /api/users/me` y `PATCH /api/users/me` deben retornar suficiente info para la UI:
  - `canChangeEmail: boolean` (true solo para usuarios locales con password no vacío)
  - `pendingEmail?: string` (en claro, para mostrar “pendiente de verificación”)
- En Profile, si hay `pendingEmail`, mostrar aviso: “Te enviamos un email a X para confirmar el cambio.”

## Cambios de API

### PATCH `/api/users/me`
- Request body (parcial):
  - `username?: string`
  - `email?: string`
  - `biography?: string`
  - `avatar?: string`
  - `betaAccepted?: boolean`
- Respuestas:
  - 200 con `UserDto`
  - 400 si email-change bloqueado (OAuth)
  - 409 si colisión de username/email

### GET `/api/users/verify?token=...`
- Si el usuario asociado al token tiene `pendingEmail`:
  - aplica email-change (`email = pendingEmail`)
  - limpia `pendingEmail` y token
  - retorna 200
- Si no hay `pendingEmail`:
  - comportamiento actual: verificar cuenta (`validated=true`, token=null)

## Persistencia
- Mongo `users` añade campo nuevo:
  - `pendingEmail?: string` (encriptado con `EmailEncryptionService`)

## Seguridad / no-regresiones
- Cambiar username debe mantener navegación y llamadas posteriores a `/api/users/me` sin provocar 401.
- Para Google OAuth no se altera el email, para evitar duplicación de cuenta.

## Tests
- Backend:
  - `PATCH /api/users/me` actualiza username y mantiene sesión (segunda llamada a `/me` funciona con el mismo session).
  - `PATCH /api/users/me` con email en usuario OAuth devuelve 400.
  - `PATCH /api/users/me` con email en usuario local guarda `pendingEmail` y dispara envío email.
  - `GET /api/users/verify` aplica `pendingEmail` si existe.
- Frontend:
  - `Profile.tsx` permite editar y enviar payload ampliado.
  - UI bloquea email cuando `canChangeEmail=false`.
