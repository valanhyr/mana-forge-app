# Profile Username & Email Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow local users to change username and request an email change (applied only after verifying a link), while keeping email locked for Google OAuth users.

**Architecture:** Extend `PATCH /api/users/me` to accept `username` and `email`. Username changes update the session principal for local logins. Email changes are staged as `pendingEmail` (encrypted) and confirmed via existing `GET /api/users/verify?token=...`.

**Tech Stack:** Spring Boot (Java), MongoDB, session-based Spring Security, React + TypeScript, Vitest + MSW.

---

## File map (what changes where)

### Backend (mana-forge-api)
- **Modify:** `mana-forge-api\src\main\java\com\manaforge\api\model\mongo\User.java`
  - Add `pendingEmail` field.
- **Modify:** `mana-forge-api\src\main\java\com\manaforge\api\dto\UserDto.java`
  - Add `pendingEmail` and `canChangeEmail` fields.
- **Modify:** `mana-forge-api\src\main\java\com\manaforge\api\controller\UserController.java`
  - Update `UpdateMeRequest` to include `username` and `email`.
  - Extend `updateMe(...)` to process username/email changes.
  - Update `toDto(...)` to include new fields.
  - Extend `verifyEmail(...)` to apply `pendingEmail` if present.
- **Modify:** `mana-forge-api\src\main\java\com\manaforge\api\service\EmailService.java`
  - Add `sendEmailChangeVerificationEmail(...)` to send the verification link to the *new* email.
- **Test:** `mana-forge-api\src\test\java\com\manaforge\api\controller\UserControllerTest.java`
  - Add tests for username-change session continuity, OAuth email lock, pending email flow, verify applying pending.

### Frontend (mana-forge-web)
- **Modify:** `mana-forge-web\src\core\models\User.ts`
  - Add optional `pendingEmail` and `canChangeEmail`.
- **Modify:** `mana-forge-web\src\services\AuthService.ts`
  - Extend `UpdateProfilePayload` to include optional `username` and `email`.
- **Modify:** `mana-forge-web\src\views\profile\Profile.tsx`
  - Enable editing username/email with local state.
  - Disable email input when `canChangeEmail === false`.
  - Display “pending email” notice.
- **Modify:** `mana-forge-web\src\__tests__\mocks\handlers.ts`
  - Update `mockUser` shape and PATCH handler.
- **Test:** `mana-forge-web\src\__tests__\unit\services\AuthService.test.ts`
  - Keep existing test, adjust types if needed.
- **Modify:** `mana-forge-web\src\labels.json`
  - Add new strings for pending-email and OAuth lock.

---

## Task 1: Backend — Add failing tests for username change and email change staging

**Files:**
- Test: `mana-forge-api\src\test\java\com\manaforge\api\controller\UserControllerTest.java`

- [ ] **Step 1: Add a test: PATCH /api/users/me can change username and subsequent /me works in same session**

Add at the end of `UserControllerTest`:

```java
@Test
void patchMe_canChangeUsername_andSessionKeepsWorking() throws Exception {
    // Given an authenticated local user
    when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

    // When saving, pretend Mongo saved the updated username
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    // After username change, /me lookup should happen by the NEW principal
    User renamed = new User();
    renamed.setId("user1");
    renamed.setUsername("newuser");
    renamed.setEmail(ENC_EMAIL);
    renamed.setName("Test User");
    renamed.setPassword(mockUser.getPassword());
    renamed.setValidated(true);
    when(userRepository.findByUsername("newuser")).thenReturn(Optional.of(renamed));

    var session = new org.springframework.mock.web.MockHttpSession();

    mockMvc.perform(patch("/api/users/me")
            .with(authentication(mockAuth()))
            .with(csrf())
            .session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"username\":\"newuser\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("newuser"));

    // Same session should now resolve /me using the updated principal
    mockMvc.perform(get("/api/users/me")
            .with(authentication(new UsernamePasswordAuthenticationToken(
                "newuser", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
            )))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("newuser"));
}
```

- [ ] **Step 2: Add a test: PATCH /api/users/me with email is rejected for OAuth users (no password)**

```java
@Test
void patchMe_emailChange_isRejectedForOAuthAccounts() throws Exception {
    mockUser.setPassword(""); // OAuth user style
    when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

    mockMvc.perform(patch("/api/users/me")
            .with(authentication(mockAuth()))
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"new@example.com\"}"))
        .andExpect(status().isBadRequest());
}
```

