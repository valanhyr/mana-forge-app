# Profile Username & Email Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to edit `username` (local + Google OAuth) and request a safe email change (local only) from Profile, preserving the existing session-based auth flow.

**Architecture:** Keep a single endpoint `PATCH /api/users/me` for profile edits. For email change, store `pendingEmail` (encrypted) + reuse `verificationToken` and the existing `/api/users/verify?token=...` endpoint to apply the email after verification.

**Tech Stack:** Spring Boot (WebMVC + Spring Security session auth), MongoDB, React 19 + TypeScript + Vite + Tailwind.

---

## Scope / Acceptance

- Local + OAuth users can update `username` from Profile.
- Local users can request an email change by providing `newEmail` + `currentPassword`.
- OAuth users cannot request email change (API returns **403**; UI hides/disables the action).
- Verification link `/verify-email?token=...` applies `pendingEmail` if present, otherwise behaves as the existing account verification.
- After changing username (local user), the same browser session remains authenticated and `/api/users/me` continues to work.

---

## File/Component Map (what changes where)

### Backend (`mana-forge-api`)
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/User.java`
  - Add `pendingEmail` field.
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/dto/UserDto.java`
  - Add `canChangeEmail` + `pendingEmail` fields.
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`
  - Extend `UpdateMeRequest` (username/newEmail/currentPassword)
  - Implement username change + session principal update (local)
  - Implement email-change initiation (local) + 403 for OAuth
  - Enhance `/verify` to apply `pendingEmail` when present
  - Update `toDto()` to include new DTO fields
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/service/EmailService.java`
  - Add `sendEmailChangeVerificationEmail(User user, String plainNewEmail)`

### Tests (`mana-forge-api`)
- Modify: `mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java`
  - Align request payloads with spec (`newEmail`, `currentPassword`) and status codes
  - Add coverage for DTO fields + verify flow applying `pendingEmail`
- Modify: `mana-forge-api/src/test/java/com/manaforge/api/service/EmailServiceTest.java`
  - Add unit tests for `sendEmailChangeVerificationEmail`

### Frontend (`mana-forge-web`)
- Modify: `mana-forge-web/src/core/models/User.ts`
  - Add `canChangeEmail?: boolean`, `pendingEmail?: string`
- Modify: `mana-forge-web/src/services/AuthService.ts`
  - Expand `UpdateProfilePayload` to include username + email-change fields
- Modify: `mana-forge-web/src/views/profile/Profile.tsx`
  - Enable username editing (local state)
  - Add Security modal: new email + current password
  - Show pending-email notice when `user.pendingEmail` exists
  - Hide/disable email-change when `user.canChangeEmail === false`
- Modify: `mana-forge-web/src/views/auth/VerifyEmail.tsx`
  - Conditional redirect: session present → `/profile?verified=true`, else `/login?verified=true`
- Modify: `mana-forge-web/src/labels.json`
  - Add a few `profile.*` keys for the email-change modal/notice

---

## Task 1: Backend model + DTO support (`pendingEmail`, `canChangeEmail`)

