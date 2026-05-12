const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

router.post("/", requireAuth(["admin", "responsable"]), async (req, res, next) => {
  const { client, fournisseur, date_facture, produits } = req.body;

  if (!Array.isArray(produits) || produits.length === 0) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Aucun produit envoyé" });
  }

  try {
    await db.query("BEGIN");

    const numero = "FAC-" + Date.now();
    const clientValue = client && client.trim() !== "" ? client : "Sans client";

    const result = await db.query(
      "INSERT INTO factures (numero, client, fournisseur, date_facture) VALUES ($1,$2,$3,$4) RETURNING id_facture",
      [numero, clientValue, fournisseur, date_facture]
    );
    const id_facture = result.rows[0].id_facture;

    for (const p of produits) {
      const prodResult = await db.query("SELECT * FROM produits WHERE id_produit=$1", [p.id_produit]);
      const prod = prodResult.rows[0];

      if (!prod) throw new Error("Produit introuvable");
      if (prod.quantite < p.quantite) throw new Error(`Stock insuffisant pour ${prod.nom_produit}`);

      await db.query("UPDATE produits SET quantite = quantite - $1 WHERE id_produit = $2", [p.quantite, p.id_produit]);
      await db.query(
        "INSERT INTO facture_details (id_facture, id_produit, quantite, prix) VALUES ($1,$2,$3,$4)",
        [id_facture, p.id_produit, p.quantite, prod.prix_unitaire]
      );
      await db.query(
        "INSERT INTO mouvements (id_produit, type, quantite, id_user) VALUES ($1, 'sortie', $2, $3)",
        [p.id_produit, p.quantite, req.user.id]
      );
    }

    await db.query("COMMIT");
    res.json({ success: true, message: "Facture créée avec succès", id_facture, numero });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.get("/s", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT id_facture, numero, client, fournisseur, date_facture FROM factures ORDER BY id_facture DESC"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth([]), async (req, res, next) => {
  try {
    const factureResult = await db.query("SELECT * FROM factures WHERE id_facture=$1", [req.params.id]);
    if (factureResult.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Facture introuvable" });

    const facture = factureResult.rows[0];
    const detailsResult = await db.query(
      "SELECT fd.*, p.nom_produit FROM facture_details fd JOIN produits p ON p.id_produit = fd.id_produit WHERE fd.id_facture=$1",
      [req.params.id]
    );
    const details = detailsResult.rows;
    const total = details.reduce((acc, d) => acc + Number(d.prix) * Number(d.quantite), 0);

    res.json({ ...facture, details, total });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  try {
    await db.query("BEGIN");

    const detailsResult = await db.query("SELECT * FROM facture_details WHERE id_facture=$1", [req.params.id]);
    if (detailsResult.rows.length === 0) throw new Error("Facture introuvable ou déjà supprimée");

    for (const d of detailsResult.rows) {
      await db.query("UPDATE produits SET quantite = quantite + $1 WHERE id_produit = $2", [d.quantite, d.id_produit]);
      await db.query(
        "INSERT INTO mouvements (id_produit, type, quantite, id_user) VALUES ($1, 'retour', $2, $3)",
        [d.id_produit, d.quantite, req.user.id]
      );
    }

    await db.query("DELETE FROM facture_details WHERE id_facture=$1", [req.params.id]);
    await db.query("DELETE FROM factures WHERE id_facture=$1", [req.params.id]);
    await db.query("COMMIT");

    res.json({ success: true, message: "Facture supprimée avec succès" });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

module.exports = router;
