# Feature Specification: Inventory System Core Enhancement & Refactor

**Feature Branch**: `001-inventory-refactor`
**Created**: 2026-04-29
**Status**: Draft
**Input**: User description: "enhancement or refactor the core idea of the inventory system and db"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure API Access via Authentication Tokens (Priority: P1)

A warehouse manager logs into the system and all subsequent API requests include a secure session token. Any request without a valid token is rejected with a clear error. The system knows who made every change.

**Why this priority**: Currently, any client that knows the API URL can read or modify all data. No identity is associated with operations, making audit trails impossible and the system insecure. This is the foundation for all other access control.

**Independent Test**: A user can log in, receive a token, use it to call a protected endpoint, and be rejected when using an expired or missing token — all without any other features being present.

**Acceptance Scenarios**:

1. **Given** a valid email and password, **When** the user submits login credentials, **Then** the system returns a signed token and user role.
2. **Given** a valid token, **When** the user calls any protected endpoint, **Then** the response returns the requested data.
3. **Given** no token or an expired token, **When** the user calls a protected endpoint, **Then** the system returns a 401 error with a clear message.
4. **Given** a valid token for role "magasinier", **When** the user calls an admin-only endpoint, **Then** the system returns a 403 error.

---

### User Story 2 - Consistent & Trustworthy Stock Levels (Priority: P1)

A warehouse manager views the stock level for any product and trusts the number is accurate. When a sale or purchase is recorded, the stock level updates instantly and cannot be corrupted by a partial operation failure.

**Why this priority**: The current system directly mutates `produits.quantite` in the sale endpoint without a database transaction, meaning a crash between two operations leaves stock counts wrong. The rapport-stock page recalculates from mouvements, which can diverge from the stored quantity. One source of truth is critical.

**Independent Test**: Can be tested by simulating a multi-item sale that is interrupted mid-way and verifying no partial update occurred — stock either changes for all items or none.

**Acceptance Scenarios**:

1. **Given** a cart with 3 products, **When** the sale is submitted and one product has insufficient stock, **Then** no stock is decremented for any product and the entire sale is rejected.
2. **Given** a completed sale, **When** stock levels are viewed, **Then** the count reflects all movements (entries, exits, returns) with no divergence between the stored count and the movement log.
3. **Given** a product deletion attempt, **When** active movements reference that product, **Then** the product is archived (soft-deleted), not permanently removed.

---

### User Story 3 - Server-Side Input Validation (Priority: P2)

Any attempt to send malformed, missing, or out-of-range data to the API returns a descriptive validation error. It is impossible to insert a negative stock quantity, a product with no name, or a user with no email.

**Why this priority**: The current system passes raw request body values directly to SQL queries with no validation layer. This allows corrupt data to enter the database silently.

**Independent Test**: Can be tested by sending requests with missing required fields, negative quantities, or invalid emails to each endpoint and verifying all return a 400 error with field-specific messages.

**Acceptance Scenarios**:

1. **Given** a product creation request with a missing name, **When** the request is submitted, **Then** the system returns a 400 error identifying the missing field.
2. **Given** a movement creation request with quantity = -5, **When** the request is submitted, **Then** the system rejects it with a clear validation message.
3. **Given** a user registration with an invalid email format, **When** the request is submitted, **Then** the system rejects it before hitting the database.

---

### User Story 4 - Full Audit Trail for All Changes (Priority: P2)

An admin can view who made every inventory change, when, and what changed. No history is ever lost. Corrections appear as new entries, not overwrites.

**Why this priority**: Currently, product deletions silently cascade-delete all associated movements. There is no record of who performed an operation. For a business system, this is a compliance and accountability gap.

**Independent Test**: Can be tested by creating a product, recording movements, then "deleting" it (soft-delete) and verifying the movement history is still queryable.

**Acceptance Scenarios**:

1. **Given** an archived product, **When** an admin queries movement history, **Then** all past movements for that product remain visible with timestamps and user IDs.
2. **Given** a stock correction (e.g., inventory count revealed 3 fewer units), **When** the correction is recorded, **Then** it appears as a new "adjustment" movement, not an edit to the existing quantity.
3. **Given** any movement record, **When** viewed, **Then** it includes: product, quantity, type, date, and the user who recorded it.

---

### User Story 5 - Database Referential Integrity (Priority: P3)

Orphaned records (movements pointing to deleted products, invoices pointing to non-existent clients) cannot exist in the database. The database enforces its own consistency independently of the application.

**Why this priority**: Application-level cascade deletes are currently the only guard against orphaned records. A direct SQL operation bypassing the API would corrupt data. Database-level constraints are the correct enforcement layer.

