# Tasks: Admin User Profile Management

**Input**: Design documents from `specs/003-admin-user-profiles/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependency and prepare migration SQL before any code changes.

- [X] T001 Install sweetalert2: run `npm install sweetalert2` from the repo root (not Backend/) and verify it appears in the root package.json dependencies
- [X] T002 [P] Create `Backend/migrations/007_add_user_profile_columns.sql` with: `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100), ADD COLUMN IF NOT EXISTS last_name VARCHAR(100), ADD COLUMN IF NOT EXISTS phone VARCHAR(30), ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`
- [X] T003 Run `node Backend/migrate.js` from repo root and verify output shows `✅ Applied 007_add_user_profile_columns.sql` (depends on T002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend schema and route changes that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Update `Backend/schemas/user.schema.js`: add optional fields to both `createUserSchema` (first_name: Joi.string().max(100), last_name: Joi.string().max(100), phone: Joi.string().max(30)) and `updateUserSchema` (same three fields, all optional)
- [X] T005 Update the GET `/api/users` handler in `Backend/routes/user.routes.js`: change the SELECT query from `SELECT id, email, role` to `SELECT id, email, role, first_name, last_name, phone, created_at` so all profile fields are returned in the response array
- [X] T006 Update the POST `/api/users` handler in `Backend/routes/user.routes.js`: destructure `first_name, last_name, phone` from `req.body` alongside existing fields; change the INSERT query to `INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES ($1,$2,$3,$4,$5,$6)` passing the new values (use `|| null` for undefined optional fields)
- [X] T007 Update the PUT `/api/users/:id` handler in `Backend/routes/user.routes.js`: add `first_name`, `last_name`, and `phone` to the dynamic field builder — check if each is defined (not undefined) before adding to the `fields` array and `values` array, following the same pattern used for `email` and `role`

**Checkpoint**: Backend returns and accepts all profile fields. Verify with curl or Postman before proceeding.

---

## Phase 3: User Story 1 - Create User with Full Profile via Modal (Priority: P1) 🎯 MVP

**Goal**: Replace the inline form with a modal that collects first name, last name, email, password, phone, and role.

**Independent Test**: Click "Add User" → modal opens with all 6 fields → fill and submit → new row in table shows full name and phone → success SweetAlert toast appears.

- [X] T008 [US1] In `src/Admin.jsx`: add `modalMode` state (null | 'create' | 'edit'), `modalForm` state object `{first_name:'', last_name:'', email:'', password:'', phone:'', role:'magasinier'}`, and `modalLoading` boolean state; add a `UserModal` inline component (or JSX block) that renders a `.modal-overlay` div containing a `.modal-box` with: an `<h3>` title (create vs edit), controlled inputs for first name, last name, email, password (hidden when edit mode), phone, and a role `<select>`; add backdrop click to close; add a Cancel button that resets and closes; replace the entire `.form-admin` div with a single `<button onClick={() => setModalMode('create')}>Ajouter un utilisateur</button>`
- [X] T009 [US1] In `src/Admin.jsx`: import `Swal from 'sweetalert2'` at the top; implement `handleModalSubmit` async function: set `modalLoading(true)`, call `api.post('/api/users', modalForm)`, on success call `Swal.fire({icon:'success', title:'Utilisateur créé', timer:2000, toast:true, position:'top-end', showConfirmButton:false})` then `fetchUsers()` and reset/close modal; on error call `Swal.fire({icon:'error', title:'Erreur', text: err.response?.data?.message || 'Erreur serveur'})`; always set `modalLoading(false)` in finally; disable the submit button when `modalLoading` is true; wire the form `onSubmit` to `handleModalSubmit`

**Checkpoint**: Create flow fully functional with modal and SweetAlert. US1 independently complete.

---

## Phase 4: User Story 2 - Edit User Profile via Modal (Priority: P1)

**Goal**: Replace browser `prompt()` calls with a pre-filled edit modal for all profile fields.

**Independent Test**: Click "Edit" on any user → modal opens pre-filled with their current first name, last name, email, phone, role (no password field) → change first name → save → table row updates → success toast appears.

- [X] T010 [US2] In `src/Admin.jsx`: replace the `editUser(id)` function with `openEditModal(u)` that sets `modalMode='edit'` and sets `modalForm` to `{first_name: u.first_name||'', last_name: u.last_name||'', email: u.email, password:'', phone: u.phone||'', role: u.role}` and sets `selectedUser` state to `u`; in `handleModalSubmit`, add the edit branch: when `modalMode==='edit'` call `api.put('/api/users/'+selectedUser.id, {first_name, last_name, email, phone, role})` (omit password); show success toast and refresh table on success; update the Edit button in the table to call `openEditModal(u)` passing the full user object `u`; hide the password input in the modal when `modalMode==='edit'`

**Checkpoint**: Edit flow works with pre-filled modal. US2 independently complete.

---

## Phase 5: User Story 3 - Delete with SweetAlert Confirmation (Priority: P2)

**Goal**: Replace `window.confirm()` with a branded SweetAlert2 confirmation dialog.

**Independent Test**: Click "Delete" → SweetAlert dialog appears with user's name → cancel → nothing happens → click Delete again → confirm → row removed → success toast appears. No browser native dialog appears at any point.

- [X] T011 [US3] In `src/Admin.jsx`: replace the `window.confirm('Delete user?')` call in `deleteUser` with: `const result = await Swal.fire({title:'Supprimer cet utilisateur ?', text: \`${u.first_name || ''} ${u.last_name || u.email}\`.trim(), icon:'warning', showCancelButton:true, confirmButtonColor:'#e74c3c', confirmButtonText:'Supprimer', cancelButtonText:'Annuler'})`; only proceed with `api.delete(...)` if `result.isConfirmed`; on success show a success toast; on error show a `Swal.fire({icon:'error',...})` with the server error message; update the Delete button in the table to call `deleteUser(u)` passing the full user object `u` (not just `u.id`)

**Checkpoint**: All three CRUD operations use SweetAlert. Zero native browser dialogs remain. US3 complete.

---

## Phase 6: User Story 4 - Enhanced Table with Profile Columns (Priority: P2)

**Goal**: Show enriched columns in the user table and improve search to cover all profile fields.

**Independent Test**: Create a user with full profile → table shows columns: Nom complet, Email, Téléphone, Rôle, Créé le, Actions → search by first name filters correctly → user with no phone shows "—".

- [X] T012 [US4] In `src/Admin.jsx`: update the `<thead>` to columns `[Nom complet, Email, Téléphone, Rôle, Créé le, Actions]`; update each `<tbody>` row to display: full name as `` `${u.first_name||''} ${u.last_name||''}`.trim() || '—' ``, `u.phone || '—'`, `u.role`, creation date as `u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'`; update the `filtered` const to filter across `` `${u.first_name||''} ${u.last_name||''} ${u.email} ${u.role||''} ${u.phone||''}`.toLowerCase().includes(search.toLowerCase()) ``
- [X] T013 [US4] In `src/Admin.css`: add modal styles — `.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }` — `.modal-box { background: #1e1e2e; border-radius: 12px; padding: 2rem; width: 480px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }` — `.modal-box h3 { margin-bottom: 1.5rem; color: #a78bfa; }` — `.modal-box input, .modal-box select { width: 100%; margin-bottom: 1rem; }` — `.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem; }`

**Checkpoint**: Table shows all profile columns. Search works across all fields. US4 complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T014 Manual end-to-end test following `specs/003-admin-user-profiles/quickstart.md`: create user with full profile, edit, delete, search — all verified with SweetAlert2 UI
- [X] T015 [P] Verify no native browser dialogs remain: search `src/Admin.jsx` for `window.confirm`, `window.alert`, and `prompt(` — confirm zero occurrences

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: T001 and T002 in parallel immediately; T003 depends on T002
- **Phase 2**: T004–T007 all depend on T003 (migration must be applied); T004 is independent of T005-T007; T005→T006→T007 are sequential (same file)
- **Phase 3 (US1)**: Depends on Phase 2 complete; T008→T009 sequential (same file)
- **Phase 4 (US2)**: Depends on T008+T009 (modal must exist); T010 extends the modal
- **Phase 5 (US3)**: Depends on Phase 2; can run in parallel with Phase 3/4 (same file but after T008)
- **Phase 6 (US4)**: Depends on Phase 2; T012 and T013 are parallel (different files)
- **Phase 7**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2
- **US2 (P1)**: Depends on US1 (modal component must exist from T008)
- **US3 (P2)**: Can start after Phase 2; only needs Swal import from T009
- **US4 (P2)**: Can start after Phase 2; T012 and T013 are independent of US1/US2/US3

### Parallel Opportunities

- T001 ‖ T002 (Phase 1)
- T004 ‖ T005 (different files — schema vs routes)
- T012 ‖ T013 (Admin.jsx vs Admin.css)
- T014 ‖ T015 (Phase 7)

---

## Parallel Example: Phase 2

```bash
# Can run simultaneously:
Task T004: "Update user.schema.js — add profile fields to Joi schemas"
Task T005: "Update user.routes.js GET — return profile fields"

# Then sequentially on user.routes.js:
Task T006: "Update POST handler to accept profile fields"
Task T007: "Update PUT handler to accept profile fields"
```

---

## Implementation Strategy

### MVP (US1 + US2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (backend)
3. Complete Phase 3: US1 (create modal)
4. Complete Phase 4: US2 (edit modal)
5. **STOP and VALIDATE**: Both modal flows work end-to-end
6. Demo-ready after Phase 4

### Incremental Delivery

1. Setup + Foundational → backend ready for new fields
2. US1 → create modal live (core UX improvement)
3. US2 → edit modal live (replaces ugly prompts)
4. US3 → SweetAlert delete (polish)
5. US4 → richer table (polish)
6. Phase 7 → verified complete

### Notes

- [P] tasks = different files, no inter-task dependencies
- US3 can be developed in parallel with US2 by a second developer after T001 (Swal installed)
- US4's T013 (CSS) can be written any time after T001 — it has no JS dependencies
- The modal password field is hidden in edit mode — this is enforced in T010
