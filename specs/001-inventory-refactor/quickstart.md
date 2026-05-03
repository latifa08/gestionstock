# Quickstart: Inventory System Core Enhancement & Refactor

**Feature**: 001-inventory-refactor
**Date**: 2026-04-29

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ running on localhost:5432
- Database `stock` exists and is accessible with user `postgres`

## Setup Steps

### 1. Install new backend dependencies

```bash
cd Backend
npm install jsonwebtoken cookie-parser joi
```

### 2. Run database migrations

Apply migrations in order from `Backend/migrations/`:

```bash
node Backend/migrate.js
```

This runs:
1. `001_add_archived_columns.sql` — adds `archived_at` to produits, clients, fournisseurs
2. `002_add_fk_constraints.sql` — adds FK constraints to mouvements, facture_details, vente_details
3. `003_add_audit_columns.sql` — adds `id_user`, `raison` to mouvements; `id_user`, `id_client` to ventes
4. `004_add_db_constraints.sql` — adds CHECK constraints on type, quantite, prix_unitaire
5. `005_create_refresh_tokens.sql` — creates the refresh_tokens table

### 3. Set environment variables

Create `Backend/.env.local` (not committed) and override:

```
JWT_SECRET=<your-random-secret-here>
JWT_REFRESH_SECRET=<your-other-random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

**Important**: Never commit JWT secrets to git.

### 4. Start the backend

```bash
cd Backend
node server.js
```

Expected output:
```
✅ Connected to stock database
🚀 Server running on http://localhost:5000
```

### 5. Start the frontend

```bash
npm start
```

Open http://localhost:3000. You will be redirected to the login page if no session exists.

## Testing the Auth Flow

```bash
# Login
curl -c cookies.txt -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123456"}'

# Use the returned accessToken in subsequent requests
curl -H "Authorization: Bearer <accessToken>" http://localhost:5000/products
```

## Common Issues

**Migration fails with FK constraint violation**:
Existing data has orphaned movement records. Run `Backend/migrations/cleanup-orphans.sql` before applying FK migrations.

**JWT_SECRET not set**:
Server will throw at startup. Check `Backend/.env` and `.env.local` are both present.

**Stock count mismatch after migration**:
Run `Backend/migrations/reconcile-stock.sql` — this script verifies `produits.quantite` matches the sum of movements per product and logs any discrepancies.
