# Data Model: Admin User Profile Management

**Branch**: `003-admin-user-profiles` | **Date**: 2026-04-29

---

## Modified Table: `users`

| Column       | Type           | Constraints                              | Change    |
|--------------|----------------|------------------------------------------|-----------|
| id           | SERIAL         | PRIMARY KEY                              | existing  |
| email        | VARCHAR(255)   | NOT NULL, UNIQUE                         | existing  |
| password     | VARCHAR(255)   | NOT NULL (bcrypt hash)                   | existing  |
| role         | VARCHAR(50)    | NOT NULL, DEFAULT 'magasinier'           | existing  |
| first_name   | VARCHAR(100)   | NULL allowed                             | **NEW**   |
| last_name    | VARCHAR(100)   | NULL allowed                             | **NEW**   |
| phone        | VARCHAR(30)    | NULL allowed                             | **NEW**   |
| created_at   | TIMESTAMPTZ    | DEFAULT NOW()                            | **NEW if absent** |

**Display rules**:
- Full name = `first_name || ' ' || last_name`; if both NULL show `—`
- Phone NULL → display `—`
- created_at formatted as `DD/MM/YYYY` in the table

---

## Migration File

**File**: `Backend/migrations/007_add_user_profile_columns.sql`

```sql
-- Migration 007: Add profile columns to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
```