**Files:**
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/User.java`
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/dto/UserDto.java`
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`
- Test: `mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java`

- [ ] **Step 1: Add a failing test for new DTO fields on `/api/users/me`**

Add this test near the existing `getMe_withAuth_returns200WithDecryptedEmail` test:

```java
@Test
void getMe_withAuth_includesCanChangeEmail_andPendingEmail() throws Exception {
    // Local account => password hash present => canChangeEmail=true
    mockUser.setPassword(encoder.encode("password123"));

    // Pending email should be returned decrypted
    // (User.java will get a real pendingEmail field in this task)
    setField(mockUser, "pendingEmail", "ENC_pending");
    when(emailEncryptionService.decrypt("ENC_pending")).thenReturn("pending@example.com");

    mockMvc.perform(get("/api/users/me")
                    .with(authentication(mockAuth())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.canChangeEmail").value(true))
            .andExpect(jsonPath("$.pendingEmail").value("pending@example.com"));
}

private static void setField(Object target, String fieldName, Object value) {
    try {
        Field f = target.getClass().getDeclaredField(fieldName);
        f.setAccessible(true);
        f.set(target, value);
    } catch (ReflectiveOperationException e) {
        throw new RuntimeException(e);
    }
}
```

- [ ] **Step 2: Run the test to see it fail**

Run:

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#getMe_withAuth_includesCanChangeEmail_andPendingEmail
```

Expected: FAIL (JSON paths missing and/or `pendingEmail` field missing).

- [ ] **Step 3: Add `pendingEmail` to `User`**

Edit `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/User.java`:

```java
private String email;
private String pendingEmail; // encrypted, applied only after /verify
```

(Place it right after `email` to keep related fields together.)

- [ ] **Step 4: Add new fields to `UserDto`**

Edit `mana-forge-api/src/main/java/com/manaforge/api/dto/UserDto.java`:

```java
private Boolean canChangeEmail;
private String pendingEmail;
```

- [ ] **Step 5: Populate the fields in `UserController.toDto()`**

Edit `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java` method `toDto(User user)`:

```java
private UserDto toDto(User user) {
    boolean canChangeEmail = user.getPassword() != null && !user.getPassword().isBlank();
    String pendingEmailPlain = null;
    if (user.getPendingEmail() != null && !user.getPendingEmail().isBlank()) {
        pendingEmailPlain = emailEncryptionService.decrypt(user.getPendingEmail());
    }

    return UserDto.builder()
            .userId(user.getId())
            .name(user.getName())
            .username(user.getUsername())
            .email(emailEncryptionService.decrypt(user.getEmail()))
            .pendingEmail(pendingEmailPlain)
            .canChangeEmail(canChangeEmail)
            .biography(user.getBiography())
            .friends(user.getFriends())
            .avatar(user.getAvatar())
            .betaAccepted(user.getBetaAccepted())
            .build();
}
```

- [ ] **Step 6: Re-run the test**

Run:

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#getMe_withAuth_includesCanChangeEmail_andPendingEmail
```

Expected: PASS.

- [ ] **Step 7: Commit backend DTO/model groundwork**

```powershell
git add mana-forge-api/src/main/java/com/manaforge/api/model/mongo/User.java `
        mana-forge-api/src/main/java/com/manaforge/api/dto/UserDto.java `
        mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java `
        mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java

git commit -m "feat(api): expose canChangeEmail/pendingEmail on user dto" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Username change via `PATCH /api/users/me` + keep local session working

**Files:**
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`
- Test: `mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java`

- [ ] **Step 1: Fix/align the username-change test stub (should allow changing to a free username)**

In `UserControllerTest.patchMe_canChangeUsername_andSessionKeepsWorking`, change the stub:

```java
when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
```

(Previously it returned `Optional.of(mockUser)` which would imply a collision.)

- [ ] **Step 2: Run the username-change test to see current failure**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#patchMe_canChangeUsername_andSessionKeepsWorking
```

Expected: FAIL (controller currently ignores `username`).

- [ ] **Step 3: Extend `UpdateMeRequest` to accept `username`**

Edit the nested class in `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`:

```java
public static class UpdateMeRequest {
    private String username;
    private String biography;
    private String avatar;
    private Boolean betaAccepted;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getBiography() { return biography; }
    public void setBiography(String biography) { this.biography = biography; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Boolean getBetaAccepted() { return betaAccepted; }
    public void setBetaAccepted(Boolean betaAccepted) { this.betaAccepted = betaAccepted; }
}
```

- [ ] **Step 4: Implement username update + uniqueness check + local session principal update**

Change the controller signature to accept request/response so we can persist the updated principal:

```java
@PatchMapping("/me")
public ResponseEntity<UserDto> updateMe(@RequestBody UpdateMeRequest req,
                                      HttpServletRequest request,
                                      HttpServletResponse response) {
```

Then add this block near the top of `updateMe` (after `User user = getAuthenticatedUser();`):

```java
if (req.getUsername() != null) {
    String newUsername = req.getUsername().trim();
    if (newUsername.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username cannot be blank");
    }

    if (!newUsername.equals(user.getUsername())) {
        userRepository.findByUsername(newUsername)
                .filter(other -> other.getId() != null && !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
                });

        user.setUsername(newUsername);

        // If this is a local session (principal is a String username), rotate principal in session.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && !(auth.getPrincipal() instanceof OAuth2User)) {
            UsernamePasswordAuthenticationToken newAuth = new UsernamePasswordAuthenticationToken(
                    newUsername,
                    auth.getCredentials(),
                    auth.getAuthorities()
            );
            SecurityContext newCtx = SecurityContextHolder.createEmptyContext();
            newCtx.setAuthentication(newAuth);
            SecurityContextHolder.setContext(newCtx);
            securityContextRepository.saveContext(newCtx, request, response);
        }
    }
}
```

- [ ] **Step 5: Re-run the username-change test**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#patchMe_canChangeUsername_andSessionKeepsWorking
```

Expected: PASS (and the second `/me` call with the same session returns 200).

- [ ] **Step 6: Commit username-change work**

```powershell
git add mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java

git commit -m "feat(api): allow username change and keep session" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Local email-change initiation (`pendingEmail` + token) and OAuth 403

**Files:**
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/service/EmailService.java`
- Test: `mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java`

- [ ] **Step 1: Update controller tests to match the approved API (`newEmail`, `currentPassword`)**

Update `patchMe_emailChange_isRejectedForOAuthAccounts`:

1) Change request body to use `newEmail`:

```java
.content("{\"newEmail\":\"new@example.com\",\"currentPassword\":\"irrelevant\"}")
```

2) Change expectation to 403:

