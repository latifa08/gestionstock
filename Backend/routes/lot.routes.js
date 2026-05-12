const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { requireAuth } = require("../middleware/auth");

/* GET /lots/product/:id — all lots for a product, FEFO order */
router.get("/product/:id", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id_lot, quantite, date_expiration, date_entree,
              date_expiration - CURRENT_DATE AS days_left
       FROM lots
       WHERE id_produit = $1 AND quantite > 0
       ORDER BY date_expiration ASC NULLS LAST, id_lot ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

/* PUT /lots/:id — edit a lot's expiration date (admin only) */
router.put("/:id", requireAuth(["admin"]), async (req, res, next) => {
  const { date_expiration, quantite } = req.body;
  try {
    const check = await db.query("SELECT id_lot FROM lots WHERE id_lot = $1", [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, message: "Lot introuvable" });

    await db.query(
      "UPDATE lots SET date_expiration = $1, quantite = COALESCE($2, quantite) WHERE id_lot = $3",
      [date_expiration || null, quantite ?? null, req.params.id]
    );

    /* resync produits.quantite */
    const lot = await db.query("SELECT id_produit FROM lots WHERE id_lot = $1", [req.params.id]);
    if (lot.rows.length) {
      await db.query(
        "UPDATE produits SET quantite = (SELECT COALESCE(SUM(quantite),0) FROM lots WHERE id_produit = $1) WHERE id_produit = $1",
        [lot.rows[0].id_produit]
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* DELETE /lots/:id — remove a lot (admin only) */
router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const lot = await db.query("SELECT id_produit, quantite FROM lots WHERE id_lot = $1", [req.params.id]);
    if (!lot.rows.length) return res.status(404).json({ success: false, message: "Lot introuvable" });

    await db.query("DELETE FROM lots WHERE id_lot = $1", [req.params.id]);

    await db.query(
      "UPDATE produits SET quantite = (SELECT COALESCE(SUM(quantite),0) FROM lots WHERE id_produit = $1) WHERE id_produit = $1",
      [lot.rows[0].id_produit]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
