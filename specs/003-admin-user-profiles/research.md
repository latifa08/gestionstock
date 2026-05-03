# Research: Admin User Profile Management

**Branch**: `003-admin-user-profiles` | **Date**: 2026-04-29

---

## 1. SweetAlert2 in React

**Decision**: Use `sweetalert2` (vanilla JS package) directly — no React wrapper needed.

**Rationale**: `sweetalert2-react-content` adds complexity without benefit for this use case. The vanilla `Swal.fire()` API works perfectly from React event handlers and async functions. The package is called via `import Swal from 'sweetalert2'`.

**Usage patterns**:
```js
// Confirmation
const result = await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: 'Supprimer' });
if (result.isConfirmed) { /* proceed */ }

// Success toast
Swal.fire({ icon: 'success', title: 'Utilisateur créé', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });

// Error
Swal.fire({ icon: 'error', title: 'Erreur', text: message });
```

**Install**: `npm install sweetalert2` (frontend root, not Backend/)

---

## 2. Modal Implementation Strategy

**Decision**: Build a single reusable `UserModal` component inside `Admin.jsx` (or as a separate `UserModal.jsx` if preferred), controlled by `modalMode` state (`null | 'create' | 'edit'`) and `selectedUser` state.

**Rationale**: The create and edit flows share the same form fields; only the initial values and submit action differ. A single modal component with conditional behavior avoids duplication. CSS modal overlay is straightforward without needing a portal since the admin page has no z-index conflicts.

**Modal state shape**:
```js
const [modalMode, setModalMode] = useState(null);  // null | 'create' | 'edit'
const [selectedUser, setSelectedUser] = useState(null);
```

**Alternatives considered**:
- React Portal: Not needed — no z-index stacking issues on the admin page.
- External modal library (react-modal): Adds a dependency; CSS-only modal is sufficient.

---

## 3. DB Migration — Adding Profile Columns

**Decision**: Add `first_name VARCHAR(100)`, `last_name VARCHAR(100)`, `phone VARCHAR(30)` as nullable columns to the `users` table in migration `007_add_user_profile_columns.sql`.

**Rationale**: All three columns are nullable so existing rows (including the auto-created admin) are unaffected. No backfill needed. Phone is varchar(30) to support international formats including country codes and spaces.

**Migration file**: `Backend/migrations/007_add_user_profile_columns.sql`

---

## 4. Backend Schema & Route Changes

**Decision**: Extend `createUserSchema` and `updateUserSchema` in `user.schema.js` to accept optional `first_name`, `last_name`, `phone`. Update `GET /api/users` to return these fields. Update `POST /api/users` and `PUT /api/users/:id` to persist them.

**Rationale**: Minimal change — Joi fields are optional so existing callers (e.g., the old create flow) are not broken. The GET query just needs `first_name, last_name, phone` added to the SELECT.

---

## 5. Table Display — Created At

**Decision**: Add `created_at TIMESTAMPTZ DEFAULT NOW()` to the users table in the same migration 007 (only if it doesn't already exist — use `ADD COLUMN IF NOT EXISTS`). Return it in the GET response and display it in the table as a formatted date.

**Rationale**: The spec requires showing creation date. The column may or may not already exist depending on the initial DB setup. Using `IF NOT EXISTS` makes the migration safe either way.

---

## 6. Search Enhancement

**Decision**: Extend the existing client-side filter to match on `first_name`, `last_name`, `email`, `phone`, and `role` concatenated into a single string for comparison.

**Rationale**: All user data is already loaded into React state; no server-side search endpoint needed at this scale.