```java
.andExpect(status().isForbidden());
```

Update `patchMe_emailChange_setsPendingEmail_andSendsEmail`:

Change request body:

```java
.content("{\"newEmail\":\"new@example.com\",\"currentPassword\":\"password123\"}")
```

And update the verification helper to look for the new method name (we’ll implement it in EmailService):

```java
.anyMatch(invocation -> invocation.getMethod().getName().equals("sendEmailChangeVerificationEmail")
```

- [ ] **Step 2: Run the updated email-change tests to see failure**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#patchMe_emailChange_isRejectedForOAuthAccounts
.\mvnw -q test -Dtest=UserControllerTest#patchMe_emailChange_setsPendingEmail_andSendsEmail
```

Expected: FAIL.

- [ ] **Step 3: Extend `UpdateMeRequest` with `newEmail` + `currentPassword`**

Edit the nested class in `UserController.java`:

```java
private String newEmail;
private String currentPassword;

public String getNewEmail() { return newEmail; }
public void setNewEmail(String newEmail) { this.newEmail = newEmail; }
public String getCurrentPassword() { return currentPassword; }
public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
```

- [ ] **Step 4: Add `sendEmailChangeVerificationEmail` to `EmailService` (minimal implementation)**

Edit `mana-forge-api/src/main/java/com/manaforge/api/service/EmailService.java` and add:

```java
@Async
public void sendEmailChangeVerificationEmail(User user, String plainNewEmail) {
    try {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress);
        helper.setTo(plainNewEmail);
        helper.setSubject("Confirma el cambio de email en ManaForge");
        helper.setText(buildVerificationHtml(user), true);

        mailSender.send(message);
        log.info("Email-change verification sent to {}", plainNewEmail);
    } catch (Exception e) {
        log.error("Failed to send email-change verification to {}: {}", plainNewEmail, e.getMessage());
    }
}
```

(We intentionally reuse `buildVerificationHtml(user)` because tests don’t validate the content and it keeps the change small.)

- [ ] **Step 5: Implement email-change initiation in `UserController.updateMe`**

In `updateMe`, after the username-handling block, add:

```java
if (req.getNewEmail() != null) {
    String newEmail = req.getNewEmail().trim();

    boolean canChangeEmail = user.getPassword() != null && !user.getPassword().isBlank();
    if (!canChangeEmail) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email change is not allowed for OAuth accounts");
    }

    if (req.getCurrentPassword() == null || req.getCurrentPassword().isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "currentPassword is required");
    }

    if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
    }

    String encryptedNewEmail = emailEncryptionService.encrypt(newEmail);

    // If it’s the same email, no-op.
    if (encryptedNewEmail.equals(user.getEmail())) {
        // no changes
    } else {
        userRepository.findByEmail(encryptedNewEmail)
                .filter(other -> other.getId() != null && !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo electrónico ya está registrado");
                });

        user.setPendingEmail(encryptedNewEmail);
        user.setVerificationToken(UUID.randomUUID().toString());
        emailService.sendEmailChangeVerificationEmail(user, newEmail);
    }
}
```

- [ ] **Step 6: Re-run the email-change tests**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#patchMe_emailChange_isRejectedForOAuthAccounts
.\mvnw -q test -Dtest=UserControllerTest#patchMe_emailChange_setsPendingEmail_andSendsEmail
```

