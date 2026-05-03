# Data Model: Inventory System Core Enhancement & Refactor

**Feature**: 001-inventory-refactor
**Date**: 2026-04-29

## Changes to Existing Tables

### produits (modified)

```sql
ALTER TABLE produits
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD CONSTRAINT produits_quantite_check CHECK (quantite >= 0),
  ADD CONSTRAINT produits_prix_check CHECK (prix_unitaire > 0),
  ADD CONSTRAINT uq_produits_code_bar UNIQUE (code_bar);
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id_produit | SERIAL | PK | Existing |
| nom_produit | VARCHAR(255) | NOT NULL | Existing |
| categorie | VARCHAR(100) | | Existing |
| description | TEXT | | Existing |
| quantite | INTEGER | NOT NULL DEFAULT 0, CHECK >= 0 | Existing — constraint added |
| prix_unitaire | NUMERIC(10,2) | CHECK > 0 | Existing — constraint added |
| fournisseur | VARCHAR(255) | | Existing (text ref; FK migration out of scope) |
| code_bar | VARCHAR(100) | UNIQUE | Existing — uniqueness enforced |
| date_ajout | TIMESTAMPTZ | DEFAULT NOW() | Existing |
| niveau_alerte | INTEGER | DEFAULT 0 | Existing |
| **archived_at** | TIMESTAMPTZ | NULL = active | **NEW** |

---

### clients (modified)

```sql
ALTER TABLE clients
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id_client | SERIAL | PK | Existing |
| nom | VARCHAR(255) | NOT NULL | Existing |
| telephone | VARCHAR(50) | | Existing |
| adresse | TEXT | | Existing |
| email | VARCHAR(255) | | Existing |
| type | VARCHAR(50) | | Existing |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Existing |
| **archived_at** | TIMESTAMPTZ | NULL = active | **NEW** |

---

### fournisseurs (modified)

```sql
ALTER TABLE fournisseurs
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | SERIAL | PK | Existing |
| nom | VARCHAR(255) | NOT NULL | Existing |
| societe | VARCHAR(255) | | Existing |
| telephone | VARCHAR(50) | | Existing |
| email | VARCHAR(255) | | Existing |
| adresse | TEXT | | Existing |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Existing |
| **archived_at** | TIMESTAMPTZ | NULL = active | **NEW** |

---

### mouvements (modified)

```sql
ALTER TABLE mouvements
  ADD COLUMN id_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN raison VARCHAR(255) DEFAULT NULL,
  ADD CONSTRAINT mouvements_quantite_check CHECK (quantite > 0),
  ADD CONSTRAINT fk_mouvements_produit 
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mouvements_client 
    FOREIGN KEY (id_client) REFERENCES clients(id_client) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_mouvements_fournisseur 
    FOREIGN KEY (id_fournisseur) REFERENCES fournisseurs(id) ON DELETE RESTRICT,
  ADD CONSTRAINT mouvements_type_check 
    CHECK (type IN ('entree', 'sortie', 'retour', 'ajustement'));
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id_mouvement | SERIAL | PK | Existing |
| id_produit | INTEGER | NOT NULL, FK → produits | Existing — FK enforced |
| id_client | INTEGER | FK → clients, nullable | Existing — FK enforced |
| id_fournisseur | INTEGER | FK → fournisseurs, nullable | Existing — FK enforced |
| type | VARCHAR(50) | NOT NULL, CHECK IN values | Existing — CHECK constraint added |
| quantite | INTEGER | NOT NULL, CHECK > 0 | Existing — constraint added |
| date | TIMESTAMPTZ | DEFAULT NOW() | Existing |
| **id_user** | INTEGER | FK → users, nullable | **NEW** — who performed the movement |
| **raison** | VARCHAR(255) | nullable | **NEW** — reason code or note |

---

### users (modified)

```sql
ALTER TABLE users
  ADD CONSTRAINT uq_users_email UNIQUE (email),
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'responsable', 'magasinier'));
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | SERIAL | PK | Existing |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Existing — uniqueness enforced |
| password | VARCHAR(255) | NOT NULL | Existing |
| role | VARCHAR(50) | CHECK IN values | Existing — constraint added |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Existing |

---

### facture_details (modified — FK added)

```sql
ALTER TABLE facture_details
  ADD CONSTRAINT fk_fd_facture 
    FOREIGN KEY (id_facture) REFERENCES factures(id_facture) ON DELETE CASCADE,
  ADD CONSTRAINT fk_fd_produit 
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT;
```

---

### ventes (modified — populate on sale)

```sql
ALTER TABLE ventes
  ADD COLUMN id_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN id_client INTEGER REFERENCES clients(id_client) ON DELETE SET NULL;
```

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id_vente | SERIAL | PK | Existing |
| date_vente | TIMESTAMPTZ | DEFAULT NOW() | Existing |
| total | NUMERIC(10,2) | | Existing |
| **id_user** | INTEGER | FK → users | **NEW** |
| **id_client** | INTEGER | FK → clients | **NEW** |

---

### vente_details (existing — FK added)

```sql
ALTER TABLE vente_details
  ADD CONSTRAINT fk_vd_vente 
    FOREIGN KEY (id_vente) REFERENCES ventes(id_vente) ON DELETE CASCADE,
  ADD CONSTRAINT fk_vd_produit 
    FOREIGN KEY (id_produit) REFERENCES produits(id_produit) ON DELETE RESTRICT;
```

---

## New Table: refresh_tokens

Stores refresh tokens for the JWT auth flow.

```sql
CREATE TABLE refresh_tokens (
  id         SERIAL PRIMARY KEY,
  id_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Entity Relationships (summary)

```
users (1) ──────────── (*) mouvements
users (1) ──────────── (*) ventes
users (1) ──────────── (*) refresh_tokens

produits (1) ─────────── (*) mouvements
produits (1) ─────────── (*) facture_details
produits (1) ─────────── (*) vente_details

clients (1) ─────────── (*) mouvements
clients (1) ─────────── (*) ventes
clients (1) ─────────── (*) factures (via text col — future FK migration)

fournisseurs (1) ─────── (*) mouvements

factures (1) ──────────── (*) facture_details

ventes (1) ─────────────── (*) vente_details
```

## Validation Rules (application layer, via Joi)

| Entity | Field | Rule |
|--------|-------|------|
| Produit | nom_produit | required, string, min 1 char |
| Produit | quantite | integer, min 0 |
| Produit | prix_unitaire | number, min 0.01 |
| Produit | niveau_alerte | integer, min 0 |
| Mouvement | id_produit | required, integer |
| Mouvement | type | required, enum: entree/sortie/retour/ajustement |
| Mouvement | quantite | required, integer, min 1 |
| User (register) | email | required, valid email format |
| User (register) | password | required, min 8 chars |
| Sale (vente) | cart | required, non-empty array |
| Sale (vente) | cart[].id_produit | required, integer |
| Sale (vente) | cart[].quantity | required, integer, min 1 |

## State Transitions

### Product Lifecycle

```
ACTIVE (archived_at IS NULL)
  │
  ├─ [admin archives] → ARCHIVED (archived_at = timestamp)
  │
  └─ ARCHIVED
       └─ [admin restores] → ACTIVE (archived_at = NULL)
```

### Movement Type Semantics

| Type | Stock Effect | Use Case |
|------|-------------|----------|
| entree | +quantite | Purchase receipt, supplier delivery |
| sortie | -quantite | Sale, invoice, dispatch |
| retour | +quantite | Customer return, invoice cancellation |
| ajustement | ±quantite (via signed value) | Physical inventory count correction |
