# Profile Username & Email Editing — Design Spec

**Goal:** Permitir que usuarios locales editen **username** y soliciten cambio de **email** desde Profile, sin romper el login por sesión. Para usuarios Google OAuth, el **email queda bloqueado**.

## Contexto
- Auth es **session-based**.
- Login local guarda el `principal` como **username**.
- Login Google usa `OAuth2User` y el email de Google (en claro) se encripta para buscar el usuario en DB.
- Actualmente el Profile bloquea inputs de `username` y `email`, y el backend (`PATCH /api/users/me`) solo permite `biography`, `avatar`, `betaAccepted`.

## Requisitos funcionales

### 1) Cambiar username (usuarios locales y Google OAuth)
- En Profile, permitir editar `username`.
- Backend debe validar:
  - `username` no vacío
  - `username` único (si existe otro usuario con ese username → 409)
- Al cambiar el username de un usuario **local**, la sesión debe seguir funcionando:
  - El backend debe actualizar el `SecurityContext` / sesión para que el `principal` pase a ser el nuevo username.
- Para usuarios **Google OAuth**, el username **sí** se puede cambiar, pero no hace falta tocar el `principal` (permanece como `OAuth2User`).

### 2) Cambiar email (usuarios locales) con verificación previa + password
- En Profile, el email actual se muestra, pero el cambio se inicia desde **Security** mediante un **modal**.
- El cambio **no se aplica inmediatamente**.
- Para iniciar el cambio, el usuario local debe proporcionar su **password actual**.
- Flujo:
  1. Usuario abre modal “Cambiar email” e ingresa `newEmail` + `currentPassword`.
  2. Backend valida password actual.
  3. Backend guarda `pendingEmail` (encriptado) + genera `verificationToken`.
  4. Backend envía un email de verificación al **nuevo email**.
  5. Usuario hace click en link `/verify-email?token=...`.
  6. Backend `GET /api/users/verify?token=...` aplica el cambio: `email = pendingEmail`, limpia `pendingEmail`, limpia token. (`validated` queda/permanece `true`).
- Backend debe validar:
  - `newEmail` formato básico (mismo enfoque que registro)
  - `newEmail` único (si ya existe otro usuario con ese email → 409)
  - si `newEmail` es igual al actual → 200 sin cambios (no generar token)

### 3) Bloquear cambio de email para usuarios Google OAuth
- Si el usuario no tiene contraseña local (actualmente `password == ""` en usuarios Google), el backend debe rechazar cambios de email:
  - `PATCH /api/users/me` con `newEmail` → **403** (mensaje exacto no crítico, pero consistente).
- Frontend debe mostrar el email como no editable (y el modal deshabilitado u oculto) cuando el backend indique que no se puede cambiar.

### 4) DTO / UI feedback
- `GET /api/users/me` y `PATCH /api/users/me` deben retornar suficiente info para la UI:
  - `canChangeEmail: boolean` (true solo para usuarios locales con password no vacío)
  - `pendingEmail?: string` (en claro, para mostrar “pendiente de verificación”)
- En Profile > Security, si hay `pendingEmail`, mostrar aviso: “Te enviamos un email a X para confirmar el cambio.”

## Cambios de API

### PATCH `/api/users/me`
- Request body (parcial):
  - `username?: string`
  - `newEmail?: string`
  - `currentPassword?: string` (requerido si viene `newEmail`)
  - `biography?: string`
  - `avatar?: string`
  - `betaAccepted?: boolean`
- Respuestas:
  - 200 con `UserDto`
  - 401 si no autenticado
  - 403 si email-change bloqueado (OAuth)
  - 409 si colisión de username/newEmail

### GET `/api/users/verify?token=...`
- Si el usuario asociado al token tiene `pendingEmail`:
  - aplica email-change (`email = pendingEmail`)
  - limpia `pendingEmail` y token
  - retorna 200
- Si no hay `pendingEmail`:
  - comportamiento actual: verificar cuenta (`validated=true`, token=null)

> Nota frontend: como `/profile` es ruta protegida, `VerifyEmail.tsx` debe redirigir condicionalmente según haya sesión.

## Persistencia
- Mongo `users` añade campo nuevo:
  - `pendingEmail?: string` (encriptado con `EmailEncryptionService`)

## Seguridad / no-regresiones
- Cambiar username debe mantener navegación y llamadas posteriores a `/api/users/me` sin provocar 401.
- Para Google OAuth no se altera el email, para evitar duplicación de cuenta.

## Tests
- Backend:
  - `PATCH /api/users/me` actualiza username (local) y mantiene sesión (segunda llamada a `/me` funciona con el mismo session).
  - `PATCH /api/users/me` actualiza username (OAuth) sin romper `/me`.
  - `PATCH /api/users/me` con `newEmail` en usuario OAuth devuelve 403.
  - `PATCH /api/users/me` con `newEmail` en usuario local **requiere** `currentPassword`, guarda `pendingEmail` y dispara envío email.
  - `GET /api/users/verify` aplica `pendingEmail` si existe.
- Frontend:
  - `Profile.tsx` permite editar username.
  - Security: botón abre **modal** de cambio de email (new email + current password).
  - UI bloquea email-change cuando `canChangeEmail=false`.
  - `VerifyEmail.tsx` redirige condicional: con sesión → `/profile?verified=true`, sin sesión → `/login?verified=true`.
