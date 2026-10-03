# Profile Editability & Profile Values — TDD Implementation Plan

> **For agentic workers:** implement task-by-task. Every task follows Red → Green → Refactor. Never write implementation code before the failing test exists and has been observed failing.

**Goal:** Que en `/profile` se puedan editar **username**, **nombre visible** y **email**, y que todos los valores mostrados en el perfil reflejen datos reales del usuario en vez de literales hardcodeados o estado local volátil.

---

## 1. Diagnóstico (estado actual)

El backend **ya soporta** cambiar `username` y `email`. El frontend **nunca lo expone**. Ese es el gap raíz.

| # | Problema | Ubicación |
|---|----------|-----------|
| P1 | Inputs `username` y `email` con `disabled`, sin `onChange` | `mana-forge-web/src/views/profile/Profile.tsx:224-229` y `242-247` |
| P2 | `AuthService.updateProfile` solo acepta `{biography, avatar}` | `mana-forge-web/src/services/AuthService.ts:4-7` |
| P3 | `hasProfileChanges` no considera username/email, así que el botón Guardar nunca se activaría | `Profile.tsx:78-81` |
| P4 | `User` (TS) no declara `pendingEmail` ni `canChangeEmail` que el backend ya devuelve | `mana-forge-web/src/core/models/User.ts:1-10` |
| P5 | Cambio de email **sin `currentPassword`**: cualquiera con la sesión abierta puede tomar la cuenta | `UserController.java:258-273` |
| P6 | Email change en OAuth devuelve **400**; el spec dice **403** | `UserController.java:262-263` |
| P7 | El email nuevo no se valida por formato antes de cifrarlo/guardarlo | `UserController.java:258-273` |
| P8 | `pendingEmail` se persiste pero la UI **nunca lo muestra** | `Profile.tsx` (ausente) |
| P9 | Badge `Planeswalker` es un **literal fijo**, ni backend ni i18n | `Profile.tsx:168-170` |
| P10 | Toggle newsletter es estado local, **se pierde al recargar** | `Profile.tsx:33` y `474-482` |
| P11 | Idioma solo vive en `localStorage`, no sigue al usuario entre dispositivos | `LanguageContext.tsx:14-41` |
| P12 | Botón "Eliminar Cuenta" **no tiene `onClick` ni endpoint** | `Profile.tsx:410-412` |
| P13 | `name` nunca se rellena en registro local → plantillas de email imprimen `null` | `AuthService.ts:40` vs `EmailService.java:98,110,387` |
| P14 | `VerifyEmail` redirige siempre a `/login`, incluso con sesión activa | `VerifyEmail.tsx:23` |
| P15 | No existe ningún test de `Profile.tsx` (excluido de coverage) | `vite.config.ts:45` |

---

## 2. Decisiones tomadas

| Decisión | Valor | Motivo |
|----------|-------|--------|
| Cambio de email | **Exige `currentPassword`** | Cierra P5. El spec original (`2026-05-28-profile-username-email-design.md:55`) ya lo pedía. |
| Status OAuth para email | **403** (no 400) | Coherente con el spec; 400 sugiere error de validación del cliente. |
| Nombre del campo de request | **`newEmail` + `currentPassword`** | Renombrar desde el `email` actual evita que un cliente existente empiece a exigir password en un campo con otro nombre. |
| Badge de plan | **Campo real `plan` en `User`, solo lectura** | No hay sistema de billing. Se hace data-driven para que dejar de mentir, sin inventar pagos. Default `free`. |
| `name` vs `username` | **Ambos editables y distintos** | `name` = nombre visible. `username` = handle de login, único. |
| Eliminar cuenta | **Deshabilitado con explicación visible** | Borrado en cascada de mazos/amistades/mensajes es un proyecto aparte, fuera de alcance. No dejar un botón que no hace nada. |
| Idioma | **Se persiste en el usuario**, localStorage sigue siendo la fuente rápida | El usuario lo pidió en la tanda; se guarda en servidor y se rehidrata al cargar sesión. |

---

## 3. Modelo de datos