- [ ] **Step 3: Add a test: PATCH /api/users/me with email sets pendingEmail and sends verification email**

```java
@Test
void patchMe_emailChange_setsPendingEmail_andSendsEmail() throws Exception {
    when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
    when(emailEncryptionService.encrypt("new@example.com")).thenReturn("ENC_new");
    when(userRepository.findByEmail("ENC_new")).thenReturn(Optional.empty());
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    mockMvc.perform(patch("/api/users/me")
            .with(authentication(mockAuth()))
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"new@example.com\"}"))
        .andExpect(status().isOk());

    verify(userRepository).save(argThat(u -> "ENC_new".equals(u.getPendingEmail()) && u.getVerificationToken() != null));
    verify(emailService).sendEmailChangeVerificationEmail(any(User.class), eq("new@example.com"));
}
```

- [ ] **Step 4: Run backend tests to confirm they fail**

Run:

```powershell
cd mana-forge-api
.\mvnw test -q
```

Expected: FAIL because `pendingEmail` field, new DTO fields, new EmailService method, and PATCH handling do not exist yet.

- [ ] **Step 5: Commit tests**

```powershell
git add mana-forge-api\src\test\java\com\manaforge\api\controller\UserControllerTest.java
git commit -m "test: cover username/email profile updates"
```

---

## Task 2: Backend — Add pendingEmail + DTO fields + EmailService method

**Files:**
- Modify: `mana-forge-api\src\main\java\com\manaforge\api\model\mongo\User.java`
- Modify: `mana-forge-api\src\main\java\com\manaforge\api\dto\UserDto.java`
- Modify: `mana-forge-api\src\main\java\com\manaforge\api\service\EmailService.java`

- [ ] **Step 1: Add `pendingEmail` to User document**

In `User.java`, add field:

```java
private String pendingEmail;
```

(Place it near `email`/`verificationToken`.)

- [ ] **Step 2: Extend UserDto**

In `UserDto.java` add:

```java
private String pendingEmail;
private Boolean canChangeEmail;
```

- [ ] **Step 3: Add EmailService method to send verification to new email**

In `EmailService.java`, add:

```java
@Async
public void sendEmailChangeVerificationEmail(User user, String plainPendingEmail) {
    try {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress);
        helper.setTo(plainPendingEmail);
        helper.setSubject("Confirma tu nuevo email en ManaForge");
        helper.setText(buildEmailChangeVerificationHtml(user), true);

        mailSender.send(message);
        log.info("Email-change verification sent to {}", plainPendingEmail);
    } catch (Exception e) {
        log.error("Failed to send email-change verification to {}: {}", plainPendingEmail, e.getMessage());
    }
}

private String buildEmailChangeVerificationHtml(User user) {
    String verifyUrl = frontendUrl + "/verify-email?token=" + user.getVerificationToken();
    return """
        <!DOCTYPE html>
        <html lang=\"es\">
        <head>
          <meta charset=\"UTF-8\"/>
          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>
        </head>
        <body style=\"margin:0;padding:0;background:#09090b;font-family:sans-serif;\">
          <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#09090b;padding:40px 0;\">
            <tr><td align=\"center\">
              <table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#18181b;border-radius:12px;overflow:hidden;border:1px solid #3f3f46;\">
                <tr>
                  <td style=\"background:#c2410c;padding:24px 32px;text-align:center;\">
                    <span style=\"font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px;\">MANA<span style=\"color:#fed7aa;\">FORGE</span></span>
                  </td>
                </tr>
                <tr>
                  <td style=\"padding:32px;\">
                    <h1 style=\"color:#fff;font-size:22px;margin:0 0 12px;\">Confirma tu nuevo email</h1>
                    <p style=\"color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;\">
                      Haz clic para confirmar este correo como tu nueva dirección en ManaForge.
                    </p>
                    <a href=\"%s\" style=\"display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;\">
                      Confirmar nuevo email →
                    </a>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """.formatted(verifyUrl);
}
```

- [ ] **Step 4: Run backend tests (still failing, but closer)**

```powershell
cd mana-forge-api
.\mvnw test -q
```

- [ ] **Step 5: Commit**

