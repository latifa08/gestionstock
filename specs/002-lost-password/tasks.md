# Tasks: Lost Password & Login Page Cleanup

**Input**: Design documents from `specs/002-lost-password/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependency, configure environment, and prepare migration SQL before any code is written.

- [x] T001 Install nodemailer: run `cd Backend && npm install nodemailer` and verify it appears in Backend/package.json dependencies
- [x] T002 [P] Add SMTP and app URL config keys to the `env` object in `Backend/.env`: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_BASE_URL (use Mailtrap or Ethereal values for development)
- [x] T003 [P] Create `Backend/migrations/006_create_password_reset_tokens.sql` with the exact schema from data-model.md: table password_reset_tokens (id, user_id FK→users, token VARCHAR(128) UNIQUE, expires_at TIMESTAMPTZ, used BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()) plus indexes idx_prt_token and idx_prt_user

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Run `node Backend/migrate.js` from repo root and verify migration 006 is applied (output: "✅ Applied 006_create_password_reset_tokens.sql"); confirm table exists in PostgreSQL
- [x] T005 [P] Create `Backend/services/mailer.js` exporting a nodemailer SMTP transporter (credentials from env) and a `sendResetEmail(toEmail, token)` function that sends an HTML email containing the reset link `${env.APP_BASE_URL}/reset-password?token=${token}`; include graceful error handling that throws so the caller can catch it
- [x] T006 [P] Add `forgotPasswordSchema` (email: string, email format, required) and `resetPasswordSchema` (token: string, length 64, required; password: string, min 6, required) to `Backend/schemas/auth.schema.js` using Joi, following the existing pattern in that file

**Checkpoint**: Migration applied, mailer service ready, schemas defined — user story work can now begin.

---

## Phase 3: User Story 3 - Remove Create Account from Login Page (Priority: P1)

**Goal**: Eliminate all self-registration UI from the login page and block the public register endpoint.

**Independent Test**: Open `/login` — no "Créer un compte" button/link visible. Send `POST /api/register` via curl — receive 404. Admin panel user creation still works.

- [x] T007 [US3] Modify `src/Login.js`: remove the `isRegister` state, `handleRegister` function, `role-select` button group, the conditional `{isRegister && ...}` role picker, the `<h3>` conditional title, and the `<p className="switch">` toggle link at the bottom; add a simple `<p>` or `<span>` link reading "Mot de passe oublié?" that calls `navigate('/forgot-password')` on click; leave all login logic and redirect-by-role intact
- [x] T008 [P] [US3] Remove the `router.post("/register", ...)` handler block entirely from `Backend/routes/auth.routes.js` — delete from the comment `// POST /api/register` through `module.exports`; keep all other routes (login, auth/refresh, logout) unchanged

**Checkpoint**: Login page is login-only. Register route returns 404. User Story 3 independently complete.

---

## Phase 4: User Story 1 - Request Password Reset (Priority: P1)

**Goal**: Full forgot-password flow — user requests reset, receives email, sets new password.

**Independent Test**: Submit forgot-password form with `admin@gmail.com`, verify email arrives in Mailtrap, click link, enter new password, log in successfully.

- [x] T009 [US1] Add `POST /api/forgot-password` route to `Backend/routes/auth.routes.js` (before module.exports): apply a rate limiter (3 requests/hour/IP using express-rate-limit), validate body with `forgotPasswordSchema` from auth.schema.js, look up user by email, if found run a DB transaction that deletes all existing tokens for that user_id and inserts a new token (`crypto.randomBytes(32).toString('hex')`, expires_at = NOW() + 1 hour, used = false), then call `sendResetEmail`; always respond `{ success: true, message: "If that email is registered, a reset link has been sent." }` regardless of whether email was found
- [x] T010 [US1] Add `POST /api/reset-password` route to `Backend/routes/auth.routes.js`: validate body with `resetPasswordSchema`, query `password_reset_tokens` WHERE token = ? AND used = false AND expires_at > NOW(), if no row found return 400 `{ success: false, code: "INVALID_TOKEN", message: "Reset link is invalid or has expired." }`, otherwise run a DB transaction that UPDATEs `users.password` to a new bcrypt hash (cost 10) and sets `password_reset_tokens.used = true` for that token, return `{ success: true, message: "Password updated successfully." }`
- [x] T011 [P] [US1] Create `src/ForgotPassword.jsx`: a public page with an email input form; on submit POST to `http://localhost:5000/api/forgot-password`; on success (any 200) show the neutral message "Si cet email est enregistré, un lien de réinitialisation a été envoyé."; on 429 show rate limit error; import and use existing Login.css styles or inline styles matching the login page look
- [x] T012 [P] [US1] Create `src/ResetPassword.jsx`: a public page that reads the `token` query parameter from the URL using `useSearchParams`; shows a form with "Nouveau mot de passe" and "Confirmer le mot de passe" inputs; on submit validates passwords match client-side, then POST to `http://localhost:5000/api/reset-password` with `{ token, password }`; on success navigate to `/login` with a success state message; on 400 INVALID_TOKEN show the error message and a "Demander un nouveau lien" link to `/forgot-password`
- [x] T013 [US1] Add `/forgot-password` and `/reset-password` routes to `src/App.js`: import ForgotPassword and ResetPassword components, add `<Route path="/forgot-password" element={<ForgotPassword />} />` and `<Route path="/reset-password" element={<ResetPassword />} />` inside the Routes block (before the `*` wildcard); also add both paths to the `hideLayout` condition so Sidebar and Navbar are hidden on these public pages: update the check to `["/login", "/", "/forgot-password", "/reset-password"].includes(location.pathname)`

