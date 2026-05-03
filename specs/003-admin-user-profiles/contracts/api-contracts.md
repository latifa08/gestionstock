# API Contracts: Admin User Profile Management

**Branch**: `003-admin-user-profiles` | **Date**: 2026-04-29  
**Base URL**: `http://localhost:5000/api`  
**Auth**: All endpoints require `Authorization: Bearer <token>` with admin role.

---

## Modified Endpoints

### `GET /api/users`

Returns all users including new profile fields.

**Response — 200**:
```json
[
  {
    "id": 1,
    "email": "mazounilatifa44@gmail.com",
    "role": "admin",
    "first_name": "Latifa",
    "last_name": "Mazouni",
    "phone": "+213 555 123 456",
    "created_at": "2026-04-29T10:00:00.000Z"
  }
]
```

---

### `POST /api/users`

Create a user with full profile.

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "securepass",
  "role": "magasinier",
  "first_name": "Ahmed",
  "last_name": "Benali",
  "phone": "+213 555 000 111"
}
```

**Validation**:
- `email`: required, valid email
- `password`: required, min 8 characters
- `role`: required, one of `admin | responsable | magasinier`
- `first_name`: optional, string max 100 chars
- `last_name`: optional, string max 100 chars
- `phone`: optional, string max 30 chars

**Response — 201**:
```json
{ "success": true, "id": 5 }
```

---

### `PUT /api/users/:id`

Update user profile fields (no password change here).

**Request body** (all optional, at least one required):
```json
{
  "email": "new@example.com",
  "role": "responsable",
  "first_name": "Ahmed",
  "last_name": "Benali",
  "phone": "+213 555 999 888"
}
```

**Validation**:
- `email`: optional, valid email
- `role`: optional, one of `admin | responsable | magasinier`
- `first_name`: optional, string max 100 chars
- `last_name`: optional, string max 100 chars
- `phone`: optional, string max 30 chars

**Response — 200**:
```json
{ "success": true }
```

---

## Unchanged Endpoints

| Method | Path           | Purpose             |
|--------|----------------|---------------------|
| DELETE | /api/users/:id | Delete user (admin) |
