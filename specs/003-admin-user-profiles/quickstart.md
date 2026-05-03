# Quickstart: Admin User Profile Management

**Branch**: `003-admin-user-profiles` | **Date**: 2026-04-29

---

## 1. Install SweetAlert2 (frontend)

```bash
# from repo root (not Backend/)
npm install sweetalert2
```

---

## 2. Run the database migration

```bash
cd Backend
node migrate.js
```

Expected output: `✅ Applied 007_add_user_profile_columns.sql`

---

## 3. Restart the backend

```bash
cd Backend
npm start
```

---

## 4. Start the frontend

```bash
# from repo root
npm start
```

---

## 5. Test create flow

1. Log in as admin at `http://localhost:3000/login`
2. Navigate to `/admin`
3. Click **"Add User"** — modal should open
4. Fill: First name, Last name, Email, Password, Phone (optional), Role
5. Submit — SweetAlert success toast appears, new row in table with all profile fields

---

## 6. Test edit flow

1. Click **"Edit"** on any user row
2. Modal opens pre-filled with current data
3. Change first name and role, save
4. Table row updates immediately with new values

---

## 7. Test delete flow

1. Click **"Delete"** on a non-admin user
2. SweetAlert confirmation dialog appears (not browser confirm())
3. Confirm — user removed, success toast shown
4. Cancel — nothing happens

---

## 8. Test search

1. Type a partial first name in the search box — table filters in real-time
2. Type an email fragment — also filters
3. Clear the box — all users shown again

---

## 9. Edge case checks

| Scenario | Expected |
|----------|----------|
| Submit create modal with empty required fields | Inline validation, no API call |
| Create user with existing email | SweetAlert error: "User already exists" |
| Delete the admin account | SweetAlert error from server |
| Edit user, leave email blank | Validation error shown in modal |
