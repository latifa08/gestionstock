# Dashboard

## C'est quoi ?
La page d'accueil de l'application. Elle affiche un résumé visuel de tout le stock : nombre de produits, clients, fournisseurs, et des graphiques d'activité.

---

## Frontend — `src/Dashboard.js`

### Ce que fait la page
Au chargement, elle appelle **3 API** en même temps pour récupérer les données, puis les affiche sous forme de cartes, graphiques et calendrier.

### Les appels API

| Appel | Ce qu'il retourne |
|---|---|
| `GET /dashboard/overview` | Nombre total de produits, produits hors stock, clients, fournisseurs |
| `GET /dashboard/mouvements` | Liste de tous les mouvements (entrées / sorties) avec date et produit |
| `GET /dashboard/products` | Liste de tous les produits avec leur quantité |

### Les sections affichées

**1. Cartes résumé (OverviewCards)**
- Total produits
- Produits hors stock
- Total clients
- Total fournisseurs

**2. Graphique Ventes (LineChart)**
- Axe X : les 12 mois
- Axe Y : nombre de sorties ce mois-là
- Données : filtrées depuis les mouvements de type `sortie`

**3. Graphique Stock (PieChart)**
- 2 parts : produits en stock (quantite > 0) vs hors stock (quantite = 0)
- Calculé à partir de la liste des produits

**4. Top Produits (TopStores)**
- Les 5 produits les plus sortis
- Calculé en additionnant les quantités des mouvements de type `sortie`

**5. Calendrier**
- Affiche les jours du mois courant
- Les jours où il y a eu un mouvement sont surlignés en violet

**6. Graphique Activité (BarChart)**
- Axe X : jours de la semaine (Lun → Dim)
- Axe Y : nombre de sorties ce jour-là

### Logique des données
Tout est calculé **côté frontend** à partir des mouvements :
```
mouvements → filtrer par type "sortie" → grouper par mois → LineChart
mouvements → filtrer par type "sortie" → grouper par produit → Top 5
mouvements → lire la date → marquer les jours dans le calendrier
```

---

## Backend — `Backend/routes/dashboard.routes.js`

Ce fichier contient **3 routes GET**, toutes accessibles par n'importe quel utilisateur connecté (`requireAuth([])`).

### `GET /dashboard/overview`
Exécute **3 requêtes SQL en parallèle** (`Promise.all`) :

```sql
-- Compte les produits actifs et ceux à 0 stock
SELECT COUNT(*) AS totalproducts,
       SUM(CASE WHEN quantite = 0 THEN 1 ELSE 0 END) AS outofstock
FROM produits WHERE archived_at IS NULL

-- Compte les clients actifs
SELECT COUNT(*) AS totalclients FROM clients WHERE archived_at IS NULL

-- Compte les fournisseurs actifs
SELECT COUNT(*) AS totalfournisseurs FROM fournisseurs WHERE archived_at IS NULL
```

Retourne :
```json
{
  "totalProducts": 42,
  "outOfStock": 3,
  "totalClients": 15,
  "totalFournisseurs": 8
}
```

### `GET /dashboard/products`
```sql
SELECT id_produit, nom_produit, quantite
FROM produits WHERE archived_at IS NULL
```
Retourne la liste des produits pour le graphique camembert (pie).

### `GET /dashboard/mouvements`
```sql
SELECT m.id_mouvement, m.id_produit, m.date, m.type, m.quantite,
       COALESCE(p.nom_produit, 'Produit X') AS nom_produit
FROM mouvements m
LEFT JOIN produits p ON p.id_produit = m.id_produit
ORDER BY m.date ASC
```
Retourne tous les mouvements avec le nom du produit associé (`LEFT JOIN`).

---

## Schéma simplifié

```
Navigateur                    Backend                    Base de données
    |                             |                             |
    |-- GET /dashboard/overview ->|-- 3 requêtes SQL parallèles->|
    |<------ JSON résumé ---------|<------- résultats ----------|
    |                             |                             |
    |-- GET /dashboard/mouvements->|-- SELECT + JOIN mouvements->|
    |<------ liste mouvements ----|<------- résultats ----------|
    |                             |                             |
    |-- GET /dashboard/products ->|-- SELECT produits ---------->|
    |<------ liste produits ------|<------- résultats ----------|
    |                             |
    | → Calcul graphiques (JS) ←  |
    | → Affichage Recharts        |
```

---

## Droits d'accès
Toutes les routes dashboard sont accessibles à **tous les rôles** (admin, responsable, magasinier).
