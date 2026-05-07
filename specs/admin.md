# Admin — Gestion des Utilisateurs

## C'est quoi ?
La page réservée à l'administrateur pour gérer les comptes utilisateurs de l'application : créer un nouveau compte, modifier un compte existant, ou le supprimer.

> Seul l'utilisateur avec le rôle **admin** peut accéder à cette page.

---

## Frontend — `src/Admin.jsx`

### Ce que fait la page
- Au chargement : récupère la liste de tous les utilisateurs depuis l'API
- Affiche un tableau avec : nom, email, téléphone, rôle, date de création
- Offre 3 actions : **Ajouter**, **Modifier**, **Supprimer**

### Les appels API

| Appel | Ce qu'il fait |
|---|---|
| `GET /api/users` | Récupère la liste de tous les utilisateurs |
| `POST /api/users` | Crée un nouveau compte utilisateur |
| `PUT /api/users/:id` | Modifie les informations d'un utilisateur |
| `DELETE /api/users/:id` | Supprime un utilisateur |

### Le formulaire (modal)

Quand on clique **Ajouter un utilisateur** ou **Modifier**, une fenêtre modale s'ouvre avec ces champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Prénom | Non | `first_name` |
| Nom | Non | `last_name` |
| Email | **Oui** | Doit être un email valide |
| Mot de passe | **Oui (création seulement)** | Minimum 8 caractères |
| Téléphone | Non | `phone` |
| Rôle | **Oui** | `admin`, `responsable`, ou `magasinier` |

> En mode **Modification**, le champ mot de passe n'apparaît pas (on ne change pas le mot de passe depuis ici).

### La recherche
Un champ de recherche filtre le tableau en temps réel sur : prénom, nom, email, rôle, téléphone.

### Les notifications (SweetAlert2)
L'application utilise la bibliothèque **SweetAlert2** (`Swal`) pour afficher des popups :
- ✅ Succès → toast en haut à droite
- ❌ Erreur → popup avec le message d'erreur détaillé
- ⚠️ Confirmation → demande confirmation avant suppression

---

## Backend — `Backend/routes/user.routes.js`

Toutes ces routes sont protégées : seul un utilisateur avec le rôle **admin** peut les utiliser (`requireAuth(["admin"])`).

### `GET /api/users`
Retourne tous les utilisateurs (sans le mot de passe hashé) :
```sql
SELECT id, email, role, first_name, last_name, phone, created_at
FROM users
```

### `POST /api/users`
Crée un nouveau compte. Étapes :
1. Valide les données avec le schéma Joi (email valide, password ≥ 8 caractères)
2. Vérifie que l'email n'existe pas déjà → 409 si doublon
3. Hash le mot de passe avec **bcrypt** (10 rounds)
4. Insère en base

```sql
INSERT INTO users (email, password, role, first_name, last_name, phone)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id
```

### `PUT /api/users/:id`
Modifie un utilisateur existant. Seuls les champs envoyés sont mis à jour (pas de mot de passe ici).
```sql
UPDATE users SET email=$1, role=$2, first_name=$3, last_name=$4, phone=$5
WHERE id=$6
```

### `DELETE /api/users/:id`
Supprime définitivement un utilisateur. Deux vérifications avant suppression :
- L'utilisateur doit exister → 404 sinon
- L'utilisateur ne doit pas être **admin** → 403 (on ne peut pas supprimer un admin)

```sql
DELETE FROM users WHERE id = $1
```

---

## Schéma Joi — `Backend/schemas/user.schema.js`

La validation des données est faite avant d'appeler la base de données.

```
createUserSchema :
  email     → obligatoire, format email valide
  password  → obligatoire, minimum 8 caractères
  role      → doit être "admin", "responsable" ou "magasinier"
  first_name→ optionnel, max 100 caractères
  last_name → optionnel, max 100 caractères
  phone     → optionnel, max 30 caractères
```

Si la validation échoue → le backend répond `400 Request validation failed` avec la liste des champs en erreur.

---

## Schéma simplifié

```
Admin clique "Ajouter"
        ↓
  Remplir le formulaire (email + password obligatoires)
        ↓
  Frontend → POST /api/users → Backend
        ↓
  Joi valide les données
        ↓ (si OK)
  Vérifie que l'email n'existe pas déjà
        ↓ (si OK)
  bcrypt hash le mot de passe
        ↓
  INSERT INTO users → Base de données
        ↓
  201 Created → Swal succès → tableau mis à jour
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir la liste | admin |
| Créer un compte | admin |
| Modifier un compte | admin |
| Supprimer un compte | admin |

> Un admin ne peut pas se supprimer lui-même ni supprimer un autre admin.
