# Barcode — Bon de Sortie par Scanner

## C'est quoi ?
Une page de caisse qui permet de scanner des codes-barres pour construire un bon de sortie (proforma). Chaque scan ajoute automatiquement le produit au panier. Une fois terminé, on confirme et le stock est déduit.

---

## Frontend — `src/BarcodePage.jsx`

### Ce que fait la page
La page se divise en deux zones :

1. **Zone de scan** — champ invisible toujours focalisé qui capte les signaux du scanner
2. **Panier (cart)** — tableau des produits scannés avec quantités et total

### Fonctionnement du scan

Le scanner physique (douchette) fonctionne comme un clavier : il tape le code-barre dans le champ de texte et appuie sur `Entrée`. Le frontend intercepte cela :

```
Scanner lit code-barre → tape dans le champ → touche Entrée détectée
    → scanProduct(code) appelé → GET /products/code/:code
    → produit trouvé → ajouté au panier
```

On peut aussi saisir un code manuellement dans un champ séparé.

### La fonction scanProduct
```
1. Appelle GET /products/code/:code
2. Si produit non trouvé → message d'erreur rouge
3. Si stock = 0 → message "Stock épuisé"
4. Si produit déjà dans le panier → augmente la quantité de 1
5. Si quantité > stock disponible → message "Stock insuffisant"
6. Sinon → ajoute le produit au panier avec qty = 1
```

### Debounce (anti-doublon)
Un délai de 150ms est appliqué entre deux scans pour éviter les doublons si le scanner envoie le code plusieurs fois :
```javascript
debounceRef.current = setTimeout(() => {
  scanProduct(v);
}, 150);
```

### Le panier (cart)

Chaque ligne du panier contient :
- Image / avatar du produit
- Nom et code-barre
- Boutons `−` et `+` pour ajuster la quantité
- Champ de saisie directe de la quantité
- Prix unitaire et total ligne
- Bouton `×` pour supprimer

**Total général** affiché en bas du tableau.

### Proforma (bon de sortie)
Un bouton **Voir le bon** ouvre une fenêtre récapitulative (proforma) avec :
- En-tête entreprise
- Tableau des articles
- Totaux
- Lignes de signature

Bouton **Confirmer et enregistrer** → envoie les mouvements de sortie au serveur.
Bouton **Imprimer** → ouvre une fenêtre popup HTML avec la mise en forme facture et lance `window.print()`.

### Confirmation
Quand on confirme le bon, le frontend boucle sur chaque article du panier et envoie un mouvement de sortie pour chacun :
```javascript
for (const item of cart) {
  await api.post("/mouvements", {
    id_produit: item.id_produit,
    type: "sortie",
    quantite: item.qty,
    raison: raison || null,
    date: date || null,
  });
}
```

---

## Backend — `Backend/routes/product.routes.js`

### `GET /products/code/:code`
Utilisée à chaque scan. Recherche le produit par son code-barre :

```sql
SELECT * FROM produits WHERE code_bar = $1
```

Retourne :
```json
{
  "success": true,
  "data": {
    "id_produit": 5,
    "nom_produit": "Stylo bleu",
    "code_bar": "123456789",
    "prix_unitaire": "45.00",
    "quantite": 120,
    "image_url": "/uploads/products/product_5.jpg"
  }
}
```

Si le produit n'existe pas :
```json
{ "success": false, "message": "Produit introuvable" }
```

### Pour les mouvements de sortie
Les mouvements sont créés via `POST /mouvements` (voir le spec `mouvement.md`). Chaque article du panier génère un mouvement séparé.

---

## Schéma simplifié

```
Scanner lit le code-barre
        ↓
  Frontend → GET /products/code/123456789
        ↓
  Backend → SELECT * FROM produits WHERE code_bar = '123456789'
        ↓
  Produit retourné → ajouté au panier (qty = 1)
        ↓
  ... (autres scans)
        ↓
  Utilisateur clique "Confirmer"
        ↓
  Pour chaque article du panier :
    Frontend → POST /mouvements { type: "sortie", quantite: N }
    Backend → BEGIN → INSERT mouvements + UPDATE stock → COMMIT
        ↓
  Panier vidé, session réinitialisée
```

---

## Droits d'accès

| Action | Rôle requis |
|---|---|
| Scanner et créer un bon | Tous |
| Confirmer (enregistrer les sorties) | Tous |
