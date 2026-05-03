<!--
SYNC IMPACT REPORT
==================
Version Change: 0.0.0 → 1.0.0 (MINOR - Initial constitution with 5 core principles + governance)
Modified Principles: N/A (new document)
Added Sections: Core Principles, Technical Standards, Development Workflow, Governance
Removed Sections: N/A
Templates Updated: ✅ plan-template.md (Constitution Check section aware), ✅ spec-template.md (implicit compliance), ⚠ tasks-template.md (principle-driven categorization pending manual review)
Follow-up TODOs: None - all placeholders filled
-->

# Memoir L3 Inventory Management System Constitution

Governing principles and non-negotiable standards for the Memoir L3 inventory management platform.

## Core Principles

### I. Data Integrity (NON-NEGOTIABLE)
Every inventory transaction—product creation, stock movement, client/supplier interaction, or invoice generation—MUST be recorded atomically. No partial updates. Database transactions MUST rollback on any error. Stock quantities are the single source of truth; calculated fields are derived from transactions, never stored directly. All modifications are audited with timestamps, user IDs, and reason codes.

### II. Real-Time Accuracy
Stock levels MUST reflect actual inventory within seconds of any transaction. Client-facing stock displays show current counts directly from the database; cached values are acceptable only with explicit TTL and staleness warnings. Barcode scans MUST complete the movement (not queue) before confirming to the user.

### III. Audit Trail & Traceability
Every inventory movement (in/out, adjustment, loss, transfer) creates an immutable log entry. Entries include: timestamp, user, product, quantity, reason, client/supplier context, and cost basis. Reports and reconciliation tools read from this log, never from derived state. Deletions are forbidden; corrections use reversals (e.g., -5 units + +3 units = net -2, not a modification).

### IV. Role-Based Access & Permissions
Three minimum roles: Admin (system + user management), Warehouse (stock operations + barcode scans), Sales (view-only stock, create invoices). Clients and Suppliers are limited to their own invoices/orders. Permissions are declarative, checked at API layer and enforced in UI. No role elevation without explicit audit.

### V. RESTful API-First Design
Backend exposes all operations via REST endpoints. Frontend is a consumer, not special-cased. Endpoints return structured JSON with status codes, not HTML. Error responses include error codes, messages, and actionable next steps. API contracts are versioned; breaking changes require new endpoints or deprecated-header warnings.

## Technical Standards

**Language & Runtime**: React 19+ (frontend), Node.js + Express 5+ (backend), PostgreSQL 12+ (primary storage)

**Database Integrity**: 
- Foreign keys enforced (not suggested)
- Constraints on stock quantities (no negatives unless reversal), prices (non-zero), dates (logical order)
- Transactions for multi-table operations (e.g., product creation + initial stock entry)
- Backups: daily automated, retention ≥30 days, tested recovery quarterly

**Client-Server Communication**:
- HTTPS enforced in production
- CORS whitelist specific domains; never use `*`
- Request/response payloads validated against schema (e.g., zod, joi)
- Rate limiting on auth endpoints (5 failed logins → 15min lockout per IP)

**Code Quality**:
- Linting: ESLint (frontend), Node/Prettier standards (backend)
- Testing: Unit tests for business logic (taxes, discounts, stock math); integration tests for multi-table workflows
- Type safety: PropTypes (React) or TypeScript migration preferred for future refactors
- No console.log in production code; use structured logging (info/warn/error)

## Development Workflow

**Branching**: Feature branches from `main` with naming convention `<issue-number>-<slug>` (e.g., `23-add-barcode-scanner`)

**Code Review**:
- All PRs require at least one approval before merge
- Reviews must verify: no data loss, audit trail completeness, role enforcement, error handling
- Reviewer checklist: "Does this change violate any principle?"

**Testing Gate**:
- New endpoints require tests covering success + error cases
- Stock-affecting operations require a test that verifies audit log entry
- Zero tolerance for secrets in commits (API keys, database passwords)

**Deployment**:
- All merges trigger automated tests; only passing builds deploy
- Database migrations run in transaction; rollback on error
- Canary deploys: 10% traffic for 1 hour before full rollout
- On-call engineer monitors for stock data anomalies post-deploy

**Documentation**:
- API endpoints documented in code comments (method, path, auth, example request/response)
- Database schema documented in a `schema.md` or ER diagram in `/docs`
- Runbooks for common incidents: "Stock count mismatch", "User locked out", "API rate limit exceeded"

## Governance

**Constitution Authority**:
This Constitution supersedes all other informal practices and guidelines. It is the single source of truth for non-negotiable standards. Deviations require explicit written amendment (see amendment process).

**Amendment Procedure**:
1. Propose change with rationale (why the principle/rule is insufficient)
2. Review with lead architect and any affected teams (warehouse, sales, ops)
3. Approve with explicit version bump and date
4. Notify all developers of change via team channel
5. Update dependent templates (plan, spec, tasks) within 1 sprint

**Versioning**:
Follows MAJOR.MINOR.PATCH:
- **MAJOR**: Removes or redefines a principle (rare, requires stakeholder approval)
- **MINOR**: Adds principle, expands technical standards, adds new roles
- **PATCH**: Clarifications, wording fixes, no semantic change

**Compliance Review**:
- Every PR references this constitution during review ("Principle I: audit trail verified")
- Quarterly: Audit 10 random PRs for principle alignment; report to team
- Annually: Stakeholders (architect, product, ops) review and amend as needed

**Guidance Documents**:
Runtime behavior and developer ergonomics are documented separately in `CLAUDE.md` and project README. The Constitution governs non-negotiable rules; guidance documents explain preferred patterns.

---

**Version**: 1.0.0 | **Ratified**: 2026-04-29 | **Last Amended**: 2026-04-29