```powershell
git add mana-forge-api\src\main\java\com\manaforge\api\model\mongo\User.java \
       mana-forge-api\src\main\java\com\manaforge\api\dto\UserDto.java \
       mana-forge-api\src\main\java\com\manaforge\api\service\EmailService.java
git commit -m "feat: add pending email and email-change verification mail"
```

---

## Task 3: Backend — Implement PATCH /api/users/me for username + email

**Files:**
- Modify: `mana-forge-api\src\main\java\com\manaforge\api\controller\UserController.java`

- [ ] **Step 1: Extend UpdateMeRequest**

In `UserController.java`, update `UpdateMeRequest` to:

```java
public static class UpdateMeRequest {
    private String username;
    private String email;
    private String biography;
    private String avatar;
    private Boolean betaAccepted;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getBiography() { return biography; }
    public void setBiography(String biography) { this.biography = biography; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public Boolean getBetaAccepted() { return betaAccepted; }
    public void setBetaAccepted(Boolean betaAccepted) { this.betaAccepted = betaAccepted; }
}
```

- [ ] **Step 2: Extend `toDto(User)` to include `pendingEmail` and `canChangeEmail`**

Update `toDto` builder:

```java
private UserDto toDto(User user) {
    String pendingPlain = user.getPendingEmail() != null
        ? emailEncryptionService.decrypt(user.getPendingEmail())
        : null;

    boolean canChangeEmail = user.getPassword() != null && !user.getPassword().isBlank();

    return UserDto.builder()
            .userId(user.getId())
            .name(user.getName())
            .username(user.getUsername())
            .email(emailEncryptionService.decrypt(user.getEmail()))
            .biography(user.getBiography())
            .friends(user.getFriends())
            .avatar(user.getAvatar())
            .betaAccepted(user.getBetaAccepted())
            .pendingEmail(pendingPlain)
            .canChangeEmail(canChangeEmail)
            .build();
}
```

- [ ] **Step 3: Update `updateMe(...)` signature to accept request/response**

Change method signature to:

```java
@PatchMapping("/me")
public ResponseEntity<UserDto> updateMe(@RequestBody UpdateMeRequest req, HttpServletRequest request, HttpServletResponse response) {
```

(Ensure imports already exist; `HttpServletRequest/Response` are already imported in file.)

- [ ] **Step 4: Implement username change logic (local users) and update session principal**

Inside `updateMe`, before saving:

```java
User user = getAuthenticatedUser();
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
boolean isOAuth = auth != null && (auth.getPrincipal() instanceof OAuth2User);

if (req.getUsername() != null) {
    String newUsername = req.getUsername().trim();
    if (newUsername.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
    }

    userRepository.findByUsername(newUsername).ifPresent(existing -> {
        if (!existing.getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
    });

    if (!newUsername.equals(user.getUsername())) {
        user.setUsername(newUsername);

        // For local sessions, principal is username -> update SecurityContext so session keeps working.
        if (!isOAuth) {
            UsernamePasswordAuthenticationToken newAuth = new UsernamePasswordAuthenticationToken(
                newUsername, null, AuthorityUtils.createAuthorityList("ROLE_USER")
            );
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(newAuth);
            SecurityContextHolder.setContext(ctx);
            securityContextRepository.saveContext(ctx, request, response);
        }
    }
}
```

- [ ] **Step 5: Implement staged email change (local users only)**

In `updateMe`, add:

```java
if (req.getEmail() != null) {
    String newEmailPlain = req.getEmail().trim();

    // Block OAuth accounts (no local password)
    if (user.getPassword() == null || user.getPassword().isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email change not allowed for OAuth accounts");
    }

    String encryptedNewEmail = emailEncryptionService.encrypt(newEmailPlain);

    // No-op if same as current
    if (!encryptedNewEmail.equals(user.getEmail())) {
        userRepository.findByEmail(encryptedNewEmail).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
            }
        });

        user.setPendingEmail(encryptedNewEmail);
        user.setVerificationToken(UUID.randomUUID().toString());

        emailService.sendEmailChangeVerificationEmail(user, newEmailPlain);
    }
}
```

- [ ] **Step 6: Keep existing biography/avatar/betaAccepted logic and save**

Leave existing blocks as-is, then ensure save happens once and return DTO:

```java
userRepository.save(user);
return ResponseEntity.ok(toDto(user));
```

- [ ] **Step 7: Run backend tests — expect PASS**

```powershell
cd mana-forge-api
.\mvnw test -q
```

- [ ] **Step 8: Commit**

