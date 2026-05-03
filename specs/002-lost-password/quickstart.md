# Quickstart: Lost Password & Login Page Cleanup

**Branch**: `002-lost-password` | **Date**: 2026-04-29

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ running with the `stock` database
- An SMTP server or test account (see below)

---

## 1. Install nodemailer

```bash
cd Backend
npm install nodemailer
```

---

## 2. Configure email in `Backend/.env`

Add these keys to the existing `env` object in `Backend/.env`:

```js
SMTP_HOST: "smtp.mailtrap.io",       // or your SMTP host
SMTP_PORT: 587,
SMTP_USER: "your-smtp-username",
SMTP_PASS: "your-smtp-password",
SMTP_FROM: "noreply@memoir-l3.local",
APP_BASE_URL: "http://localhost:3000",  // frontend URL
```

**For local development without a real email provider**, create a free [Mailtrap](https://mailtrap.io) account (free tier) or use nodemailer's Ethereal test accounts:

```js
// Ethereal test account — emails are captured, not delivered
// Run once to get credentials: node -e "require('nodemailer').createTestAccount().then(console.log)"
```

---

## 3. Run the database migration

```bash
cd Backend
node migrate.js
```

This applies `006_create_password_reset_tokens.sql` and creates the `password_reset_tokens` table.

---

## 4. Start the backend

```bash
cd Backend
npm start
```

---

## 5. Start the frontend

```bash
# from repo root
npm start
```

---

## 6. Test the forgot-password flow

1. Open `http://localhost:3000/login`
2. Verify there is **no** "Créer un compte" link
3. Click "Mot de passe oublié?"
4. Enter a registered email (e.g., `admin@gmail.com`)
5. Check your Mailtrap inbox for the reset email
6. Click the reset link → you arrive at `/reset-password?token=...`
7. Enter a new password and submit
8. Try logging in with the new password

---

## 7. Test edge cases

| Scenario | Expected result |
|----------|----------------|
| Unknown email on forgot-password | Same 200 neutral response; no email sent |
| Expired token (wait 1h or update DB) | "Reset link is invalid or has expired" |
| Already-used token | Same error as expired |
| Submit forgot-password 4+ times quickly | 429 Too Many Requests on 4th attempt |
| Navigate to `/login` with registered session | Auto-redirect by role (unchanged) |

---

## 8. Verify register route is gone

```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# Expected: 404 Not Found
```
