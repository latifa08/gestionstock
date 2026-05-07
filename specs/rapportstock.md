# Rapport Stock — Rapport de Gestion de Stock

## C'est quoi ?
Une page de synthèse qui affiche pour chaque produit le total des entrées, le total des sorties, et le stock actuel. Elle permet d'exporter ce rapport en PDF ou de l'imprimer directement.

---

## Frontend — `src/RapportStock.jsx`

### Ce que fait la page
- Au chargement : récupère les données du rapport depuis l'API
- Affiche 4 cartes résumé en haut
- Affiche un tableau détaillé par produit
- Offre 2 boutons d'export : **PDF** et **Imprimer**

### L'appel API

| Appel | Ce qu'il fait |
|---|---|
| `GET /api/rapport-stock` | Récupère les statistiques de stock par produit |

### Les 4 cartes résumé

| Carte | Calcul |
|---|---|
| **Produits** | Nombre total de produits dans le rapport |
| **Entrées** | Somme de toutes les entrées de tous les produits |
| **Sorties** | Somme de toutes les sorties de tous les produits |
| **Ruptures** | Nombre de produits avec `stock ≤ 0` |

Ces calculs sont faits côté frontend avec `reduce` :
```javascript
const totalEntree = data.reduce((a, b) => a + Number(b.entree || 0), 0);
const totalSortie = data.reduce((a, b) => a + Number(b.sortie || 0), 0);
const ruptures    = data.filter(d => Number(d.stock || 0) <= 0).length;
```

### Le tableau

| Colonne | Contenu |
|---|---|
| Produit | Nom du produit |
| Entrées | Total des entrées de stock |
| Sorties | Total des sorties de stock |
| Stock | Stock actuel (en rouge si ≤ 0) |

### Export PDF
Utilise **jsPDF** + **jspdf-autotable** — tout se passe dans le navigateur, aucun serveur n'est sollicité :
```javascript
const doc = new jsPDF();
doc.text("Rapport de Gestion de Stock", 14, 15);
autoTable(doc, {
  head: [["Produit", "Entrées", "Sorties", "Stock"]],
  body: data.map(d => [d.nom_produit, d.entree, d.sortie, d.stock]),
});
doc.save("rapport-stock.pdf");
```

### Imprimer
```javascript
window.print();
```
Le navigateur ouvre sa boîte d'impression native.

---

## Backend — `Backend/routes/rapport.routes.js`

### `GET /api/rapport-stock`
Une seule requête SQL qui agrège les données depuis les deux tables `produits` et `mouvements` :

```sql
SELECT
  p.id_produit,
  p.nom_produit,
  p.categorie,
  p.prix_unitaire,

  -- Total des entrées pour ce produit
  COALESCE(SUM(CASE WHEN m.type = 'entree' THEN m.quantite ELSE 0 END), 0) AS entree,

  -- Total des sorties pour ce produit
  COALESCE(SUM(CASE WHEN m.type = 'sortie' THEN m.quantite ELSE 0 END), 0) AS sortie,

  -- Total des retours pour ce produit
  COALESCE(SUM(CASE WHEN m.type = 'retour' THEN m.quantite ELSE 0 END), 0) AS retour,

  -- Stock actuel (colonne dans produits, pas calculé)
  p.quantite AS stock,

  -- Valeur totale du stock en DA
  (p.quantite * COALESCE(p.prix_unitaire, 0)) AS valeur_stock

FROM produits p
LEFT JOIN mouvements m ON p.id_produit = m.id_produit
WHERE p.archived_at IS NULL
GROUP BY p.id_produit, p.nom_produit, p.categorie, p.prix_unitaire, p.quantite
```

**Points importants de cette requête :**

- `LEFT JOIN` : on garde tous les produits même ceux sans aucun mouvement
- `SUM(CASE WHEN ...)` : compte uniquement les mouvements d'un type précis pour chaque produit
- `COALESCE(..., 0)` : remplace `NULL` par `0` si le produit n'a aucun mouvement
- `GROUP BY` : regroupe les mouvements par produit pour calculer les totaux
- `valeur_stock` : permet d'évaluer la valeur financière du stock (non affiché en frontend actuellement)

Exemple de réponse :
```json
[
  {
    "id_produit": 1,
    "nom_produit": "Stylo bleu",
    "categorie": "Fournitures",
    "prix_unitaire": "45.00",
    "entree": 200,
    "sortie": 85,
    "retour": 5,
    "stock": 120,
    "valeur_stock": "5400.00"
  }
]
```

---

## Schéma simplifié

```
Page chargée → GET /api/rapport-stock
        ↓
  Backend exécute la requête SQL (JOIN + GROUP BY + SUM)
        ↓
  Retourne : pour chaque produit → entrées, sorties, stock
        ↓
  Frontend calcule les totaux (reduce)
  Frontend affiche le tableau
        ↓
  Utilisateur clique "Exporter PDF"
  → jsPDF génère le fichier dans le navigateur
  → Téléchargement automatique de "rapport-stock.pdf"
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir le rapport | Tous (admin, responsable, magasinier) |
| Exporter / Imprimer | Tous |
