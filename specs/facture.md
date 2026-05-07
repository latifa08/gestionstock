# Facture — Gestion des Factures

## C'est quoi ?
La page qui permet de créer des factures de vente. On sélectionne les produits avec leurs quantités, on choisit un client et un fournisseur, et le système génère une facture tout en mettant à jour le stock automatiquement.

---

## Frontend — `src/Facture.jsx`

### Ce que fait la page
La page est organisée en **3 onglets** :

| Onglet | Rôle |
|---|---|
| **Create** | Créer une nouvelle facture |
| **History** | Voir la liste de toutes les factures |
| **Detail** | Voir le détail d'une facture spécifique |

### Chargement initial
Au chargement, 3 appels API sont lancés en parallèle (`Promise.all`) :

| Appel | Ce qu'il récupère |
|---|---|
| `GET /products` | Liste des produits (pour choisir les articles) |
| `GET /fournisseurs` | Liste des fournisseurs |
| `GET /api/factures` | Historique des factures |

### Onglet Create — Créer une facture

**Champs du formulaire :**

| Champ | Description |
|---|---|
| Client | Nom du client (texte libre) |
| Fournisseur | Sélection dans la liste |
| Date | Date de la facture |
| Tableau produits | Pour chaque produit : saisir la quantité souhaitée |

**Calcul du total :**
Le total est calculé en temps réel dans le navigateur :
```
total = Σ (prix_unitaire × quantité_saisie)
```

**Soumettre la facture :**
Seuls les produits avec `quantité > 0` sont envoyés à l'API.

### Onglet History — Historique
Tableau avec : numéro de facture, client, fournisseur, date, boutons **Voir** et **Supprimer**.

### Onglet Detail — Détail
Affiche les informations complètes d'une facture : client, fournisseur, date, tableau des produits avec prix et totaux. Bouton **Export PDF**.

### Export PDF
Utilise la bibliothèque **jsPDF** + **jspdf-autotable** pour générer un fichier PDF téléchargeable sans passer par le serveur — tout se passe dans le navigateur.

---

## Backend — `Backend/routes/facture.routes.js`

### `POST /api/facture` — Créer une facture
C'est la route principale. Elle exécute une **transaction complète** en plusieurs étapes :

```sql
BEGIN

  -- 1. Génère un numéro unique et insère la facture
  INSERT INTO factures (numero, client, fournisseur, date_facture)
  VALUES ('FAC-1234567890', 'Client X', 'Fournisseur Y', '2025-05-07')
  RETURNING id_facture

  -- Pour chaque produit dans la liste :

  -- 2. Vérifie que le produit existe et a assez de stock
  SELECT * FROM produits WHERE id_produit = $1
  -- Si stock insuffisant → erreur → ROLLBACK

  -- 3. Réduit le stock du produit
  UPDATE produits SET quantite = quantite - $quantite WHERE id_produit = $1

  -- 4. Insère le détail de la facture (ligne par produit)
  INSERT INTO facture_details (id_facture, id_produit, quantite, prix)
  VALUES ($1, $2, $3, $prix_unitaire)

  -- 5. Crée un mouvement de sortie pour l'historique
  INSERT INTO mouvements (id_produit, type, quantite, id_user)
  VALUES ($1, 'sortie', $2, $3)

COMMIT
```

> Si quelque chose échoue (stock insuffisant, produit introuvable…) → `ROLLBACK` complet, rien n'est sauvegardé.

### `GET /api/factures` — Liste des factures
```sql
SELECT id_facture, numero, client, fournisseur, date_facture
FROM factures ORDER BY id_facture DESC
```

### `GET /api/facture/:id` — Détail d'une facture
```sql
-- Récupère la facture
SELECT * FROM factures WHERE id_facture = $1

-- Récupère ses lignes avec les noms des produits
SELECT fd.*, p.nom_produit
FROM facture_details fd
JOIN produits p ON p.id_produit = fd.id_produit
WHERE fd.id_facture = $1
```
Calcule aussi le `total` en additionnant `prix × quantite` pour chaque ligne.

### `DELETE /api/facture/:id` — Supprimer une facture
La suppression **restitue le stock** automatiquement :

```sql
BEGIN

  -- Pour chaque ligne de la facture :
  -- 1. Remet le stock du produit
  UPDATE produits SET quantite = quantite + $quantite WHERE id_produit = $1

  -- 2. Crée un mouvement de retour pour garder la trace
  INSERT INTO mouvements (id_produit, type, quantite, id_user)
  VALUES ($1, 'retour', $2, $3)

  -- 3. Supprime les lignes puis la facture
  DELETE FROM facture_details WHERE id_facture = $1
  DELETE FROM factures WHERE id_facture = $1

COMMIT
```

---

## Tables base de données

### `factures`
| Colonne | Type | Description |
|---|---|---|
| `id_facture` | INTEGER (PK) | Identifiant unique |
| `numero` | VARCHAR | Numéro unique généré `FAC-timestamp` |
| `client` | VARCHAR | Nom du client |
| `fournisseur` | VARCHAR | Nom du fournisseur |
| `date_facture` | DATE | Date de la facture |

### `facture_details`
| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Identifiant unique |
| `id_facture` | INTEGER (FK) | Référence vers `factures` |
| `id_produit` | INTEGER (FK) | Référence vers `produits` |
| `quantite` | INTEGER | Quantité vendue |
| `prix` | NUMERIC | Prix unitaire au moment de la vente |

---

## Schéma simplifié

```
Utilisateur saisit les quantités + client + fournisseur
        ↓
  Frontend → POST /api/facture { produits: [{id, qte}, ...] }
        ↓
  BEGIN TRANSACTION
    Crée la facture (numéro unique)
    Pour chaque produit :
      Vérifie stock → Réduit stock → Insère détail → Crée mouvement sortie
  COMMIT
        ↓
  Stock mis à jour + mouvement tracé + facture enregistrée
        ↓
  Frontend bascule vers l'onglet History
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir les factures | Tous |
| Créer une facture | admin, responsable |
| Supprimer une facture | admin |
