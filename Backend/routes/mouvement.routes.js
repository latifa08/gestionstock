const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createMouvementSchema } = require("../schemas/mouvement.schema");

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT m.id_mouvement, m.type, m.quantite, m.date, m.raison,
        p.nom_produit, c.nom AS nom_client, p.fournisseur AS nom_fournisseur,
        u.email AS created_by
      FROM mouvements m
      LEFT JOIN produits p ON m.id_produit = p.id_produit
      LEFT JOIN clients c ON m.id_client = c.id_client
      LEFT JOIN users u ON m.id_user = u.id
      ORDER BY m.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth([]), validateBody(createMouvementSchema), async (req, res, next) => {
  const { id_produit, id_client, id_fournisseur, type, quantite, raison, date } = req.body;

  try {
    if (type === "sortie" || type === "retour") {
      const check = await db.query("SELECT quantite FROM produits WHERE id_produit = $1", [id_produit]);
      if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit introuvable" });

      if (type === "sortie" && check.rows[0].quantite < quantite) {
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_STOCK",
          message: `Stock insuffisant: ${check.rows[0].quantite} disponible, ${quantite} demandé`,
        });
      }
    }

    await db.query("BEGIN");

    const result = await db.query(
      "INSERT INTO mouvements (id_produit, id_client, id_fournisseur, type, quantite, date, id_user, raison) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_mouvement",
      [id_produit, id_client || null, id_fournisseur || null, type, quantite, date || new Date(), req.user.id, raison || null]
    );

    const delta = type === "entree" || type === "retour" ? quantite : -quantite;
    await db.query("UPDATE produits SET quantite = quantite + $1 WHERE id_produit = $2", [delta, id_produit]);

    await db.query("COMMIT");
    res.status(201).json({ success: true, id: result.rows[0].id_mouvement });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

module.exports = router;
