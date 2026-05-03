# Research: Lost Password & Login Page Cleanup

**Branch**: `002-lost-password` | **Date**: 2026-04-29

---

## 1. Reset Token Strategy: UUID vs JWT

**Decision**: Use a cryptographically random UUID/hex token stored in the database, not a JWT.

**Rationale**: JWTs for password resets are self-contained and cannot be individually revoked without a blocklist. A database-stored token can be invalidated instantly (single-use flag, row deletion, or cascading on new token insert). The `crypto.randomBytes(32).toString('hex')` approach generates 256-bit entropy — sufficient for a reset token.

**Alternatives Considered**:
- JWT with short expiry: Cannot be invalidated on first use without DB lookup, which removes the benefit of JWTs.
- UUID v4: Also acceptable but `crypto.randomBytes` is equally random and avoids an external dependency.

---

## 2. Nodemailer Transport Configuration

**Decision**: Use nodemailer with SMTP transport. Credentials are loaded from environment variables, not hardcoded.

**Rationale**: The project already uses a `.env` module pattern (not dotenv). SMTP is the most universally compatible transport. For development, a service like Mailtrap or Ethereal (nodemailer's built-in test account) can be used without a real email provider.

**Alternatives Considered**:
- SendGrid/Mailgun SDK: Adds an external service dependency; SMTP is sufficient and avoids vendor lock-in.
- Nodemailer with Gmail: Works but requires app-specific passwords and is not suitable for production scale.

**Environment variables to add to `Backend/.env`**:
```
SMTP_HOST: e.g., smtp.mailtrap.io
SMTP_PORT: 587
SMTP_USER: (from email provider)
SMTP_PASS: (from email provider)
SMTP_FROM: noreply@memoir-l3.local
APP_BASE_URL: http://localhost:3000 (frontend URL for reset link)
```

---

## 3. Rate Limiting for Forgot-Password Endpoint

**Decision**: Apply `express-rate-limit` with a window of 1 hour and a max of 3 requests per IP. Use the existing `express-rate-limit` package already in `Backend/package.json`.

**Rationale**: The login limiter already uses `express-rate-limit` (5 attempts per 15 minutes per IP). Consistent approach. The forgot-password limiter is more lenient (3/hour) because false positives are costly (locks out legitimate users), but tight enough to prevent email flooding.

**Alternatives Considered**:
- Per-email rate limiting: More precise but requires DB lookup on every request before the neutral response. IP-based is simpler and sufficient.
- Separate Redis store: Overkill for single-tenant system of this scale.

---

## 4. Frontend Routing for Reset Flow

**Decision**: Add two new public routes: `/forgot-password` (email submission form) and `/reset-password` (new password form, reads `?token=...` from the query string).

**Rationale**: The existing React app uses `react-router-dom`. Adding new page components for each step keeps separation clear and avoids overloading the Login page. The reset token travels in the URL query string (standard practice); it is single-use and time-limited, so exposure in browser history is acceptable.

**Alternatives Considered**:
- Embed reset in Login.js as another mode: Login.js is already complex (login + register modes). Adding a third mode increases coupling; separate components are cleaner.
- Token in URL path param: Query string (`?token=`) is standard and works with all router configurations.

---

## 5. Removing `POST /api/register`

**Decision**: Remove the `POST /api/register` route from `auth.routes.js` entirely. The admin-only account creation endpoint `POST /api/users` in `user.routes.js` already exists and is protected.

**Rationale**: The public register endpoint has no legitimate use case per business rules. Removing it is safer than disabling (no dead code, no accidental re-enablement). The `handleRegister` function in `Login.js` and the `isRegister` state toggle are also removed.

**Impact**: Any direct POST to `/api/register` will return Express's default 404. No migration needed — the `users` table schema is unchanged.

---

## 6. Token Invalidation on New Request

**Decision**: When a new reset is requested for the same email, DELETE all existing unexpired tokens for that user before inserting the new one.

**Rationale**: Prevents confusion if a user requests multiple resets. Only the most recent link works. Implemented atomically with the INSERT in a single transaction.
