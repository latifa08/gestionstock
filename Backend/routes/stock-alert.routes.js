const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

router.get("/stock-alert", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id_produit, nom_produit AS produit, quantite AS stock FROM produits WHERE (quantite <= niveau_alerte OR quantite = 0) AND archived_at IS NULL"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/api/produits/:code", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM produits WHERE code_bar = $1 AND archived_at IS NULL", [req.params.code]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit non trouvé" });

    const p = result.rows[0];
    res.json({ success: true, data: { id_produit: p.id_produit, code_bar: p.code_bar, nom_produit: p.nom_produit, prix_unitaire: p.prix_unitaire, quantite: p.quantite } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