Expected: PASS.

- [ ] **Step 7: Add unit tests for the new EmailService method**

In `mana-forge-api/src/test/java/com/manaforge/api/service/EmailServiceTest.java`, add:

```java
@Test
void sendEmailChangeVerificationEmail_callsSendOnMailSender() {
    emailService.sendEmailChangeVerificationEmail(user, "new@test.com");
    verify(mailSender).send(any(MimeMessage.class));
}
```

- [ ] **Step 8: Run EmailService tests**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=EmailServiceTest
```

Expected: PASS.

- [ ] **Step 9: Commit email-change initiation + mail service**

```powershell
git add mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java mana-forge-api/src/main/java/com/manaforge/api/service/EmailService.java mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java mana-forge-api/src/test/java/com/manaforge/api/service/EmailServiceTest.java

git commit -m "feat(api): initiate email change with pendingEmail" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Apply `pendingEmail` during verification (`GET /api/users/verify`)

**Files:**
- Modify: `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java`
- Test: `mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java`

- [ ] **Step 1: Add a failing test for verify applying pendingEmail**

Add to `UserControllerTest`:

```java
@Test
void verifyEmail_whenPendingEmail_exists_appliesItAndClearsToken() throws Exception {
    mockUser.setVerificationToken("tok");
    setField(mockUser, "pendingEmail", "ENC_new");
    when(userRepository.findByVerificationToken("tok")).thenReturn(Optional.of(mockUser));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    mockMvc.perform(get("/api/users/verify").param("token", "tok"))
            .andExpect(status().isOk());

    verify(userRepository).save(argThat(u ->
            "ENC_new".equals(u.getEmail())
                    && getField(u, "pendingEmail") == null
                    && u.getVerificationToken() == null
    ));
}

private static Object getField(Object target, String fieldName) {
    try {
        Field f = target.getClass().getDeclaredField(fieldName);
        f.setAccessible(true);
        return f.get(target);
    } catch (ReflectiveOperationException e) {
        throw new RuntimeException(e);
    }
}
```

- [ ] **Step 2: Run the new test (should fail)**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#verifyEmail_whenPendingEmail_exists_appliesItAndClearsToken
```

Expected: FAIL.

- [ ] **Step 3: Implement the pendingEmail apply logic**

Edit `mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java` in `verifyEmail(@RequestParam String token)`:

Replace the “found user” branch with:

```java
if (userOpt.isPresent()) {
    var user = userOpt.get();

    if (user.getPendingEmail() != null && !user.getPendingEmail().isBlank()) {
        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
    } else {
        user.setValidated(true);
    }

    user.setVerificationToken(null);
    userRepository.save(user);
    return ResponseEntity.<Void>ok().build();
}
```

- [ ] **Step 4: Re-run the verification test**

```powershell
cd mana-forge-api
.\mvnw -q test -Dtest=UserControllerTest#verifyEmail_whenPendingEmail_exists_appliesItAndClearsToken
```

Expected: PASS.

- [ ] **Step 5: Run the full API test suite (sanity)**

```powershell
cd mana-forge-api
.\mvnw -q test
```

Expected: PASS.

- [ ] **Step 6: Commit verify behavior change**

```powershell
git add mana-forge-api/src/main/java/com/manaforge/api/controller/UserController.java mana-forge-api/src/test/java/com/manaforge/api/controller/UserControllerTest.java

git commit -m "feat(api): apply pendingEmail on verify" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Frontend types + AuthService payload expansion

**Files:**
- Modify: `mana-forge-web/src/core/models/User.ts`
- Modify: `mana-forge-web/src/services/AuthService.ts`

- [ ] **Step 1: Update the `User` interface**