```powershell
git add mana-forge-api\src\main\java\com\manaforge\api\controller\UserController.java
git commit -m "feat: allow username change and staged email change in profile"
```

---

## Task 4: Backend — Apply pendingEmail on verification

**Files:**
- Modify: `mana-forge-api\src\main\java\com\manaforge\api\controller\UserController.java`
- Test: `mana-forge-api\src\test\java\com\manaforge\api\controller\UserControllerTest.java`

- [ ] **Step 1: Add failing test: verify token applies pendingEmail**

Add:

```java
@Test
void verifyEmail_appliesPendingEmailWhenPresent() throws Exception {
    User u = new User();
    u.setId("u1");
    u.setUsername("testuser");
    u.setEmail("ENC_old");
    u.setPendingEmail("ENC_new");
    u.setVerificationToken("tok");
    u.setValidated(true);

    when(userRepository.findByVerificationToken("tok")).thenReturn(Optional.of(u));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    mockMvc.perform(get("/api/users/verify").param("token", "tok"))
        .andExpect(status().isOk());

    verify(userRepository).save(argThat(saved ->
        "ENC_new".equals(saved.getEmail())
        && saved.getPendingEmail() == null
        && saved.getVerificationToken() == null
        && Boolean.TRUE.equals(saved.getValidated())
    ));
}
```

- [ ] **Step 2: Run tests to see failure**

```powershell
cd mana-forge-api
.\mvnw test -q
```

Expected: FAIL because verify handler doesn’t move pendingEmail.

- [ ] **Step 3: Implement behavior in `GET /api/users/verify`**

In `verifyEmail(...)` handler, replace the body block with:

```java
if (userOpt.isPresent()) {
    var user = userOpt.get();

    if (user.getPendingEmail() != null && !user.getPendingEmail().isBlank()) {
        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setValidated(true);
        user.setVerificationToken(null);
        userRepository.save(user);
        return ResponseEntity.<Void>ok().build();
    }

    user.setValidated(true);
    user.setVerificationToken(null);
    userRepository.save(user);
    return ResponseEntity.<Void>ok().build();
}
```

- [ ] **Step 4: Run tests — expect PASS**

```powershell
cd mana-forge-api
.\mvnw test -q
```

- [ ] **Step 5: Commit**

```powershell
git add mana-forge-api\src\main\java\com\manaforge\api\controller\UserController.java \
       mana-forge-api\src\test\java\com\manaforge\api\controller\UserControllerTest.java
git commit -m "feat: apply pending email on verification"
```

---

## Task 5: Frontend — Extend User model and AuthService payload

**Files:**
- Modify: `mana-forge-web\src\core\models\User.ts`
- Modify: `mana-forge-web\src\services\AuthService.ts`
- Test: `mana-forge-web\src\__tests__\unit\services\AuthService.test.ts`

- [ ] **Step 1: Update TS model**

In `User.ts`:

```ts
export interface User {
  userId: string;
  name: string;
  username: string;
  email: string;
  biography: string;
  friends: string[];
  avatar: string;
  betaAccepted?: boolean;
  pendingEmail?: string;
  canChangeEmail?: boolean;
}
```

- [ ] **Step 2: Extend update payload**

In `AuthService.ts`:

```ts
interface UpdateProfilePayload {
  biography: string;
  avatar: string;
  username?: string;
  email?: string;
}
```

- [ ] **Step 3: Run frontend unit tests**

```powershell
cd mana-forge-web
npm test
```

Expected: PASS (or type errors to fix in the next step).

- [ ] **Step 4: Commit**

```powershell
git add mana-forge-web\src\core\models\User.ts mana-forge-web\src\services\AuthService.ts
git commit -m "feat: extend user/profile types for username/email"
```

---

## Task 6: Frontend — Enable editing in Profile UI + pending email notice

**Files:**
- Modify: `mana-forge-web\src\views\profile\Profile.tsx`
- Modify: `mana-forge-web\src\labels.json`

- [ ] **Step 1: Add UI strings (es/en) for pending email and OAuth lock**

In `labels.json` add under `es.profile`:

```json
"emailLocked": "Este email no se puede cambiar en cuentas Google",
"emailPending": "Cambio de email pendiente: revisa tu correo en {email} para confirmarlo"
```

And under `en.profile`:

```json
"emailLocked": "Email can’t be changed for Google accounts",
"emailPending": "Email change pending: check {email} to confirm it"
```

