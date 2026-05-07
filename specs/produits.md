# Produits — Gestion des Produits

## C'est quoi ?
La page centrale du système. Elle liste tous les produits en stock et permet d'en ajouter, modifier, archiver ou restaurer. Chaque produit a une image, un prix, une quantité et un seuil d'alerte.

---

## Frontend — `src/Products.jsx`

### Ce que fait la page
- Au chargement : récupère la liste des produits (actifs ou archivés selon le mode)
- Affiche un tableau avec : image, ID, nom, catégorie, description, quantité, prix, fournisseur, date, alerte, code-barre
- Offre 4 actions : **Ajouter**, **Modifier**, **Archiver**, **Restaurer**

### Les appels API

| Appel | Ce qu'il fait |
|---|---|
| `GET /products?archived=false` | Récupère les produits actifs |
| `GET /products?archived=true` | Récupère les produits archivés |
| `POST /products` | Crée un nouveau produit |
| `PUT /products/:id` | Modifie un produit existant |
| `DELETE /products/:id` | Archive un produit (soft delete) |
| `PATCH /products/:id/restore` | Restaure un produit archivé |
| `DELETE /products/permanent/:id` | Supprime définitivement un produit archivé |
| `POST /products/:id/image` | Upload de l'image du produit |

### Le formulaire (modal)

| Champ | Obligatoire | Description |
|---|---|---|
| Nom du produit | **Oui** | Nom affiché partout |
| Catégorie | Non | Ex : Électronique, Alimentation |
| Description | Non | Texte libre |
| Quantité | Non | Stock initial (nombre entier) |
| Prix unitaire | Non | Prix en DA |
| Fournisseur | Non | Nom du fournisseur |
| Date d'ajout | Non | Par défaut : aujourd'hui |
| Niveau d'alerte | Non | Seuil sous lequel une alerte se déclenche |
| Code-barre | Non | Généré automatiquement si laissé vide |
| Image | Non | JPG, PNG, WEBP, max 2 Mo |

### Upload d'image
L'image est uploadée en deux étapes :
1. On crée le produit → on récupère son `id`
2. On envoie l'image séparément via `POST /products/:id/image` (format `multipart/form-data`)

### Mode Archives
Un bouton bascule entre la vue **produits actifs** et **produits archivés**. En mode archivé, les boutons d'action changent : **Restaurer** et **Supprimer définitivement**.

### Recherche
Filtre en temps réel sur le nom du produit.

---

## Backend — `Backend/routes/product.routes.js`

### `GET /products`
Accessible à tous les rôles. Le paramètre `?archived=true/false` filtre les résultats :
```sql
-- Produits actifs
SELECT * FROM produits WHERE archived_at IS NULL ORDER BY id_produit DESC

-- Produits archivés
SELECT * FROM produits WHERE archived_at IS NOT NULL ORDER BY id_produit DESC
```

### `GET /products/code/:code`
Recherche un produit par son code-barre (utilisé par la page Barcode) :
```sql
SELECT * FROM produits WHERE code_bar = $1
```

### `POST /products`
Valide les données Joi puis insère :
```sql
INSERT INTO produits (nom_produit, categorie, description, quantite,
                      prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
RETURNING id_produit
```

### `PUT /products/:id`
Met à jour tous les champs d'un produit :
```sql
UPDATE produits SET nom_produit=$1, categorie=$2, ... WHERE id_produit=$10
```

### `DELETE /products/:id` (Archiver)
Vérifie d'abord que le stock est à 0 avant d'archiver :
```sql
-- Vérifie le stock
SELECT quantite FROM produits WHERE id_produit = $1

-- Si quantite = 0, archive
UPDATE produits SET archived_at = NOW() WHERE id_produit = $1
```
> Si le produit a encore du stock → erreur 409 "Impossible d'archiver".

### `PATCH /products/:id/restore`
Remet `archived_at` à NULL :
```sql
UPDATE produits SET archived_at = NULL WHERE id_produit = $1
```

### `DELETE /products/permanent/:id`
Suppression définitive avec transaction — supprime d'abord toutes les dépendances :
```sql
BEGIN
  DELETE FROM mouvements WHERE id_produit = $1
  DELETE FROM facture_details WHERE id_produit = $1
  DELETE FROM vente_details WHERE id_produit = $1
  DELETE FROM produits WHERE id_produit = $1
COMMIT
```

### `POST /products/:id/image`
Reçoit le fichier via **multer** (stocké dans `Backend/uploads/products/`), puis met à jour l'URL en base :
```sql
UPDATE produits SET image_url = $1 WHERE id_produit = $2
```

---

## Table base de données — `produits`

| Colonne | Type | Description |
|---|---|---|
| `id_produit` | INTEGER (PK) | Identifiant unique |
| `nom_produit` | VARCHAR | Nom du produit |
| `categorie` | VARCHAR | Catégorie |
| `description` | TEXT | Description |
| `quantite` | INTEGER | Stock actuel |
| `prix_unitaire` | NUMERIC | Prix en DA |
| `fournisseur` | VARCHAR | Nom du fournisseur |
| `date_ajout` | DATE | Date d'ajout |
| `niveau_alerte` | INTEGER | Seuil d'alerte stock |
| `code_bar` | VARCHAR (UNIQUE) | Code-barre unique |
| `image_url` | VARCHAR | Chemin de l'image |
| `archived_at` | TIMESTAMPTZ | NULL = actif |

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir la liste | Tous |
| Ajouter / Modifier | admin, responsable |
| Archiver / Restaurer | admin |
| Supprimer définitivement | admin |
