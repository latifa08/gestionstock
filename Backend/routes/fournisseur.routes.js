const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createFournisseurSchema, updateFournisseurSchema } = require("../schemas/fournisseur.schema");

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM fournisseurs WHERE archived_at IS NULL");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth(["admin", "responsable"]), validateBody(createFournisseurSchema), async (req, res, next) => {
  const { nom, societe, telephone, email, adresse } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO fournisseurs (nom, societe, telephone, email, adresse) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [nom, societe, telephone, email, adresse]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth(["admin", "responsable"]), validateBody(updateFournisseurSchema), async (req, res, next) => {
  const { nom, societe, telephone, email, adresse } = req.body;
  try {
    const result = await db.query(
      "UPDATE fournisseurs SET nom=$1, societe=$2, telephone=$3, email=$4, adresse=$5 WHERE id=$6",
      [nom, societe, telephone, email, adresse, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Fournisseur introuvable" });
    res.json({ success: true, message: "Fournisseur mis à jour" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const check = await db.query("SELECT id FROM fournisseurs WHERE id = $1", [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Fournisseur introuvable" });
    await db.query("UPDATE fournisseurs SET archived_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Fournisseur archivé" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
