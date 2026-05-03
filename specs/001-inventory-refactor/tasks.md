---

description: "Task list for inventory system core enhancement & refactor"
---

# Tasks: Inventory System Core Enhancement & Refactor

**Input**: Design documents from `specs/001-inventory-refactor/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/api-contracts.md ✅ | research.md ✅

**Tests**: Test tasks are included for critical auth and transaction flows per constitution compliance requirements (Principle I, IV).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create directory structure, configure environment.

- [x] T001 Install jsonwebtoken, cookie-parser, joi dependencies: run `npm install jsonwebtoken cookie-parser joi` in `Backend/`
- [x] T002 Create directory structure: `Backend/migrations/`, `Backend/middleware/`, `Backend/routes/`, `Backend/schemas/`
- [x] T003 Create directory structure for tests: `tests/integration/`, `tests/unit/`

---

## Phase 2: Foundational (Database Migrations — blocks all stories)

**Purpose**: Apply all schema changes before writing any application code. These migrations are prerequisites for every user story phase.

**Independent Test**: Run `node Backend/migrate.js` — all 5 migrations apply without errors; database schema matches `specs/001-inventory-refactor/data-model.md`.

- [x] T004 Write `Backend/migrations/001_add_archived_columns.sql`: ALTER produits, clients, fournisseurs to add `archived_at TIMESTAMPTZ DEFAULT NULL`
- [x] T005 Write `Backend/migrations/002_add_fk_constraints.sql`: ADD FK constraints on mouvements→produits, mouvements→clients, mouvements→fournisseurs, facture_details→factures, facture_details→produits, vente_details→ventes, vente_details→produits
- [x] T006 Write `Backend/migrations/003_add_audit_columns.sql`: ALTER mouvements to add `id_user INTEGER REFERENCES users(id)` and `raison VARCHAR(255)`; ALTER ventes to add `id_user INTEGER` and `id_client INTEGER`
- [x] T007 Write `Backend/migrations/004_add_db_constraints.sql`: ADD CHECK constraints on produits.quantite >= 0, produits.prix_unitaire > 0, mouvements.quantite > 0, mouvements.type IN ('entree','sortie','retour','ajustement'), users.role IN ('admin','responsable','magasinier'); ADD UNIQUE on produits.code_bar, users.email
- [x] T008 Write `Backend/migrations/005_create_refresh_tokens.sql`: CREATE TABLE refresh_tokens (id SERIAL PK, id_user FK→users, token VARCHAR(512) UNIQUE, expires_at TIMESTAMPTZ, created_at default NOW())
- [x] T009 Write `Backend/migrations/cleanup-orphans.sql`: SELECT/DELETE any mouvements rows with id_produit not in produits, id_client not in clients, id_fournisseur not in fournisseurs
- [x] T010 Write `Backend/migrations/reconcile-stock.sql`: SELECT produits where quantite != computed sum from mouvements; log discrepancies
- [x] T011 Write `Backend/migrate.js`: Node script that reads numbered SQL files from `Backend/migrations/` in order and runs each in a transaction with rollback on error; tracks applied migrations in a `schema_migrations` table
- [x] T012 Update `Backend/.env`: Add JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES=15m, JWT_REFRESH_EXPIRES=7d variables (use placeholder values; never commit real secrets)
- [x] T013 Run cleanup-orphans.sql against the `stock` database and log any removed rows
- [x] T014 Run `node Backend/migrate.js` — verify all 5 migrations apply cleanly; verify schema matches data-model.md

---

## Phase 3: User Story 1 — Secure API Access via Auth Tokens (P1)

**Goal**: Every API endpoint requires a valid JWT. Unauthenticated requests return 401. Wrong-role requests return 403. Login returns a signed token.

**Independent Test**: Using curl or an HTTP client: login → get token → call `/products` with token (200) → call `/products` without token (401) → call admin endpoint with magasinier token (403).

- [x] T015 [US1] Create `Backend/middleware/auth.js`: export `requireAuth(roles = [])` — verifies Bearer token from Authorization header using JWT_SECRET; attaches `req.user = { id, email, role }`; returns 401 if missing/invalid; returns 403 if role not in roles array
- [x] T016 [US1] Create `Backend/routes/auth.routes.js`: implement POST /api/login (verify credentials, issue access JWT + set refresh_token HTTP-only cookie), POST /api/register (hash password, validate roles), POST /api/auth/refresh (verify refresh token cookie, issue new access token), POST /api/logout (delete refresh token from DB, clear cookie)
- [x] T017 [US1] Update `Backend/server.js`: add `require('cookie-parser')` middleware; mount auth router at root; add dotenv config load at top of file
- [x] T018 [US1] Write `tests/integration/auth.test.js`: test cases — valid login returns access token + sets cookie; invalid password returns 401; expired token is rejected with 401; magasinier token on admin endpoint returns 403; refresh flow issues new access token; logout clears cookie

---

## Phase 4: User Story 2 — Consistent & Trustworthy Stock Levels (P1)

**Goal**: Multi-item sales are atomic — all succeed or all roll back. ventes/vente_details tables are populated. rapport-stock reads from produits.quantite. Duplicate routes removed.

**Independent Test**: Submit a cart where the second item has insufficient stock — verify first item's stock was NOT decremented; verify ventes table is still empty; verify rapport-stock count matches products listing count.

- [x] T019 [US2] Remove duplicate route handlers from `Backend/server.js`: delete the second `app.get('/products', ...)` and `app.get('/clients', ...)` blocks (currently at lines 323–330)
- [x] T020 [US2] Create `Backend/routes/vente.routes.js`: POST /api/vente — wrap entire cart processing in `BEGIN/COMMIT` transaction; on any stock shortfall `ROLLBACK` immediately; after decrementing all stock INSERT into `ventes` (with total, id_user, id_client) and `vente_details` (per cart item); INSERT movement per item with type='sortie' and id_user from req.user
- [x] T021 [US2] Update GET /api/rapport-stock in `Backend/server.js` (or new rapport route): replace movement-SUM computation with direct SELECT of produits.quantite, nom_produit, categorie, prix_unitaire — eliminates divergence
- [x] T022 [US2] Write `tests/integration/vente.test.js`: test — atomic rollback: cart with item A (ok) + item B (stock=0, qty=3) → 400 response, item A stock unchanged; test — successful full cart: ventes row created, vente_details rows created, mouvements rows created, produits.quantite decremented

---

## Phase 5: User Story 3 — Server-Side Input Validation (P2)

**Goal**: All POST/PUT request bodies validated against Joi schemas before DB access. Invalid requests return 400 with field-level error messages.

**Independent Test**: POST /products with empty nom_produit → 400 with errors[].field = 'nom_produit'; POST /mouvements with quantite = -5 → 400; POST /api/register with invalid email → 400.

- [x] T023 [US3] Create `Backend/middleware/validate.js`: export `validateBody(schema)` — runs Joi validation on req.body; on failure returns `{ success: false, code: 'VALIDATION_ERROR', errors: [...fieldErrors] }`; on success calls next()
- [x] T024 [P] [US3] Create `Backend/schemas/product.schema.js`: Joi schema requiring nom_produit (string, min 1), prix_unitaire (number, min 0.01), quantite (integer, min 0), niveau_alerte (integer, min 0, optional)
- [x] T025 [P] [US3] Create `Backend/schemas/client.schema.js`: Joi schema requiring nom (string, min 1); optional telephone, adresse, email (valid format), type
- [x] T026 [P] [US3] Create `Backend/schemas/fournisseur.schema.js`: Joi schema requiring nom (string, min 1); optional societe, telephone, email (valid format), adresse
- [x] T027 [P] [US3] Create `Backend/schemas/mouvement.schema.js`: Joi schema requiring id_produit (integer), type (enum: entree/sortie/retour/ajustement), quantite (integer, min 1); optional id_client, id_fournisseur, raison
- [x] T028 [P] [US3] Create `Backend/schemas/user.schema.js`: Joi schema requiring email (valid format), password (string, min 8); optional role (enum: admin/responsable/magasinier)
- [x] T029 [P] [US3] Create `Backend/schemas/vente.schema.js`: Joi schema requiring cart (array, min 1 item), each item has id_produit (integer) and quantity (integer, min 1); optional id_client

---

## Phase 6: User Story 4 — Full Audit Trail & Route Extraction (P2)

**Goal**: All route handlers extracted from monolithic server.js into separate files with requireAuth + validateBody + soft-delete. Every movement records id_user. No hard deletes on inventory entities.

**Independent Test**: Create product → add movement → archive product → verify movement history still queryable; verify movement record includes id_user matching the authenticated user's ID.

- [x] T030 [P] [US4] Create `Backend/routes/product.routes.js`: GET /products (requireAuth any), POST /products (requireAuth admin/responsable + validateBody productSchema), PUT /products/:id (requireAuth admin/responsable), DELETE /products/:id (requireAuth admin — set archived_at=NOW() instead of DELETE; return 409 if quantite > 0)
- [x] T031 [P] [US4] Create `Backend/routes/client.routes.js`: GET /clients, POST /clients (validateBody), PUT /clients/:id, DELETE /clients/:id — soft-delete; requireAuth on all
- [x] T032 [P] [US4] Create `Backend/routes/fournisseur.routes.js`: GET /fournisseurs, POST /fournisseurs (validateBody), PUT /fournisseurs/:id, DELETE /fournisseurs/:id — soft-delete; requireAuth on all
- [x] T033 [US4] Create `Backend/routes/mouvement.routes.js`: GET /mouvements, POST /mouvements (requireAuth + validateBody mouvementSchema) — populate id_user = req.user.id on every INSERT
- [x] T034 [P] [US4] Create `Backend/routes/facture.routes.js`: POST /api/facture (keep existing transaction logic, add requireAuth + id_user to movement inserts), GET /api/factures, GET /api/facture/:id, DELETE /api/facture/:id (keep rollback logic)
- [x] T035 [P] [US4] Create `Backend/routes/user.routes.js`: GET /api/users (requireAuth admin), POST /api/users (requireAuth admin + validateBody userSchema), PUT /api/users/:id (requireAuth admin), DELETE /api/users/:id (requireAuth admin — preserve no-delete-admin guard)
- [x] T036 [P] [US4] Create `Backend/routes/dashboard.routes.js`: GET /dashboard/overview, GET /dashboard/products, GET /dashboard/mouvements — all requireAuth any role
- [x] T037 [P] [US4] Create `Backend/routes/rapport.routes.js`: GET /api/rapport-stock — requireAuth any role; use updated query from T021
- [x] T038 [P] [US4] Create `Backend/routes/stock-alert.routes.js`: GET /stock-alert, GET /api/produits/:code — requireAuth any role
- [x] T039 [US4] Update `Backend/server.js`: remove all inline route handlers that were extracted in T030–T038; mount each new router; keep only db connection, middleware, and server.listen
- [x] T040 [US4] Write `tests/integration/products.test.js`: test — soft-delete: product archived with archived_at set; GET /products returns only non-archived items; archived product's movement history still queryable via GET /mouvements; test — movement has correct id_user after POST with auth

---

## Phase 7: User Story 5 — Database Referential Integrity (P3)

**Goal**: FK constraints enforced at DB level. Unique constraints prevent duplicate barcodes/emails. CHECK constraints prevent invalid data types.

**Independent Test**: Attempt direct DB insert of a mouvement with non-existent id_produit → PostgreSQL FK violation error, not application error. Attempt POST /products with duplicate code_bar → 409 response.

- [x] T041 [US5] Add error handler for PostgreSQL FK violation in `Backend/middleware/errors.js`: export `handleDbError(err, req, res, next)` — map pg error codes: 23503 (FK violation) → 409 CONFLICT, 23505 (unique violation) → 409 CONFLICT, 23514 (check violation) → 400 VALIDATION_ERROR
- [x] T042 [US5] Register `handleDbError` as Express error middleware in `Backend/server.js` (must be last `app.use` call)
- [x] T043 [US5] Verify FK constraints work end-to-end: attempt to create a movement with a fabricated non-existent id_produit via API → confirm 409 response with CONFLICT code

---

## Final Phase: Polish & Cross-Cutting Concerns

- [x] T044 Add rate limiting for auth endpoints: install `express-rate-limit`, apply to `POST /api/login` — max 5 requests per 15 minutes per IP; return 429 with message "Too many login attempts"
- [x] T045 Make CORS origin configurable: read `CORS_ORIGIN` from `Backend/.env` instead of hardcoded `http://localhost:3000` in `Backend/server.js`
- [x] T046 Remove all `console.log` calls from route handlers and replace with `console.error` for actual errors only; add a startup log summary (port, db host, env)
- [x] T047 Update `Backend/.env` to add `CORS_ORIGIN=http://localhost:3000` and document all environment variables in a comment block

