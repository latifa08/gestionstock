# API Contracts: Inventory System Core Enhancement & Refactor

**Feature**: 001-inventory-refactor
**Date**: 2026-04-29
**Base URL**: `http://localhost:5000`

## Authentication

All endpoints except `POST /api/login` and `POST /api/register` require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use `POST /api/auth/refresh` to get a new access token using the refresh token (HTTP-only cookie).

---

## Auth Endpoints

### POST /api/login
Login and receive access token.

**Request**:
```json
{
  "email": "admin@gmail.com",
  "password": "password123"
}
```

**Response 200**:
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "user": {
    "id": 1,
    "email": "admin@gmail.com",
    "role": "admin"
  }
}
```
Refresh token set as HTTP-only cookie `refresh_token`.

**Response 401**:
```json
{ "success": false, "message": "Invalid credentials" }
```

---

### POST /api/auth/refresh
Exchange refresh token cookie for a new access token.

**Response 200**:
```json
{ "success": true, "accessToken": "eyJ..." }
```

**Response 401**:
```json
{ "success": false, "message": "Refresh token expired or invalid" }
```

---

### POST /api/logout
Invalidate the refresh token.

**Response 200**:
```json
{ "success": true }
```

---

## Products Endpoints

### GET /products
**Auth**: Any role
**Query params**: `?archived=false` (default) or `?archived=true`

**Response 200**:
```json
[
  {
    "id_produit": 1,
    "nom_produit": "Stylo Bic",
    "categorie": "Papeterie",
    "quantite": 50,
    "prix_unitaire": 2.50,
    "code_bar": "12345678",
    "niveau_alerte": 10,
    "archived_at": null
  }
]
```

---

### POST /products
**Auth**: admin, responsable

**Request**:
```json
{
  "nom_produit": "Stylo Bic",
  "categorie": "Papeterie",
  "description": "Stylo à bille",
  "quantite": 50,
  "prix_unitaire": 2.50,
  "fournisseur": "BIC France",
  "niveau_alerte": 10,
  "code_bar": "12345678"
}
```

**Validation errors 400**:
```json
{
  "success": false,
  "errors": [
    { "field": "nom_produit", "message": "Required" },
    { "field": "prix_unitaire", "message": "Must be greater than 0" }
  ]
}
```

**Response 201**:
```json
{ "success": true, "id": 42 }
```

---

### PUT /products/:id
**Auth**: admin, responsable

**Request**: Same fields as POST (all optional for partial update)

**Response 200**:
```json
{ "success": true, "message": "Produit mis à jour" }
```

---

### DELETE /products/:id
**Auth**: admin only
**Behavior**: Soft-delete (sets `archived_at`). Returns 409 if product has active stock (quantite > 0).

**Response 200**:
```json
{ "success": true, "message": "Produit archivé" }
```

**Response 409**:
```json
{ "success": false, "message": "Cannot archive product with stock > 0. Transfer or adjust stock first." }
```

---

## Movements Endpoints

### POST /mouvements
**Auth**: admin, responsable, magasinier

**Request**:
```json
{
  "id_produit": 1,
  "type": "entree",
  "quantite": 20,
  "id_fournisseur": 3,
  "raison": "Livraison fournisseur commande #456"
}
```

**Validation**: `type` must be one of: `entree`, `sortie`, `retour`, `ajustement`. `quantite` must be ≥ 1.

**Response 201**:
```json
{ "success": true, "id": 15 }
```

**Response 400** (insufficient stock for sortie):
```json
{ "success": false, "message": "Stock insuffisant: 5 disponible, 20 demandé" }
```

---

## Sale Endpoint

### POST /api/vente
**Auth**: admin, responsable, magasinier

**Request**:
```json
{
  "cart": [
    { "id_produit": 1, "quantity": 3 },
    { "id_produit": 7, "quantity": 1 }
  ],
  "id_client": 5
}
```

**Response 200** (all items processed atomically):
```json
{
  "success": true,
  "message": "Vente validée",
  "id_vente": 12,
  "total": 18.50
}
```

**Response 400** (any item fails — entire transaction rolls back):
```json
{
  "success": false,
  "message": "Stock insuffisant pour Stylo Bic: 2 disponible, 3 demandé"
}
```

---

## Error Response Format (standard across all endpoints)

```json
{
  "success": false,
  "code": "INSUFFICIENT_STOCK",
  "message": "Human-readable description",
  "errors": [
    { "field": "quantite", "message": "Must be >= 1" }
  ]
}
```

**Standard error codes**:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Role insufficient for this action |
| NOT_FOUND | 404 | Resource does not exist |
| VALIDATION_ERROR | 400 | Request body failed schema validation |
| INSUFFICIENT_STOCK | 400 | Sale/sortie would result in negative stock |
| CONFLICT | 409 | Duplicate or constraint violation |
| INTERNAL_ERROR | 500 | Unexpected server error |
