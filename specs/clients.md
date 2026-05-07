# Clients — Gestion des Clients

## C'est quoi ?
La page qui permet de gérer la liste des clients de l'entreprise : ajouter un nouveau client, modifier ses informations, ou l'archiver (suppression douce).

---

## Frontend — `src/Clients.jsx`

### Ce que fait la page
- Au chargement : récupère la liste des clients actifs depuis l'API
- Affiche un tableau avec : ID, nom, téléphone, adresse, email, type
- Offre 3 actions : **Ajouter**, **Modifier**, **Archiver**

### Les appels API

| Appel | Ce qu'il fait |
|---|---|
| `GET /clients` | Récupère la liste des clients non archivés |
| `POST /clients` | Crée un nouveau client |
| `PUT /clients/:id` | Modifie les informations d'un client |
| `DELETE /clients/:id` | Archive un client (soft delete) |

### Le formulaire (modal)

Quand on clique **Ajouter client** ou **Modifier**, une fenêtre modale s'ouvre avec ces champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Nom | **Oui** | Nom du client |
| Téléphone | Non | Numéro de téléphone |
| Adresse | Non | Adresse complète |
| Email | Non | Doit être un email valide si renseigné |
| Type de client | Non | Ex : Particulier, Entreprise… |

### La recherche
Un champ filtre le tableau en temps réel sur le **nom** et le **téléphone** du client.

### Gestion des erreurs
Les erreurs du serveur s'affichent directement dans la fenêtre modale (en rouge), avec le détail du champ qui pose problème si c'est une erreur de validation Joi.

### Suppression douce (Soft Delete)
Le bouton **Archiver** ne supprime pas définitivement le client. Il appelle `DELETE /clients/:id` qui positionne la colonne `archived_at` à la date du jour. Le client n'apparaît plus dans la liste mais reste en base de données.

---

## Backend — `Backend/routes/client.routes.js`

### `GET /clients`
Accessible à **tous les rôles** connectés.
```sql
SELECT * FROM clients WHERE archived_at IS NULL
```
Ne retourne que les clients non archivés.

### `POST /clients`
Accessible aux rôles **admin** et **responsable**.

Étapes :
1. Valide les données avec le schéma Joi
2. Insère le client en base

```sql
INSERT INTO clients (nom, telephone, adresse, email, type)
VALUES ($1, $2, $3, $4, $5)
RETURNING id_client
```

### `PUT /clients/:id`
Accessible aux rôles **admin** et **responsable**.
```sql
UPDATE clients
SET nom=$1, telephone=$2, adresse=$3, email=$4, type=$5
WHERE id_client=$6
```

### `DELETE /clients/:id`
Accessible au rôle **admin** uniquement.

Ne supprime pas la ligne — met à jour `archived_at` :
```sql
UPDATE clients SET archived_at = NOW() WHERE id_client = $1
```
Si le client n'existe pas → réponse `404 Not Found`.

---

## Schéma Joi — `Backend/schemas/client.schema.js`

```
createClientSchema :
  nom       → obligatoire, min 1 caractère, max 255
  telephone → optionnel, max 50 caractères
  adresse   → optionnel
  email     → optionnel, doit être un email valide si renseigné
  type      → optionnel, max 50 caractères
```

> Les champs optionnels acceptent aussi la chaîne vide `""` et `null`.

---

## Table base de données — `clients`

| Colonne | Type | Description |
|---|---|---|
| `id_client` | INTEGER (PK) | Identifiant unique auto-incrémenté |
| `nom` | VARCHAR | Nom du client |
| `telephone` | VARCHAR(50) | Numéro de téléphone |
| `adresse` | TEXT | Adresse |
| `email` | VARCHAR | Email |
| `type` | VARCHAR(50) | Type de client |
| `archived_at` | TIMESTAMPTZ | Date d'archivage (NULL = actif) |

---

## Schéma simplifié

```
Utilisateur clique "Ajouter client"
        ↓
  Remplir le formulaire (nom obligatoire)
        ↓
  Frontend → POST /clients → Backend
        ↓
  Joi valide les données
        ↓ (si OK)
  INSERT INTO clients → Base de données
        ↓
  201 Created → modal se ferme → tableau mis à jour

─────────────────────────────────────────

Utilisateur clique "Archiver"
        ↓
  Frontend → DELETE /clients/:id → Backend
        ↓
  UPDATE clients SET archived_at = NOW()
        ↓
  200 OK → client disparaît du tableau
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir la liste | Tous (admin, responsable, magasinier) |
| Ajouter / Modifier | admin, responsable |
| Archiver | admin |
