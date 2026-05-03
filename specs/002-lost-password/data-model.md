# Data Model: Lost Password & Login Page Cleanup

**Branch**: `002-lost-password` | **Date**: 2026-04-29

---

## Existing Tables (unchanged)

### `users`
| Column     | Type         | Constraints                        |
|------------|--------------|------------------------------------|
| id         | SERIAL       | PRIMARY KEY                        |
| email      | VARCHAR(255) | NOT NULL, UNIQUE                   |
| password   | VARCHAR(255) | NOT NULL (bcrypt hash)             |
| role       | VARCHAR(50)  | NOT NULL, DEFAULT 'magasinier'     |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()                      |

---

## New Table

### `password_reset_tokens`

Stores single-use, time-limited tokens for the forgot-password flow.

| Column     | Type         | Constraints                                           |
|------------|--------------|-------------------------------------------------------|
| id         | SERIAL       | PRIMARY KEY                                           |
| user_id    | INTEGER      | NOT NULL, REFERENCES users(id) ON DELETE CASCADE      |
| token      | VARCHAR(128) | NOT NULL, UNIQUE (64-char hex from 32 bytes random)   |
| expires_at | TIMESTAMPTZ  | NOT NULL (created_at + 1 hour)                        |
| used       | BOOLEAN      | NOT NULL, DEFAULT false                               |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()                                         |

**Indexes**:
- `idx_prt_token` ON `password_reset_tokens(token)` — fast lookup during reset
- `idx_prt_user` ON `password_reset_tokens(user_id)` — fast deletion when new reset requested

**Validation rules**:
- `token` must be 64 hex characters (256-bit entropy)
- `expires_at` must be exactly `NOW() + INTERVAL '1 hour'` at insert time
- `used` flips to `true` atomically with the password UPDATE (same transaction)
- Old tokens for the same `user_id` are deleted before inserting a new one (same transaction)

**Lifecycle**:
```
INSERT (new request)
  → DELETE old tokens for user_id (same tx)
  → INSERT new token (used=false, expires_at=now+1h)

VALIDATE (reset submission)
  → SELECT WHERE token=? AND used=false AND expires_at > NOW()
  → If found: UPDATE users SET password=? (same tx) + UPDATE token SET used=true

CLEANUP (optional background job, not required for MVP)
  → DELETE WHERE expires_at < NOW() OR used=true
```

---

## Migration File

**File**: `Backend/migrations/006_create_password_reset_tokens.sql`

```sql
-- Migration 006: Create password_reset_tokens table for forgot-password flow

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user  ON password_reset_tokens(user_id);
```