Edit `mana-forge-web/src/core/models/User.ts`:

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
  canChangeEmail?: boolean;
  pendingEmail?: string;
}
```

- [ ] **Step 2: Expand `UpdateProfilePayload` to include username + email-change fields**

Edit `mana-forge-web/src/services/AuthService.ts`:

```ts
interface UpdateProfilePayload {
  username?: string;
  biography?: string;
  avatar?: string;
  betaAccepted?: boolean;
  newEmail?: string;
  currentPassword?: string;
}
```

Keep `AuthService.updateProfile` as:

```ts
updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
  const response = await api.patch<User>('/users/me', payload);
  return response.data;
},
```

- [ ] **Step 3: Run frontend typecheck/build to ensure no TS errors**

```powershell
cd mana-forge-web
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit frontend type/service groundwork**

```powershell
git add mana-forge-web/src/core/models/User.ts mana-forge-web/src/services/AuthService.ts

git commit -m "feat(web): support username and email-change payloads" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Profile UI — username editing + email-change modal + pending notice

**Files:**
- Modify: `mana-forge-web/src/views/profile/Profile.tsx`
- Modify: `mana-forge-web/src/labels.json`

- [ ] **Step 1: Add local state for editable username**

In `Profile.tsx`, add state near `biography`:

```ts
const [username, setUsername] = useState('');
```

In the `useEffect` that hydrates from `user`, also set:

```ts
setUsername(user.username ?? '');
```

Update `hasProfileChanges` to include username:

```ts
const hasProfileChanges =
  !!user &&
  (username.trim() !== (user.username ?? '') ||
    biography.trim() !== (user.biography ?? '') ||
    selectedAvatar !== (user.avatar || DEFAULT_AVATAR));
```

- [ ] **Step 2: Make the username input editable**

Replace the disabled username `<input>` with:

```tsx
<input
  type="text"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  disabled={profileLoading}
  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50"
/>
```

- [ ] **Step 3: Include username in `updateProfile` call**

Update the payload in `handleSaveProfile`:

```ts
const updatedUser = await AuthService.updateProfile({
  username: username.trim(),
  biography: biography.trim(),
  avatar: selectedAvatar,
});
```

After success, also re-sync local state:

```ts
setUsername(updatedUser.username ?? '');
```

- [ ] **Step 4: Add modal state for email change**

Add state:

```ts
const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
const [newEmail, setNewEmail] = useState('');
const [emailPassword, setEmailPassword] = useState('');
const [emailLoading, setEmailLoading] = useState(false);
const [emailError, setEmailError] = useState('');
```

- [ ] **Step 5: Add a minimal modal component inside Profile.tsx**

Add below `AvatarPickerModal` (same file) a component:

```tsx
interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newEmail: string;
  setNewEmail: (v: string) => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  loading: boolean;
  error: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const ChangeEmailModal = ({
  isOpen,
  onClose,
  onSubmit,
  newEmail,
  setNewEmail,
  currentPassword,
  setCurrentPassword,
  loading,
  error,
  t,
}: ChangeEmailModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('profile.changeEmailTitle')}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">{t('profile.newEmail')}</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t('profile.requestEmailChange')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 6: Wire the modal submit to `PATCH /users/me`**

Add handler in `Profile`:

```ts
const submitEmailChange = async () => {
  if (!user) return;
  setEmailError('');
  setEmailLoading(true);
  try {
    const updatedUser = await AuthService.updateProfile({
      newEmail: newEmail.trim(),
      currentPassword: emailPassword,
    });
    updateUser(updatedUser);
    setIsEmailModalOpen(false);
    setNewEmail('');
    setEmailPassword('');
    showToast(t('profile.emailChangeRequested'), 'success');
  } catch (e) {
    // keep simple; backend will enforce the rules
    setEmailError(t('profile.emailChangeFailed'));
  } finally {
    setEmailLoading(false);
  }
};
```

- [ ] **Step 7: Add Security UI controls + pending notice**

Inside the Security section (near the change-password button), add:

```tsx
{user.pendingEmail && (
  <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
    {t('profile.pendingEmailNotice', { email: user.pendingEmail })}
  </div>
)}

{user.canChangeEmail !== false && (
  <button
    type="button"
    onClick={() => {
      setEmailError('');
      setIsEmailModalOpen(true);
    }}
    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
  >
    {t('profile.changeEmail')}
  </button>
)}
```

