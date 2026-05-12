const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

router.get("/overview", requireAuth([]), async (req, res, next) => {
  try {
    const [products, clients, fournisseurs] = await Promise.all([
      db.query("SELECT COUNT(*) AS totalproducts, COALESCE(SUM(CASE WHEN quantite = 0 THEN 1 ELSE 0 END),0) AS outofstock FROM produits WHERE archived_at IS NULL"),
      db.query("SELECT COUNT(*) AS totalclients FROM clients WHERE archived_at IS NULL"),
      db.query("SELECT COUNT(*) AS totalfournisseurs FROM fournisseurs WHERE archived_at IS NULL"),
    ]);

    res.json({
      totalProducts: Number(products.rows[0].totalproducts) || 0,
      outOfStock: Number(products.rows[0].outofstock) || 0,
      totalClients: Number(clients.rows[0].totalclients) || 0,
      totalFournisseurs: Number(fournisseurs.rows[0].totalfournisseurs) || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/products", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query("SELECT id_produit, nom_produit, quantite FROM produits WHERE archived_at IS NULL");
    res.json(result.rows.map((p) => ({ id: p.id_produit, name: p.nom_produit, quantite: Number(p.quantite) || 0 })));
  } catch (err) {
    next(err);
  }
});

router.get("/mouvements", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT m.id_mouvement, m.id_produit, m.date, m.type, m.quantite,
        COALESCE(p.nom_produit, CONCAT('Produit ', m.id_produit)) AS nom_produit
      FROM mouvements m
      LEFT JOIN produits p ON p.id_produit = m.id_produit
      ORDER BY m.date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
