# Implementation Plan: Admin User Profile Management

**Branch**: `003-admin-user-profiles` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-admin-user-profiles/spec.md`

## Summary

Enhance the `/admin` page by replacing the primitive inline form and browser dialogs with a full-profile modal (create & edit), SweetAlert2 notifications/confirmations throughout, and an extended `users` DB table (`first_name`, `last_name`, `phone`). The user table gains new columns and cross-field search.

## Technical Context

**Language/Version**: JavaScript — React 18 (frontend), Node.js 18+ / Express 5 (backend)  
**Primary Dependencies**: sweetalert2 (new, frontend); existing: React Router, Joi, bcrypt, pg, express-rate-limit  
**Storage**: PostgreSQL — `users` table extended with 3 nullable columns via migration 007  
**Testing**: Manual (no automated test framework configured)  
**Target Platform**: Web SPA — `/admin` route, desktop browser  
**Project Type**: Web SPA feature enhancement  
**Performance Goals**: Modal opens instantly (<100ms); table search filters in real-time (<100ms)  
**Constraints**: Admin-only page (enforced by `requireAuth(["admin"])`); edit modal must not expose password field  
**Scale/Scope**: Single-tenant system; user count in tens to low hundreds

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Data Integrity | ✅ PASS | Migration adds nullable columns only; existing rows unaffected; updates go through validated API |
| II. Real-Time Accuracy | ✅ N/A | Admin UX feature; no stock quantities involved |
| III. Audit Trail | ✅ PASS | User profile edits are not stock operations; no audit trail required beyond existing patterns |
| IV. Role-Based Access | ✅ PASS | `requireAuth(["admin"])` already guards all `/api/users` endpoints |
| V. RESTful API-First | ✅ PASS | Existing endpoints extended to accept/return new profile fields; no breaking changes |

Post-Phase-1 re-check: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-user-profiles/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-contracts.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
Backend/
├── migrations/
│   └── 007_add_user_profile_columns.sql     # NEW
├── schemas/
│   └── user.schema.js                        # MODIFIED
└── routes/
    └── user.routes.js                         # MODIFIED

src/
├── Admin.jsx                                  # MODIFIED (major rewrite)
└── Admin.css                                  # MODIFIED (modal styles)
```

**Structure Decision**: Web application (Option 2). Backend is `Backend/`, frontend is `src/`. No new files/components needed — all changes are contained in the existing Admin page and its backend counterpart.