And render the modal near the bottom (next to `AvatarPickerModal`):

```tsx
<ChangeEmailModal
  isOpen={isEmailModalOpen}
  onClose={() => setIsEmailModalOpen(false)}
  onSubmit={() => void submitEmailChange()}
  newEmail={newEmail}
  setNewEmail={setNewEmail}
  currentPassword={emailPassword}
  setCurrentPassword={setEmailPassword}
  loading={emailLoading}
  error={emailError}
  t={t}
/>
```

- [ ] **Step 8: Add i18n keys (ES + EN)**

Edit `mana-forge-web/src/labels.json` under `profile` for both locales:

Spanish (`es.profile`):

```json
"changeEmail": "Cambiar Email",
"changeEmailTitle": "Cambiar email",
"newEmail": "Nuevo Email",
"requestEmailChange": "Solicitar cambio",
"emailChangeRequested": "Te enviamos un email para confirmar el cambio.",
"emailChangeFailed": "No se pudo solicitar el cambio de email.",
"pendingEmailNotice": "Te enviamos un email a {email} para confirmar el cambio."
```

English (`en.profile`):

```json
"changeEmail": "Change Email",
"changeEmailTitle": "Change email",
"newEmail": "New Email",
"requestEmailChange": "Request change",
"emailChangeRequested": "We sent you an email to confirm the change.",
"emailChangeFailed": "Could not request the email change.",
"pendingEmailNotice": "We sent an email to {email} to confirm the change."
```

- [ ] **Step 9: Run frontend build + lint**

```powershell
cd mana-forge-web
npm run build
npm run lint
```

Expected: PASS.

- [ ] **Step 10: Commit Profile UI work**

```powershell
git add mana-forge-web/src/views/profile/Profile.tsx mana-forge-web/src/labels.json

git commit -m "feat(web): edit username and request email change" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: VerifyEmail redirect becomes conditional on session

**Files:**
- Modify: `mana-forge-web/src/views/auth/VerifyEmail.tsx`

- [ ] **Step 1: Update VerifyEmail success handler**

Edit `mana-forge-web/src/views/auth/VerifyEmail.tsx`:

Replace:

```ts
setTimeout(() => navigate('/login?verified=true'), 2000);
```

With:

```ts
AuthService.checkSession().then((u) => {
  const target = u ? '/profile?verified=true' : '/login?verified=true';
  setTimeout(() => navigate(target), 2000);
});
```

- [ ] **Step 2: Run web build**

```powershell
cd mana-forge-web
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit VerifyEmail redirect**

```powershell
git add mana-forge-web/src/views/auth/VerifyEmail.tsx

git commit -m "fix(web): redirect verify-email based on session" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Manual end-to-end sanity checks

- [ ] **Step 1: Start API**

```powershell
cd mana-forge-api
.\mvnw spring-boot:run
```

- [ ] **Step 2: Start web**

```powershell
cd mana-forge-web
npm run dev
```

- [ ] **Step 3: Local account flow**

1) Register a local user
2) Verify initial email
3) Login
4) Go to `/profile`
5) Change username → Save → refresh page → confirm still logged in
6) Security → Change Email → enter new email + current password → confirm toast + pending notice
7) Click link in the email (or copy token from DB if running without SMTP)
8) Verify redirect:
   - logged-in browser → `/profile?verified=true`
   - logged-out browser → `/login?verified=true`
9) Confirm `/profile` shows updated email.

- [ ] **Step 4: OAuth flow**

1) Login via Google
2) `/profile` should allow username edit
3) Security should *not* show Change Email action
4) API call with `PATCH /api/users/me` including `newEmail` should return 403.

---

## Self-review checklist (run before declaring done)

- [ ] API tests: `cd mana-forge-api && .\mvnw test`
- [ ] Web build + lint: `cd mana-forge-web && npm run build && npm run lint`
- [ ] Verify `UserDto` includes `canChangeEmail` and `pendingEmail`
- [ ] Verify local username change keeps session (second `/api/users/me` with same session is 200)
- [ ] Verify `/api/users/verify` applies `pendingEmail` when present
