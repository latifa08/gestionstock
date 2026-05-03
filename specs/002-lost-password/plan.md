# Implementation Plan: Lost Password & Login Page Cleanup

**Branch**: `002-lost-password` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-lost-password/spec.md`

## Summary

Replace the self-registration UI on the login page with a forgot-password flow. Users enter their email, receive a single-use time-limited reset link via email (nodemailer), and set a new password. The public `POST /api/register` endpoint is removed. Account creation remains exclusively in the admin panel (`POST /api/users`, already admin-gated).

## Technical Context

**Language/Version**: JavaScript — Node.js 18+ (backend), React 18 (frontend)  
**Primary Dependencies**: Express 5, bcrypt, jsonwebtoken, pg, express-rate-limit, nodemailer (new), crypto (built-in Node)  
**Storage**: PostgreSQL 12+ — new table `password_reset_tokens`  
**Testing**: Manual integration testing (no automated test framework currently configured)  
**Target Platform**: Web — browser SPA (React) + Node.js REST API  
**Project Type**: Web service (REST API) + Single-Page Application  
**Performance Goals**: Reset email delivered within 2 minutes; reset endpoint responds within 500ms  
**Constraints**: Rate-limit forgot-password to 3 requests/hour per email; reset links expire in 1 hour; single-use tokens  
**Scale/Scope**: Single-tenant inventory management system, existing user base

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Data Integrity | ✅ PASS | Password update + token invalidation wrapped in a DB transaction |
| II. Real-Time Accuracy | ✅ N/A | Auth feature; no stock quantities involved |
| III. Audit Trail | ✅ PASS | Reset requests logged with timestamp and user ID |
| IV. Role-Based Access | ✅ PASS | `POST /api/register` removed from public routes; admin account creation unchanged |
| V. RESTful API-First | ✅ PASS | New endpoints follow REST conventions with structured JSON responses |

**Technical Standards**:
- Schema validation (joi) on all new request bodies ✅
- Rate limiting on forgot-password endpoint ✅
- No secrets in code — SMTP credentials via environment variables ✅
- `nodemailer` transport error handled gracefully with user-facing message ✅

Post-Phase-1 re-check: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-lost-password/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-contracts.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
Backend/
├── .env                          # Add SMTP_* vars
├── migrations/
│   └── 006_create_password_reset_tokens.sql   # NEW
├── routes/
│   ├── auth.routes.js            # MODIFIED: remove /register, add /forgot-password, /reset-password
│   └── user.routes.js            # UNCHANGED (admin account creation stays)
├── schemas/
│   └── auth.schema.js            # NEW: forgot-password + reset-password Joi schemas
└── services/
    └── mailer.js                 # NEW: nodemailer transporter + sendResetEmail()

src/
├── Login.js                      # MODIFIED: remove register toggle, add forgot-password link
├── ForgotPassword.jsx            # NEW: forgot-password form page
├── ResetPassword.jsx             # NEW: reset-password form page (reads token from URL)
└── App.js / routes               # MODIFIED: add /forgot-password and /reset-password routes
```

**Structure Decision**: Web application (Option 2). Backend is `Backend/`, frontend is `src/`. New backend service layer introduced for mailer to keep routes thin.
