# API Contracts: Lost Password & Login Page Cleanup

**Branch**: `002-lost-password` | **Date**: 2026-04-29  
**Base URL**: `http://localhost:5000/api`

---

## Removed Endpoint

### `POST /api/register` — REMOVED

This public endpoint is deleted. Any request to it returns `404 Not Found`.

---

## New Endpoints

### `POST /api/forgot-password`

Request a password reset email. Always returns the same neutral response regardless of whether the email is registered (prevents account enumeration).

**Auth**: None (public)  
**Rate limit**: 3 requests / 1 hour / IP

**Request body**:
```json
{
  "email": "user@example.com"
}
```

**Validation**:
- `email`: required, valid email format

**Response — always 200 (neutral)**:
```json
{
  "success": true,
  "message": "If that email is registered, a reset link has been sent."
}
```

**Response — validation error (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid email address"
}
```

**Response — rate limit exceeded (429)**:
```json
{
  "success": false,
  "code": "TOO_MANY_REQUESTS",
  "message": "Too many reset attempts. Try again later."
}
```

**Side effects (when email is found)**:
1. All existing password reset tokens for that user are deleted
2. A new token is inserted with `expires_at = NOW() + 1 hour`
3. An email is sent to the address with the reset link: `{APP_BASE_URL}/reset-password?token={token}`

---

### `POST /api/reset-password`

Submit a new password using a valid reset token.

**Auth**: None (public, token acts as credential)  
**Rate limit**: Inherits default Express rate limiter (no extra limiter needed — the token itself is single-use)

**Request body**:
```json
{
  "token": "a3f1...64-char-hex...",
  "password": "newSecurePassword123"
}
```

**Validation**:
- `token`: required, string, 64 characters
- `password`: required, string, minimum 6 characters

**Response — success (200)**:
```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Response — invalid or expired token (400)**:
```json
{
  "success": false,
  "code": "INVALID_TOKEN",
  "message": "Reset link is invalid or has expired."
}
```

**Response — validation error (400)**:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Password must be at least 6 characters."
}
```

**Side effects (on success)**:
1. `users.password` updated to bcrypt hash of new password (cost 10)
2. `password_reset_tokens.used` set to `true`
3. Steps 1 and 2 occur atomically in a single DB transaction

---

## Unchanged Endpoints (for reference)

| Method | Path             | Auth         | Purpose                        |
|--------|------------------|--------------|--------------------------------|
| POST   | /api/login       | None         | Authenticate user              |
| POST   | /api/auth/refresh| Cookie       | Refresh access token           |
| POST   | /api/logout      | Cookie       | Invalidate refresh token       |
| GET    | /api/users       | Admin JWT    | List all users                 |
| POST   | /api/users       | Admin JWT    | Create new user (admin only)   |
| PUT    | /api/users/:id   | Admin JWT    | Update user                    |
| DELETE | /api/users/:id   | Admin JWT    | Delete user                    |