- [ ] **Step 2: Make username/email editable with local state**

In `Profile.tsx`, add state near biography:

```ts
const [draftUsername, setDraftUsername] = useState('');
const [draftEmail, setDraftEmail] = useState('');
```

In the `useEffect` that loads user data:

```ts
setDraftUsername(user.username ?? '');
setDraftEmail(user.email ?? '');
```

Update `hasProfileChanges` to include these:

```ts
const hasProfileChanges =
  !!user &&
  (
    biography.trim() !== (user.biography ?? '') ||
    selectedAvatar !== (user.avatar || DEFAULT_AVATAR) ||
    draftUsername.trim() !== (user.username ?? '') ||
    draftEmail.trim() !== (user.email ?? '')
  );
```

- [ ] **Step 3: Update save payload to include username/email only when changed**

In `handleSaveProfile`:

```ts
const payload: Record<string, unknown> = {
  biography: biography.trim(),
  avatar: selectedAvatar,
};

if (draftUsername.trim() !== user.username) payload.username = draftUsername.trim();
if (draftEmail.trim() !== user.email) payload.email = draftEmail.trim();

const updatedUser = await AuthService.updateProfile(payload as any);
```

(Optionally, replace `any` by importing `UpdateProfilePayload` type.)

- [ ] **Step 4: Enable the inputs**

Replace the username input block:

```tsx
<input
  type="text"
  value={draftUsername}
  onChange={(e) => setDraftUsername(e.target.value)}
  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
/>
```

Replace email input block:

```tsx
<input
  type="email"
  value={draftEmail}
  onChange={(e) => setDraftEmail(e.target.value)}
  disabled={user.canChangeEmail === false}
  className={
    user.canChangeEmail === false
      ? "w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-zinc-500 cursor-not-allowed"
      : "w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
  }
/>
```

Under the email input, show helper text:

```tsx
{user.canChangeEmail === false && (
  <p className="text-xs text-zinc-500">{t('profile.emailLocked')}</p>
)}

{user.pendingEmail && user.pendingEmail.length > 0 && (
  <p className="text-xs text-orange-400">{t('profile.emailPending', { email: user.pendingEmail })}</p>
)}
```

- [ ] **Step 5: Run frontend tests**

```powershell
cd mana-forge-web
npm test
```

- [ ] **Step 6: Commit**

```powershell
git add mana-forge-web\src\views\profile\Profile.tsx mana-forge-web\src\labels.json
git commit -m "feat: allow editing username/email in profile"
```

---

## Task 7: Frontend — Update MSW mocks to include new user fields

**Files:**
- Modify: `mana-forge-web\src\__tests__\mocks\handlers.ts`

- [ ] **Step 1: Extend `mockUser`**

Update `mockUser`:

```ts
export const mockUser = {
  userId: 'user-1',
  name: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  biography: 'Bio',
  friends: [],
  avatar: 'ava1.jpg',
  canChangeEmail: true,
  pendingEmail: '',
};
```

- [ ] **Step 2: Make PATCH /users/me return updated fields when sent**

Replace handler:

```ts
http.patch(`${BASE}/users/me`, async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as any;
  return HttpResponse.json({
    ...mockUser,
    username: body.username ?? mockUser.username,
    email: mockUser.email,
    pendingEmail: body.email ?? mockUser.pendingEmail,
    biography: body.biography ?? mockUser.biography,
    avatar: body.avatar ?? mockUser.avatar,
  });
}),
```

- [ ] **Step 3: Run frontend tests — expect PASS**

```powershell
cd mana-forge-web
npm test
```

- [ ] **Step 4: Commit**

```powershell
git add mana-forge-web\src\__tests__\mocks\handlers.ts
git commit -m "test: update auth/profile mocks for canChangeEmail"
```

---

## Task 8: Full verification

- [ ] **Step 1: Backend tests**

```powershell
cd mana-forge-api
.\mvnw test -q
```

Expected: PASS

- [ ] **Step 2: Frontend tests**

```powershell
cd ..\mana-forge-web
npm test
```

Expected: PASS

---

## Notes / gotchas
- Username change must update session principal for local auth, otherwise `/api/users/me` will 401 on subsequent requests.
- Email change for OAuth must stay blocked to prevent account duplication.
- `pendingEmail` should be encrypted in DB; DTO decrypts it for UI display.
