# Stock Alert — Alertes de Stock

## C'est quoi ?
Une page de surveillance qui affiche en temps réel la liste des produits dont le stock est épuisé ou en dessous du seuil d'alerte défini. Elle joue aussi un son et affiche une popup si de nouveaux produits en rupture sont détectés.

---

## Frontend — `src/StockAlert.jsx`

### Ce que fait la page
- Au chargement : récupère la liste des produits en rupture
- **Se rafraîchit automatiquement toutes les 10 secondes** sans recharger la page
- Joue un son d'alerte et affiche une popup si le nombre de ruptures augmente

### L'appel API

| Appel | Ce qu'il fait |
|---|---|
| `GET /stock-alert` | Récupère les produits dont le stock est ≤ seuil d'alerte ou = 0 |

### Affichage

**Si aucun produit en rupture :**
```
✅ Tous les produits sont disponibles
```

**Si des produits sont en rupture :**
```
🔴 Produits en rupture :
  - Produit A — Stock: 0
  - Produit B — Stock: 2
```

### Rafraîchissement automatique (polling)
```javascript
// Au chargement : appel immédiat
fetchStockAlert();

// Ensuite : appel toutes les 10 secondes
const interval = setInterval(fetchStockAlert, 10000);

// Quand on quitte la page : arrêt du timer
return () => clearInterval(interval);
```
> Cette technique s'appelle le **polling** : on interroge le serveur à intervalles réguliers pour détecter les changements.

### Alerte sonore
Utilise `useRef` pour mémoriser le nombre précédent de ruptures. Si ce nombre augmente entre deux appels, un son est joué et une popup s'affiche :

```javascript
if (lowStock.length > 0 && lowStock.length !== prevCount.current) {
  const audio = new Audio("/sounds/alert.mp3");
  audio.play();
  alert("⚠️ Produit(s) en rupture de stock !");
}
prevCount.current = lowStock.length; // mémorise pour la prochaine comparaison
```

---

## Backend — `Backend/routes/stock-alert.routes.js`

### `GET /stock-alert`
Une seule requête SQL qui retourne tous les produits dont le stock est bas :

```sql
SELECT id_produit,
       nom_produit AS produit,
       quantite AS stock
FROM produits
WHERE (quantite <= niveau_alerte OR quantite = 0)
  AND archived_at IS NULL
```

**Logique de la condition :**
- `quantite <= niveau_alerte` → le stock est en dessous du seuil configuré pour ce produit
- `OR quantite = 0` → le stock est complètement épuisé (même si `niveau_alerte = 0`)

Retourne un tableau :
```json
[
  { "id_produit": 3, "produit": "Stylo rouge", "stock": 0 },
  { "id_produit": 7, "produit": "Cahier A4", "stock": 2 }
]
```

---

## Lien avec la table `produits`

Le seuil d'alerte (`niveau_alerte`) est configuré pour chaque produit dans la page **Produits**. Si ce champ vaut `5`, le produit apparaîtra dans les alertes dès que son stock passe en dessous de 5.

```
produits.niveau_alerte = 5
produits.quantite = 3
→ 3 <= 5 → apparaît dans Stock Alert
```

---

## Schéma simplifié

```
Page chargée → appel immédiat → GET /stock-alert → liste des ruptures
        ↓
  Toutes les 10 secondes → GET /stock-alert → mise à jour de la liste
        ↓
  Si nouvelles ruptures détectées → son + popup
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Voir les alertes | Tous (admin, responsable, magasinier) |