**Checkpoint**: Full reset flow works end-to-end. User Story 1 independently complete.

---

## Phase 5: User Story 2 - Handle Invalid/Expired Reset Links (Priority: P2)

**Goal**: Clear user-facing error states when reset links are expired, already used, or the email is not registered.

**Independent Test**: Use an expired token URL → see "Lien invalide ou expiré" with link to request a new one. Submit unknown email → see neutral success message. Submit forgot-password 4 times rapidly → 4th returns rate-limit error message.

- [x] T014 [US2] Verify and enhance `src/ResetPassword.jsx`: ensure the INVALID_TOKEN error branch (from T012) renders a clear French-language message ("Ce lien de réinitialisation est invalide ou a expiré.") and a visible "Demander un nouveau lien" button/link that navigates to `/forgot-password`; also handle network errors with a generic fallback message
- [x] T015 [P] [US2] Verify and enhance `src/ForgotPassword.jsx`: ensure the 429 rate-limit error branch (from T011) renders a French-language message ("Trop de tentatives. Veuillez réessayer plus tard.") and that unknown-email submissions still show only the neutral success message (no "email not found" disclosure); also handle server/network errors with a generic fallback

**Checkpoint**: All edge cases render appropriate user-facing messages. User Story 2 independently complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification and cleanup.

- [x] T016 Manual end-to-end test following all steps in `specs/002-lost-password/quickstart.md`: confirm full flow from forgot-password request through new-password login works in the browser
- [x] T017 [P] Verify `POST /api/register` returns 404: run `curl -X POST http://localhost:5000/api/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123456"}'` and confirm 404 response
- [x] T018 [P] Verify login page visual regression: open `/login` and confirm no "Créer un compte" text, no role selector buttons, and "Mot de passe oublié?" link is present and navigates correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001, T002, T003 can all start immediately (T002 and T003 in parallel)
- **Foundational (Phase 2)**: T004 depends on T003 (migration file must exist first); T005 and T006 depend on T001 (nodemailer installed); T005 and T006 can run in parallel with each other
- **US3 (Phase 3)**: Depends only on Phase 2 completion — no dependency on US1 or US2
- **US1 (Phase 4)**: Depends on Phase 2 completion; T009 and T010 depend on T006 (schemas); T011 and T012 can be built in parallel with each other and with T009/T010; T013 depends on T011 and T012
- **US2 (Phase 5)**: Depends on T011 (ForgotPassword.jsx exists) and T012 (ResetPassword.jsx exists) from Phase 4
- **Polish (Phase 6)**: Depends on all prior phases complete

### User Story Dependencies

- **User Story 3 (P1)**: Independent — can start immediately after Phase 2
- **User Story 1 (P1)**: Independent — can start immediately after Phase 2, in parallel with US3
- **User Story 2 (P2)**: Depends on US1 frontend components (T011, T012) being complete

### Within Each User Story

- Phase 3: T007 and T008 can run in parallel (different files)
- Phase 4: T009 → T010 (same file, sequential); T011 and T012 in parallel; T013 after T011 and T012
- Phase 5: T014 and T015 in parallel (different files)

### Parallel Opportunities

- T002 and T003 in parallel (Phase 1)
- T005 and T006 in parallel (Phase 2, after T001)
- T007 and T008 in parallel (Phase 3)
- T009/T010 backend + T011/T012 frontend in parallel across teams (Phase 4)
- T011 and T012 in parallel (Phase 4, different files)
- T014 and T015 in parallel (Phase 5, different files)
- T017 and T018 in parallel (Phase 6)

---

## Parallel Example: User Story 1

```bash
# Backend developer (after T006 complete):
Task T009: "Add POST /api/forgot-password to Backend/routes/auth.routes.js"
Task T010: "Add POST /api/reset-password to Backend/routes/auth.routes.js" (after T009)

# Frontend developer (after Phase 2 complete, simultaneously with T009/T010):
Task T011: "Create src/ForgotPassword.jsx"
Task T012: "Create src/ResetPassword.jsx"
# Then when both done:
Task T013: "Add routes to src/App.js"
```

---

## Implementation Strategy

### MVP First (User Story 3 + User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US3 (remove register) — immediate security fix
4. Complete Phase 4: US1 (forgot-password flow) — core new feature
5. **STOP and VALIDATE**: Test full forgot-password flow (quickstart.md)
6. Demo-ready after Phase 4

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US3 → login page is secure, register route gone (minimal change, high impact)
3. US1 → forgot-password flow live (users can self-recover)
4. US2 → edge cases handled gracefully (polish pass)
5. Polish → verified and confirmed

### Suggested MVP Scope

Phases 1–4 (T001–T013) deliver the complete, shippable feature. Phase 5 (US2) adds polish but the core is functional without it — expired tokens already return an error; Phase 5 only improves the UI messaging.

---

## Notes

- [P] tasks = operate on different files, no dependencies on in-progress tasks
- [Story] label maps each task to its user story for traceability
- US3 and US1 are both P1 — tackle US3 first (pure deletion, lowest risk) then US1
- The backend neutral response on unknown email (FR-007) is implemented in T009 — no separate task needed
- Token invalidation on new request (research decision 6) is part of T009's transaction logic
- nodemailer transport errors in sendResetEmail (mailer.js) should throw — T009 catches and still returns neutral 200 to prevent enumeration
