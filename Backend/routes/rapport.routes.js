const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        p.id_produit,
        p.nom_produit,
        p.categorie,
        p.prix_unitaire,
        COALESCE(SUM(CASE WHEN m.type = 'entree' THEN m.quantite ELSE 0 END), 0)::INTEGER AS entree,
        COALESCE(SUM(CASE WHEN m.type = 'sortie' THEN m.quantite ELSE 0 END), 0)::INTEGER AS sortie,
        COALESCE(SUM(CASE WHEN m.type = 'retour' THEN m.quantite ELSE 0 END), 0)::INTEGER AS retour,
        p.quantite::INTEGER AS stock,
        (p.quantite * COALESCE(p.prix_unitaire, 0))::NUMERIC AS valeur_stock
      FROM produits p
      LEFT JOIN mouvements m ON p.id_produit = m.id_produit
      WHERE p.archived_at IS NULL
      GROUP BY p.id_produit, p.nom_produit, p.categorie, p.prix_unitaire, p.quantite
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
