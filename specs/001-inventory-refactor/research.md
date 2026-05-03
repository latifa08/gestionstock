# Research: Inventory System Core Enhancement & Refactor

**Feature**: 001-inventory-refactor
**Date**: 2026-04-29

## Decision 1: Authentication Strategy

**Decision**: JWT (JSON Web Tokens) with short-lived access tokens (15min) + refresh tokens (7 days) stored in HTTP-only cookies.

**Rationale**: The existing system has no auth at all. JWTs are stateless (no DB lookup on every request), which suits the Express architecture. HTTP-only cookies prevent XSS-based token theft. The existing `bcrypt` dependency is already in use for passwords. `jsonwebtoken` (npm) is the standard implementation.

**Alternatives considered**:
- Session-based (express-session + PostgreSQL session store): Requires DB hit per request; adds infrastructure complexity for a single-server deployment.
- OAuth2/SSO: Overkill for an internal warehouse tool with no external identity providers.

---

## Decision 2: Authorization Middleware Pattern

**Decision**: Express middleware functions per role, applied to route groups using `express.Router()`.

**Rationale**: The current server.js is a flat file with no route grouping. Refactoring into grouped routers (e.g., `adminRouter`, `magasinierRouter`) allows clean role-gating with a single middleware call per group. No need for a full RBAC library.

**Alternatives considered**:
- Per-endpoint role checks inline: Duplicates logic across 30+ endpoints.
- CASL or similar RBAC library: Adds a new dependency and learning curve; overkill for 3 static roles.

---

## Decision 3: Input Validation Library

**Decision**: `Joi` for server-side schema validation on all request bodies.

**Rationale**: Joi is battle-tested, has excellent PostgreSQL-safe type coercion, and allows reusable schema objects. The existing codebase has no validation library; Joi requires zero configuration to add to Express routes.

**Alternatives considered**:
- Zod: TypeScript-first; less natural in a plain JS Express project without TS migration.
- express-validator: More verbose for complex nested objects like invoice line items.
- Manual if/else: Already proven insufficient in the existing code.

---

## Decision 4: Stock Source of Truth

**Decision**: `produits.quantite` remains as a denormalized cache for performance (it is what clients currently read), but it MUST always be updated inside the same database transaction as the movement insert. The rapport-stock endpoint is updated to use `produits.quantite` directly rather than recomputing from movements.

**Rationale**: Recomputing stock from all movements on every page load is expensive as data grows. The bug is not the dual-source approach — it is that `/api/vente` updates stock outside a transaction. Fixing the transaction boundary resolves the divergence while keeping the fast read path.

**Alternatives considered**:
- Derived-only (no `produits.quantite`): Pure consistency, but every stock read requires a SUM over movements. Acceptable now, but a performance cliff at scale.
- Event sourcing: Architecturally correct but a complete rewrite; out of scope.

---

## Decision 5: Soft Delete Implementation

**Decision**: Add an `archived_at TIMESTAMPTZ` column (nullable) to `produits`, `clients`, and `fournisseurs`. Archived records have a non-null timestamp. All queries add `WHERE archived_at IS NULL` by default. An admin endpoint can view archived records.

**Rationale**: Simple to implement, easy to query, preserves history, allows unarchiving. No need for a separate archived table or complex state machine.

**Alternatives considered**:
- Boolean `is_deleted` flag: Less informative (no date of archiving).
- Move to separate archive table: Adds complexity; foreign keys from mouvements need to span two tables.

---

## Decision 6: Database Migration Strategy

**Decision**: Plain SQL migration files in `/Backend/migrations/`, numbered sequentially (e.g., `001_add_fk_constraints.sql`, `002_add_archived_at.sql`). Applied manually or via a `node migrate.js` script. No ORM migrations.

**Rationale**: The project uses raw SQL (pg Pool queries) throughout. Introducing Knex or Sequelize migrations would require rethinking all queries. Plain SQL files are transparent, reviewable, and reversible.

**Alternatives considered**:
- Knex migrations: Would require migrating all 30+ raw queries; out of scope for this refactor.
- Flyway/Liquibase: Java tools; adds a cross-language dependency for a Node project.

---

## Decision 7: Duplicate Route Fix

**Decision**: The duplicate `/products` GET and `/clients` GET routes (defined twice in server.js at lines 32 and 328) will be consolidated. The second registration (lines 323–330) will be deleted. Express uses the first matching handler, so the duplicate was silently ignored, but it creates maintenance confusion.

**Rationale**: Express.js registers handlers in order and uses the first match. The duplicate is dead code. Removing it is a safe, zero-risk change.

---

## Decision 8: Ventes Table Population

**Decision**: The `/api/vente` endpoint will be updated to insert into `ventes` and `vente_details` tables (currently unused) within the same transaction as the stock decrement and movement insert.

**Rationale**: The `ventes` and `vente_details` tables exist in the schema but are never populated. This creates a permanent gap in sales history. Fixing this is low effort (add two INSERT statements to the existing transaction) and high value (complete sales ledger).

---

## Resolved Unknowns

| Unknown | Resolution |
|---------|-----------|
| Auth token strategy | JWT via `jsonwebtoken`, HTTP-only cookies |
| Validation library | `joi` |
| Stock source of truth | Keep `produits.quantite` as cached field, fix transaction boundary |
| Soft delete pattern | `archived_at TIMESTAMPTZ` column |
| Migration tooling | Plain SQL files + `node migrate.js` helper |
| Ventes table | Populate in `/api/vente` transaction |