---

## Dependencies

```
Phase 1 (Setup)
  └─► Phase 2 (Migrations)
        ├─► Phase 3 (US1: Auth)          ← no cross-story dependencies
        ├─► Phase 4 (US2: Stock)         ← no cross-story dependencies
        ├─► Phase 5 (US3: Validation)    ← no cross-story dependencies
        ├─► Phase 6 (US4: Audit/Routes)  ← depends on US3 schemas being done
        │     [T030–T039 depend on T023–T029 validate middleware + schemas]
        └─► Phase 7 (US5: DB Integrity)  ← depends on Phase 2 migrations running
```

**Story dependency order**: US1 → US2 (both P1, can be done in parallel) → US3 → US4 (US4 uses US3 schemas) → US5

---

## Parallel Execution Examples

### US1 + US2 in parallel (both P1, independent files)

```
Developer A: T015 → T016 → T017 → T018  (auth middleware + routes)
Developer B: T019 → T020 → T021 → T022  (stock fixes + vente transaction)
```

### US3 schemas in parallel (T024–T029 all independent files)

```
All 6 schema files can be written simultaneously by different developers.
```

### US4 route extraction in parallel (T030–T038 all independent files)

```
Each routes/*.js file has no dependency on other routes files.
All can be extracted simultaneously once T023 (validate.js) is complete.
```

---

## Implementation Strategy

**MVP Scope (US1 + US2 = 2 sessions)**:
1. Complete Phases 1–2 (setup + migrations) — ~30min
2. Complete Phase 3 (US1: auth) — delivers secure API
3. Complete Phase 4 (US2: stock) — delivers transactional integrity

**Incremental Delivery**:
- After Phase 3: System has auth. Any endpoint without auth still works (routes not yet extracted). Frontend continues functioning.
- After Phase 4: Stock levels are trustworthy. Sales are atomic.
- After Phase 5: No more invalid data enters DB.
- After Phase 6: All 30+ endpoints extracted, validated, auditable. Full audit trail active.
- After Phase 7: DB-level safety net in place; errors propagated cleanly.
