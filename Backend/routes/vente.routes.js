const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createVenteSchema } = require("../schemas/vente.schema");

router.post("/", requireAuth([]), validateBody(createVenteSchema), async (req, res, next) => {
  const { cart, id_client } = req.body;

  try {
    await db.query("BEGIN");

    let total = 0;

    for (const item of cart) {
      const check = await db.query(
        "SELECT quantite, prix_unitaire, nom_produit FROM produits WHERE id_produit = $1",
        [item.id_produit]
      );

      if (check.rows.length === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit introuvable" });
      }

      const stock = Number(check.rows[0].quantite);
      const qty = Number(item.quantity);

      if (stock < qty) {
        await db.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_STOCK",
          message: `Stock insuffisant pour ${check.rows[0].nom_produit}: ${stock} disponible, ${qty} demandé`,
        });
      }

      total += qty * Number(check.rows[0].prix_unitaire);

      await db.query(
        "UPDATE produits SET quantite = quantite - $1 WHERE id_produit = $2",
        [qty, item.id_produit]
      );
    }

    const venteResult = await db.query(
      "INSERT INTO ventes (date_vente, total, id_user, id_client) VALUES (NOW(), $1, $2, $3) RETURNING id_vente",
      [total, req.user.id, id_client || null]
    );
    const id_vente = venteResult.rows[0].id_vente;

    for (const item of cart) {
      const priceResult = await db.query("SELECT prix_unitaire FROM produits WHERE id_produit = $1", [item.id_produit]);
      const prix = Number(priceResult.rows[0].prix_unitaire);

      await db.query(
        "INSERT INTO vente_details (id_vente, id_produit, quantite, prix) VALUES ($1,$2,$3,$4)",
        [id_vente, item.id_produit, item.quantity, prix]
      );

      await db.query(
        "INSERT INTO mouvements (id_produit, type, quantite, id_user) VALUES ($1, 'sortie', $2, $3)",
        [item.id_produit, item.quantity, req.user.id]
      );
    }

    await db.query("COMMIT");

    res.json({ success: true, message: "Vente validée", id_vente, total });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

module.exports = router;