### `User.java` (Mongo) — añadir
```java
private Boolean newsletter = false;
private String preferredLocale;   // "es" | "en"
private String plan = "free";     // "free" | "beta"
```

### `UserDto.java` — añadir
```java
private Boolean newsletter;
private String preferredLocale;
private String plan;
```
(ya existen `pendingEmail` y `canChangeEmail`)

### `UpdateMeRequest` (UserController) — cambiar
```java
private String biography;
private String avatar;
private Boolean betaAccepted;
private String username;
private String name;             // NUEVO
private String newEmail;         // RENOMBRADO desde `email`
private String currentPassword;  // NUEVO, requerido si viene newEmail
private Boolean newsletter;      // NUEVO
private String preferredLocale;  // NUEVO
```

---

## 4. Tareas

Comandos de referencia:
- Backend: `cd mana-forge-api; ./mvnw test -Dtest=UserControllerTest`
- Frontend: `cd mana-forge-web; npm test`
- Ambos en verde antes de pasar a la siguiente tarea.

---

### Task 1 — `name` en el registro local (corrige P13) — ✅ COMPLETADA

**Estado:** Red confirmado (4 tests fallando) → Green. Backend 22/22, frontend 216/216, lint limpio, build OK.

**Desviación respecto al plan:** se añadió un test extra de frontend (`registra con nombre visible, usuario, email y contraseña`) que asserta el body completo del POST, no solo `name`.

**Nota para quien retome:** el campo `displayName` se renderiza **entre** `username` y `email` en el formulario de registro. Los tests de `Login.test.tsx` que usan índices de `getAllByRole('textbox')` en modo registro deben contar 3 textboxes en orden `username, displayName, email`. Se añadió el helper `switchToRegister()` que fija `app_locale=es` en localStorage (jsdom reporta `navigator.language=en-US`, así que sin eso los labels salen en inglés y las aserciones en español no cuadran).

**Archivos:** `AuthService.ts` (register), `Login.tsx`, `UserControllerTest.java`

- [ ] **Red** — Añadir a `AuthService.test.ts`:
  - `register sends the display name to the backend` — intercepta `POST /users` con MSW, llama `AuthService.register('newuser','a@b.com','pass','New User')`, assert body JSON contiene `"name":"New User"`.
- [ ] **Red** — Añadir a `Login.test.tsx`: `el formulario de registro pide nombre visible`.
- [ ] **Green** — Añadir parámetro `name` a `AuthService.register` y añadir el campo al body. Añadir input en el modo registro de `Login.tsx` con `t('auth.displayName')`. Añadir la clave en `labels.json` (es + en).
- [ ] **Green** — En `UserController.create`, normalizar: si `name` es blank, usar `username`.
- [ ] **Verde backend** — `UserControllerTest`: `createUser_withoutName_fallsBackToUsername` → `verify(userRepository).save(argThat(u -> "newuser".equals(u.getName())))`.
- [ ] **Refactor** — Extraer el fallback a un helper `normalizeName(String name, String username)`.

---

### Task 2 — Validación de `username` y `name` en `PATCH /me`

**Archivo:** `UserController.java`, `UserControllerTest.java`

- [ ] **Red** — `patchMe_usernameWithSpaces_returns400`
- [ ] **Red** — `patchMe_usernameTooLong_returns400` (límite 30)
- [ ] **Red** — `patchMe_usernameWithInvalidChars_returns400` (patrón `^[A-Za-z0-9_.-]{3,30}$`)
- [ ] **Red** — `patchMe_nameTooLong_returns400` (límite 60)
- [ ] **Red** — `patchMe_nameSetsDisplayName` → assert `jsonPath("$.name").value("Nuevo Nombre")`
- [ ] **Red** — `patchMe_usernameSameAsCurrent_doesNotRotateSession` → assert `userRepository.save` llamado sin recrear contexto (verificar que `securityContextRepository` no se invoca; hoy no es inyectado, usar `verifyNoInteractions` sobre un spy o comprobar que el principal sigue igual)
- [ ] **Green** — Añadir `USERNAME_PATTERN`, `MAX_USERNAME_LENGTH`, `MAX_NAME_LENGTH`. Validar en el bloque `req.getUsername() != null`. Añadir bloque `req.getName() != null`.
- [ ] **Refactor** — Extraer `validateUsername(String)`.

