# Fournisseurs — Gestion des Fournisseurs

## C'est quoi ?
La page qui permet de gérer les fournisseurs de l'entreprise : les entreprises ou personnes qui livrent les produits. On peut ajouter, modifier ou archiver un fournisseur.

---

## Frontend — `src/Fournisseurs.jsx`

### Ce que fait la page
- Au chargement : récupère la liste des fournisseurs actifs depuis l'API
- Affiche un tableau avec : ID, nom, société, téléphone, email, adresse
- Offre 3 actions : **Ajouter**, **Modifier**, **Archiver**

### Les appels API

| Appel | Ce qu'il fait |
|---|---|
| `GET /fournisseurs` | Récupère la liste des fournisseurs non archivés |
| `POST /fournisseurs` | Crée un nouveau fournisseur |
| `PUT /fournisseurs/:id` | Modifie les informations d'un fournisseur |
| `DELETE /fournisseurs/:id` | Archive un fournisseur (soft delete) |

### Le formulaire (modal)

Quand on clique **Ajouter fournisseur** ou **Modifier**, une fenêtre modale s'ouvre avec ces champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Nom | **Oui** | Nom du fournisseur (personne ou contact) |
| Société | Non | Nom de la société / entreprise |
| Téléphone | Non | Numéro de téléphone |
| Email | Non | Doit être un email valide si renseigné |
| Adresse | Non | Adresse complète |

### La recherche
Un champ filtre le tableau en temps réel sur le **nom** et la **société** du fournisseur.

### Gestion des erreurs
Les erreurs du serveur s'affichent directement dans la fenêtre modale (en rouge), avec le détail exact du champ qui pose problème si c'est une erreur de validation.

### Suppression douce (Soft Delete)
Le bouton **Archiver** positionne `archived_at` à la date du jour — le fournisseur n'apparaît plus dans la liste mais reste en base de données. Cela évite de perdre l'historique des mouvements liés à ce fournisseur.

### Optimisation liste locale
Après une modification réussie, au lieu de re-fetcher toute la liste depuis l'API, le frontend met à jour directement la ligne concernée dans l'état React (`setList`). Cela rend l'interface plus rapide.

---

## Backend — `Backend/routes/fournisseur.routes.js`

### `GET /fournisseurs`
Accessible à **tous les rôles** connectés.
```sql
SELECT * FROM fournisseurs WHERE archived_at IS NULL
```
Ne retourne que les fournisseurs non archivés.

### `POST /fournisseurs`
Accessible aux rôles **admin** et **responsable**.

Étapes :
1. Valide les données avec le schéma Joi
2. Insère le fournisseur en base

```sql
INSERT INTO fournisseurs (nom, societe, telephone, email, adresse)
VALUES ($1, $2, $3, $4, $5)
RETURNING id
```

> La colonne clé primaire s'appelle `id` (pas `id_fournisseur`).

### `PUT /fournisseurs/:id`
Accessible aux rôles **admin** et **responsable**.
```sql
UPDATE fournisseurs
SET nom=$1, societe=$2, telephone=$3, email=$4, adresse=$5
WHERE id=$6
```
Si le fournisseur n'existe pas → réponse `404 Not Found`.

### `DELETE /fournisseurs/:id`
Accessible au rôle **admin** uniquement.

Ne supprime pas la ligne — met à jour `archived_at` :
```sql
UPDATE fournisseurs SET archived_at = NOW() WHERE id = $1
```
Si le fournisseur n'existe pas → réponse `404 Not Found`.

---

## Schéma Joi — `Backend/schemas/fournisseur.schema.js`

```
createFournisseurSchema :
  nom       → obligatoire, min 1 caractère, max 255
  societe   → optionnel, max 255 caractères
  telephone → optionnel, max 50 caractères
  email     → optionnel, doit être un email valide si renseigné
  adresse   → optionnel
```

> Les champs optionnels acceptent aussi la chaîne vide `""` et `null`.

---

## Table base de données — `fournisseurs`

| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Identifiant unique auto-incrémenté |
| `nom` | VARCHAR | Nom du contact fournisseur |
| `societe` | VARCHAR(255) | Nom de la société |
| `telephone` | VARCHAR(50) | Numéro de téléphone |
| `email` | VARCHAR | Email |
| `adresse` | TEXT | Adresse |
| `archived_at` | TIMESTAMPTZ | Date d'archivage (NULL = actif) |

> Note : La clé primaire est `id` et non `id_fournisseur`, contrairement à la table `clients` qui utilise `id_client`.

---

## Lien avec les autres pages

Les fournisseurs sont utilisés dans la page **Mouvement** : quand on enregistre une entrée de stock, on peut associer un fournisseur à ce mouvement. La table `mouvements` contient une colonne `id_fournisseur` qui fait référence à `fournisseurs.id`.

```
fournisseurs.id ←── mouvements.id_fournisseur
```

C'est pourquoi on ne peut pas supprimer définitivement un fournisseur s'il est lié à des mouvements (contrainte de clé étrangère en base de données).

---

## Schéma simplifié

```
Utilisateur clique "Ajouter fournisseur"
        ↓
  Remplir le formulaire (nom obligatoire)
        ↓
  Frontend → POST /fournisseurs → Backend
        ↓
  Joi valide les données
        ↓ (si OK)
  INSERT INTO fournisseurs → Base de données
        ↓
  201 Created → modal se ferme → ligne ajoutée au tableau

─────────────────────────────────────────

Utilisateur clique "Archiver"
        ↓
  Frontend → DELETE /fournisseurs/:id → Backend
        ↓
  UPDATE fournisseurs SET archived_at = NOW()
        ↓
  200 OK → fournisseur disparaît du tableau
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir la liste | Tous (admin, responsable, magasinier) |
| Ajouter / Modifier | admin, responsable |
| Archiver | admin |