**Independent Test**: Can be tested by attempting a direct database insert of a movement with a non-existent product ID and verifying it is rejected at the database level.

**Acceptance Scenarios**:

1. **Given** foreign key constraints are in place, **When** a movement is inserted with an invalid product ID, **Then** the database rejects the insert, not the application code.
2. **Given** a product with existing movements, **When** a delete is attempted via the API, **Then** the system performs a soft-delete (archive) instead, preserving relational integrity.
3. **Given** a duplicate barcode, **When** a second product with the same code is submitted, **Then** the database constraint rejects it, not just the application layer.

---

### Edge Cases

- What happens when a sale includes more items than are in stock for one product but valid quantities for others? → Entire sale rolls back.
- How does the system handle concurrent sales of the same product that would together exceed stock? → Database-level locking or optimistic concurrency must prevent overselling.
- What happens when an admin token expires mid-session? → User is prompted to re-authenticate; partial operations are not committed.
- What happens when a product barcode scan returns no match? → A clear "product not found" message is returned; no 500 error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All API endpoints (except login and register) MUST require a valid session token to process requests.
- **FR-002**: The system MUST enforce role-based access: admin endpoints MUST reject requests from non-admin tokens with a 403 response.
- **FR-003**: The system MUST validate all incoming request bodies against defined schemas before any database operation.
- **FR-004**: All multi-table write operations (sales, invoice creation, invoice deletion) MUST execute within a database transaction that rolls back entirely on any error.
- **FR-005**: The system MUST prevent negative stock quantities from being stored; any operation that would result in negative stock MUST be rejected before execution.
- **FR-006**: Products, clients, and suppliers MUST support soft-delete (archived state) rather than permanent deletion, preserving all linked movement history.
- **FR-007**: Every movement record MUST store the ID of the authenticated user who created it.
- **FR-008**: The database MUST enforce foreign key constraints between all related tables (mouvements → produits, facture_details → factures, etc.).
- **FR-009**: Barcode values MUST be unique per product, enforced at the database level.
- **FR-010**: The system MUST handle duplicate route definitions (two `/products` and `/clients` GET routes currently exist) — only one handler per route/method pair MUST be active.
- **FR-011**: The ventes and vente_details tables MUST be populated by the sale endpoint to maintain a consistent record of all sales transactions.
- **FR-012**: The stock level shown on product listings MUST be derived from the same source as the rapport-stock calculation (movements), eliminating the current dual-source divergence.

### Key Entities

- **Product (Produit)**: Inventory item with name, category, unit price, barcode, alert threshold, and archived status. Stock level is computed from movements.
- **Movement (Mouvement)**: Immutable record of a stock change. Type: entree / sortie / retour / ajustement. Includes quantity, date, linked product, optional client/supplier, and creating user.
- **Invoice (Facture)**: A grouped sale or purchase document linking multiple products to a client or supplier, created atomically with its line items and corresponding movements.
- **Sale (Vente)**: A direct point-of-sale transaction (distinct from facture), also creating line items and movements atomically.
- **User**: System actor with email, hashed password, role (admin / responsable / magasinier), and active/inactive status.
- **Client**: Customer entity. Not deleted; archived when removed.
- **Supplier (Fournisseur)**: Vendor entity. Not deleted; archived when removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every API endpoint correctly enforces authentication; zero endpoints return data to unauthenticated requests.
- **SC-002**: A simulated concurrent sale that would oversell a product results in only one successful transaction; the other fails cleanly with a stock-insufficient error.
- **SC-003**: All invalid request bodies (missing required fields, out-of-range values) return a 400 response with field-level error messages — zero silent failures.
- **SC-004**: After any completed or failed multi-item sale, stock counts remain consistent: no partial increments or decrements exist.
- **SC-005**: Archiving a product preserves 100% of its movement history; all past movements remain queryable.
- **SC-006**: The stock count shown in product listings matches the count computed by the rapport-stock endpoint for every product — zero divergence.
- **SC-007**: A direct database insert of a movement with a non-existent product ID is rejected by a foreign key constraint, not just application code.

## Assumptions

- The frontend will be updated in a separate phase to use token-based authentication headers; this spec covers the backend and database layer only.
- The existing three roles (admin, responsable, magasinier) are sufficient; adding new roles is out of scope for this refactor.
- The chatbot (AI assistant) integration endpoint is out of scope for this specification; it will be addressed separately.
- The system operates in a single-warehouse context; multi-location inventory management is out of scope.
- Existing data in the database will be migrated via a script that adds archived=false to all existing records and sets user_id=NULL on existing movements (backfill with a system user ID).
- The barcode auto-generation using `Date.now()` will be replaced with a proper sequential or UUID-based system.