> Nota: el registro (`create`) hoy **no** valida formato de username. Añadir el mismo `USERNAME_PATTERN` ahí para que las reglas no diverjan, con test `createUser_withInvalidUsername_returns400`.

---

### Task 3 — Cambio de email seguro: `newEmail` + `currentPassword` (corrige P5, P6, P7)

**Archivo:** `UserController.java`, `UserControllerTest.java`

- [ ] **Red** — `patchMe_newEmailWithoutCurrentPassword_returns400`
- [ ] **Red** — `patchMe_newEmailWithWrongCurrentPassword_returns401`
- [ ] **Red** — `patchMe_newEmailInvalidFormat_returns400` (mismo regex que `Login.tsx:48`: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
- [ ] **Red** — `patchMe_newEmailForOAuthAccount_returns403` (**cambia el test existente** `patchMe_emailChange_isRejectedForOAuthAccounts`, que hoy espera 400, y renómbralo; usar `newEmail` en el body)
- [ ] **Red** — `patchMe_newEmailEqualToCurrent_returns200WithoutSendingEmail` → `verify(emailService, never()).sendEmailChangeVerificationEmail(any(), any())`
- [ ] **Red** — `patchMe_newEmailTaken_returns409` (con `currentPassword` correcto)
- [ ] **Red** — `patchMe_newEmailSameAsOwnPendingEmail_doesNotRegenerateToken`
- [ ] **Green** — Renombrar el campo a `newEmail`. Ordenar la validación: (a) formato, (b) `canChangeEmail` → 403, (c) `currentPassword` presente y correcto → 401, (d) unicidad → 409, (e) genera `pendingEmail` cifrado + token + email.
- [ ] **Refactor** — Extraer `requestEmailChange(User, String newEmail)` desde `updateMe`.

> El campo legacy `email` en `UpdateMeRequest` se **elimina**. `patchMe_emailChange_setsPendingEmail_andSendsEmail` existente se adapta a `newEmail` + `currentPassword`.

---

### Task 4 — Endpoint `DELETE /api/users/me` (base para P12, Fase 2)

**Archivo:** `UserController.java`, `UserControllerTest.java`

- [ ] **Red** — `deleteMe_withoutAuth_returns401`
- [ ] **Red** — `deleteMe_withWrongCurrentPassword_returns401`
- [ ] **Red** — `deleteMe_forOAuthAccount_returns400` (no hay password que confirmar)
- [ ] **Red** — `deleteMe_setsUserInactiveAndInvalidatesSession` → assert `user.setActive(false)` + `session.invalidate()`
- [ ] **Green** — `DELETE /me` con `currentPassword`. **Soft delete**: `active=false` en vez de `deleteById`, para no romper mazos (`Deck.userId`), amistades y mensajes. Invalidar sesión y limpiar cookie `isLogged`.
- [ ] **Refactor** — Compartir el helper de invalidación de sesión con `logout()`.

> La Fase 2 (hard delete + cascada) queda fuera de este plan. Ver §6.

---

### Task 5 — `newsletter` y `preferredLocale` persistidos (corrige P10, P11)

**Archivos:** `User.java`, `UserDto.java`, `UserController.java`, `LanguageContext.tsx`, `UserContext.tsx`, tests

- [ ] **Red backend** — `patchMe_newsletterIsPersisted` → `jsonPath("$.newsletter").value(true)`
- [ ] **Red backend** — `patchMe_preferredLocaleInvalid_returns400` (solo `es`/`en`)
- [ ] **Red backend** — `patchMe_preferredLocaleIsPersisted` → `jsonPath("$.preferredLocale").value("en")`
- [ ] **Red backend** — `getMe_returnsDefaultsForLegacyUsers` → usuario sin esos campos → `newsletter=false`, `plan="free"`, `preferredLocale` null
- [ ] **Green backend** — `toDto` rellena defaults defensivos para documentos Mongo antiguos created antes de la migración.
- [ ] **Red frontend** — `Profile.test.tsx`: `el toggle de newsletter llama a la API y persiste`.
- [ ] **Red frontend** — `Profile.test.tsx`: `el selector de idioma persiste la preferencia`.
- [ ] **Green frontend** — `Profile.tsx`: sustituir `useState(true)` por `useState(user.newsletter)`, añadir al payload de guardado. El selector de idioma llama a `updateProfile({preferredLocale})` y actualiza `updateUser`.
- [ ] **Refactor** — Extraer el payload del formulario a `buildProfilePayload(user, draft)` (test unitario puro, sin render).

> `LanguageContext` mantiene `localStorage` como caché de arranque. `UserContext`, al rehidratar la sesión, si el usuario tiene `preferredLocale` y no hay override explícito en la URL, llama `setLocale`. Prioridad final de locale: `?lang=` → `preferredLocale` del usuario → `localStorage` → navegador → `es`.

---

### Task 6 — `plan` como campo real (corrige P9)

**Archivos:** `User.java`, `UserDto.java`, `UserController.java`, `Profile.tsx`, `labels.json`, tests

- [ ] **Red backend** — `getMe_returnsPlanFreeByDefault` → `jsonPath("$.plan").value("free")`
- [ ] **Red backend** — `patchMe_cannotChangePlan_returns400` (el campo no existe en `UpdateMeRequest`; el test afirma que mandarlo no altera nada → `plan` sigue `"free"`)
- [ ] **Red frontend** — `Profile.test.tsx`: `muestra el badge del plan desde el usuario, no un literal` → con `plan: 'beta'` renderiza el texto de `profile.planBeta`.
- [ ] **Red frontend** — `Profile.test.tsx`: `el badge del plan está traducido` → con locale `en` renderiza la etiqueta inglesa.
- [ ] **Green backend** — Añadir `plan` a `User` (default `"free"`) y a `UserDto`. **No** añadirlo a `UpdateMeRequest` (solo lectura en esta fase).
- [ ] **Green frontend** — Sustituir el literal `<Shield size={12} /> Planeswalker` por un lookup `t(\`profile.plan.${user.plan}\`)` con fallback a `profile.plan.free`. Añadir claves `profile.plan.free` / `profile.plan.beta` en es + en.
- [ ] **Refactor** — Extraer `<PlanBadge plan={user.plan} />` a un componente propio.

---

### Task 7 — `AuthService` y modelo `User` del frontend

**Archivos:** `AuthService.ts`, `User.ts`, `AuthService.test.ts`

- [ ] **Red** — `updateProfile sends username, name and preferences when provided`
- [ ] **Red** — `requestEmailChange sends newEmail and currentPassword` → assert body `{newEmail, currentPassword}` contra `PATCH /users/me`
- [ ] **Red** — `requestEmailChange throws EMAIL_CHANGE_FORBIDDEN on 403`
- [ ] **Red** — `requestEmailChange throws WRONG_PASSWORD on 401`
- [ ] **Red** — `requestEmailChange throws EMAIL_TAKEN on 409`
- [ ] **Red** — `deleteAccount sends currentPassword to DELETE /users/me`
- [ ] **Red** — `updateProfile throws USERNAME_TAKEN on 409`
- [ ] **Red** — `updateProfile throws EMAIL_CHANGE_BLOCKED` (OAuth, 400 con mensaje, o 403)
- [ ] **Green** — `UpdateProfilePayload` pasa a ser `Partial<Pick<User,...>>`. Añadir `requestEmailChange` y `deleteAccount`. Traducir códigos de error a constantes exportadas (no strings sueltas).
- [ ] **Green** — `User.ts`: añadir `pendingEmail?`, `canChangeEmail?`, `newsletter?`, `preferredLocale?`, `plan?`.
- [ ] **Refactor** — Un único helper `mapProfileError(status, body)` en `AuthService` que traduzca status → código.

---

### Task 8 — `Profile.tsx`: edición de username, name y email (corrige P1, P2, P3, P8, P12, P15)

**Archivo:** `Profile.tsx` + **crear** `src/__tests__/views/Profile.test.tsx`

- [ ] **Red** — Montar el harness de test. Crear `src/__tests__/views/Profile.test.tsx` con los providers (`LanguageProvider` > `UserProvider` > `ToastProvider` > `MemoryRouter`), siguiendo el patrón de `Login.test.tsx:15-33`. Mockear `GET /users/me` con `mockUser` + `canChangeEmail: true`.
- [ ] **Red** — `el campo de nombre de usuario es editable` → `expect(input).toBeEnabled()`
- [ ] **Red** — `el campo de email NO es editable` (sigue siendo read-only en el formulario; el cambio pasa por modal)
- [ ] **Red** — `escribir un nuevo nombre de usuario habilita el botón Guardar`
- [ ] **Red** — `guardar envía el nuevo nombre de usuario` → assert body del PATCH
- [ ] **Red** — `un username duplicado muestra un error y no cierra el formulario` (409)
- [ ] **Red** — `un nombre de usuario inválido muestra validación en cliente sin llamar a la API` (regex del backend espejada)
- [ ] **Red** — `muestra el aviso de email pendiente` → con `pendingEmail: 'nuevo@x.com'` renderiza el texto con la dirección interpolada
- [ ] **Red** — `el botón de cambiar email está oculto cuando canChangeEmail es false`
- [ ] **Red** — `el botón de cambiar email está habilitado cuando canChangeEmail es true`
- [ ] **Red** — `el modal de cambio de email pide confirmación de contraseña` → el input de password aparece tras abrir el modal
- [ ] **Red** — `el modal de cambio de email envía newEmail y currentPassword`
- [ ] **Red** — `una contraseña incorrecta muestra el error y mantiene el modal abierto` (401)
- [ ] **Red** — `el éxito del cambio de email muestra confirmación y muestra el estado pendiente` → toast + banner de `pendingEmail`
- [ ] **Red** — `el campo de nombre visible es editable y se guarda`
- [ ] **Red** — `eliminar cuenta está deshabilitado y explica por qué`
- [ ] **Red** — `el resumen del perfil refleja el nombre visible, no el username`
- [ ] **Green** — Quitar `disabled` de `username` y `name`, añadir `onChange`, ampliar `hasProfileChanges` para incluir los tres. Añadir el modal de cambio de email usando el componente `Modal` existente (`src/components/ui/Modal.tsx`) con `newEmail` + `currentPassword`. Renderizar el aviso de `pendingEmail` y ocultar/deshabilitar la acción según `canChangeEmail`.
- [ ] **Green** — Añadir el estado de `emailLoading` / `emailError` / `emailSuccess` siguiendo el patrón ya establecido para el cambio de contraseña (`Profile.tsx:42-51`).
- [ ] **Refactor** — Extraer `ChangeEmailModal` como componente propio con props, junto a `AvatarPickerModal`. Extraer `PendingEmailBanner`.
- [ ] **Refactor** — Quitar `src/views/profile/**` de la lista de exclusión de coverage en `vite.config.ts:45` y subir los thresholds si el nuevo test no llega.

---

### Task 9 — `VerifyEmail` condicional (corrige P14)

**Archivos:** `VerifyEmail.tsx`, `VerifyEmail.test.tsx`

- [ ] **Red** — `con sesión activa redirige a /profile?verified=true` (mockear `checkSession` devolviendo usuario; usar fake timers como ya hace el test L62-78)
- [ ] **Red** — `sin sesión redirige a /login?verified=true` (ajustar el test existente, que ya espera `/login`)
- [ ] **Red** — `el mensaje de error de token inválido está traducido` (hoy hay un literal español hardcodeado en `VerifyEmail.tsx:51` → mover a `labels.json`)
- [ ] **Green** — Tras el éxito, llamar `AuthService.checkSession()` y navegar a `/profile?verified=true` o `/login?verified=true` según el resultado.
- [ ] **Refactor** — Extraer `resolveVerifiedRedirect()` como función pura testeable sin render.

---

### Task 10 — Claves de i18n y verificación de paridad

**Archivo:** `labels.json`, test nuevo

- [ ] **Red** — Crear `src/__tests__/unit/labels.test.ts`: `todas las claves de es existen en en` y `no hay claves de profile huérfanas`. Implementar un recorrido recursivo que compare la forma de los dos subárboles.
- [ ] **Green** — Añadir todas las claves nuevas en **ambos** idiomas: `profile.name`, `profile.usernameHint`, `profile.emailChange`, `profile.newEmail`, `profile.emailPending`, `profile.emailLocked`, `profile.plan.free`, `profile.plan.beta`, `profile.usernameTaken`, `profile.usernameInvalid`, `profile.emailTaken`, `profile.deleteAccountDisabled`, `profile.deleteAccountDisabledHint`, `auth.displayName`, `auth.error.displayNameRequired`, `auth.verifyEmail.invalidToken`.
- [ ] **Refactor** — Ninguno. Este test es la red de seguridad de los pasos anteriores.

---

### Task 11 — Documentación

**Archivos:** `ARCHITECTURE.md`, spec

- [ ] **Red** — Ninguna. Verificar que la tabla de rutas de `ARCHITECTURE.md:68-76` incluye `/profile` (hoy falta) y que la descripción de autenticación menciona login local además de OAuth2.
- [ ] **Green** — Actualizar `ARCHITECTURE.md`. Marcar `docs/superpowers/specs/2026-05-28-profile-username-email-design.md` como implementado, con una nota de las divergencias que se resuelven aquí: campo `email` → `newEmail`, 400 → 403, y los campos añadidos.

---

## 5. Orden de ejecución y dependencias

```
Task 1  (name en registro)
Task 2  (validación username/name)      ← independiente
Task 3  (email seguro)                  ← depende de Task 2 (comparte validación)
Task 4  (DELETE /me)                    ← independiente
Task 7  (AuthService + User TS)         ← depende de 3 y 4 (contratos de API)
Task 5  (newsletter + locale)
Task 6  (plan)
Task 8  (Profile.tsx)                   ← depende de 7, y usa los DTOs de 5 y 6
Task 9  (VerifyEmail)                   ← independiente
Task 10 (i18n + paridad)                ← al final, valida todo lo anterior
Task 11 (docs)                          ← al final
```

Tasks 1, 2, 4, 9 se pueden paralelizar. La 8 es la crítica.

---

## 6. Fuera de alcance (dejar registrado, no implementar)

- **Hard delete con cascada.** El Task 4 hace soft delete. Borrar mazos, amistades, mensajes, follows y posts del usuario es otro diseño.
- **Sistema de planes / billing.** `plan` es un campo de solo lectura. No hay pagos, ni suscripciones, ni límites por tier.
- **Rate limiting en cambios de username.** Se puede cambiar tantas veces por minuto como se quiera. Si molesta, añadirlo en una iteración posterior.
- **Avatar por upload.** Hoy hay 105 avatares predefinidos (`AVATAR_OPTIONS`). Subir una imagen custom es otro proyecto.
- **`mana-forge-backoffice`** está vacío. Si habrá panel de administración de usuarios, el `plan` y el `active` serán editables desde allí en vez de por API pública.

---

## 7. Criterio de "hecho"

- [ ] `cd mana-forge-api; ./mvnw test` — todo en verde, incluidos los 12+ tests nuevos de `UserControllerTest`.
- [ ] `cd mana-forge-web; npm test` — todo en verde, incluido el nuevo `Profile.test.tsx` y `labels.test.ts`.
- [ ] `cd mana-forge-web; npm run build` — compila sin errores de tipos (el payload de `updateProfile` cambió de forma).
- [ ] `cd mana-forge-web; npm run lint` — sin errores.
- [ ] Manual: un usuario local cambia su username → sigue navigating sin 401. Un usuario local cambia su email → recibe el email, hace clic, el perfil muestra el nuevo email. Un usuario Google ve el email bloqueado con explicación. El badge, el newsletter y el idioma sobreviven a un F5.
- [ ] `git diff --stat` no toca archivos fuera de la lista de §3 y §11.
