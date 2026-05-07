# Mouvement — Gestion des Mouvements de Stock

## C'est quoi ?
La page qui enregistre chaque entrée ou sortie de stock. C'est le cœur du système : chaque fois qu'un produit arrive (entrée) ou part (sortie), on crée un mouvement qui met à jour automatiquement la quantité en stock.

---

## Frontend — `src/MouvementPage.jsx`

### Ce que fait la page
La page est divisée en **3 sections** :

1. **Formulaire Entrée de stock** (panneau gauche)
2. **Formulaire Sortie de stock** (panneau droit)
3. **Tableau des produits** + **Historique des mouvements** (en bas)

### Les appels API au chargement

| Appel | Ce qu'il récupère |
|---|---|
| `GET /products?archived=false` | Liste des produits pour la recherche |
| `GET /mouvements` | Historique complet des mouvements |
| `GET /clients` | Liste des clients (pour la sortie) |
| `GET /fournisseurs` | Liste des fournisseurs (pour l'entrée) |

### Composant ProductPicker
Un composant réutilisé dans les deux formulaires. Il affiche :
- Un champ de recherche par nom ou code-barre
- Une liste déroulante avec les produits filtrés
- Une fois sélectionné : une carte avec image, nom, stock actuel

### Formulaire Entrée (Entrée de stock)

| Champ | Obligatoire | Description |
|---|---|---|
| Produit | **Oui** | Recherche dans ProductPicker |
| Quantité | **Oui** | Minimum 1 |
| Fournisseur | Non | Sélection dans la liste |
| Raison | Non | Texte libre |

Soumet via `POST /mouvements` avec `type: "entree"`.

### Formulaire Sortie (Sortie de stock)

| Champ | Obligatoire | Description |
|---|---|---|
| Produit | **Oui** | Recherche dans ProductPicker |
| Quantité | **Oui** | Minimum 1, maximum = stock disponible |
| Client | Non | Sélection dans la liste |
| Raison | Non | Texte libre |

Avant d'envoyer, le frontend vérifie **côté client** que `quantité ≤ stock disponible`. Soumet via `POST /mouvements` avec `type: "sortie"`.

### Après soumission
- Le formulaire se vide
- Tous les tableaux sont rechargés (`fetchAll()`)
- Le stock du produit affiché dans le tableau est mis à jour

---

## Backend — `Backend/routes/mouvement.routes.js`

### `GET /mouvements`
Retourne l'historique complet avec les noms des produits, clients et l'email de l'utilisateur qui a créé le mouvement :
```sql
SELECT m.id_mouvement, m.type, m.quantite, m.date, m.raison,
       p.nom_produit,
       c.nom AS nom_client,
       p.fournisseur AS nom_fournisseur,
       u.email AS created_by
FROM mouvements m
LEFT JOIN produits p ON m.id_produit = p.id_produit
LEFT JOIN clients c ON m.id_client = c.id_client
LEFT JOIN users u ON m.id_user = u.id
ORDER BY m.date DESC
```

### `POST /mouvements`
C'est la route la plus importante. Elle :

**1. Valide les données** avec le schéma Joi (`createMouvementSchema`)

**2. Vérifie le stock** (pour les sorties uniquement) :
```sql
SELECT quantite FROM produits WHERE id_produit = $1
-- Si quantite < quantite_demandée → erreur 400 "Stock insuffisant"
```

**3. Exécute une transaction atomique** :
```sql
BEGIN

  -- Enregistre le mouvement
  INSERT INTO mouvements (id_produit, id_client, id_fournisseur, type,
                          quantite, date, id_user, raison)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  RETURNING id_mouvement

  -- Met à jour le stock du produit
  -- entree/retour → +quantite  |  sortie → -quantite
  UPDATE produits SET quantite = quantite + $delta WHERE id_produit = $1

COMMIT
```

> Si une des deux opérations échoue → `ROLLBACK` complet, rien n'est sauvegardé.

### Le calcul du delta (variation de stock)
```
type = "entree"  → delta = +quantite  (stock augmente)
type = "sortie"  → delta = -quantite  (stock diminue)
type = "retour"  → delta = +quantite  (stock augmente)
```

---

## Schéma Joi — `Backend/schemas/mouvement.schema.js`

```
createMouvementSchema :
  id_produit     → obligatoire, entier positif
  type           → obligatoire : "entree", "sortie", "retour" ou "ajustement"
  quantite       → obligatoire, entier ≥ 1
  id_client      → optionnel, entier positif ou null
  id_fournisseur → optionnel, entier positif ou null
  raison         → optionnel, max 255 caractères
  date           → optionnel, format ISO date
```

> Important : `id_client` et `id_fournisseur` doivent être envoyés comme **nombres** (`Number(valeur)`), pas comme chaînes de caractères — sinon Joi retourne une erreur de validation.

---

## Table base de données — `mouvements`

| Colonne | Type | Description |
|---|---|---|
| `id_mouvement` | INTEGER (PK) | Identifiant unique |
| `id_produit` | INTEGER (FK) | Référence vers `produits` |
| `id_client` | INTEGER (FK) | Référence vers `clients` (nullable) |
| `id_fournisseur` | INTEGER (FK) | Référence vers `fournisseurs` (nullable) |
| `id_user` | INTEGER (FK) | Utilisateur qui a créé le mouvement |
| `type` | VARCHAR | "entree", "sortie", "retour", "ajustement" |
| `quantite` | INTEGER | Quantité déplacée |
| `date` | TIMESTAMPTZ | Date du mouvement |
| `raison` | VARCHAR(255) | Raison optionnelle |

---

## Schéma simplifié — Entrée de stock

```
Utilisateur sélectionne un produit + saisit une quantité
        ↓
  Frontend → POST /mouvements { type: "entree", quantite: 10, id_fournisseur: 2 }
        ↓
  Joi valide les données
        ↓
  BEGIN TRANSACTION
    INSERT INTO mouvements ...
    UPDATE produits SET quantite = quantite + 10
  COMMIT
        ↓
  Stock du produit : 50 → 60
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir l'historique | Tous |
| Enregistrer un mouvement | Tous |
