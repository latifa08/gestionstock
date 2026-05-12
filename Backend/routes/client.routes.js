const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createClientSchema, updateClientSchema } = require("../schemas/client.schema");

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM clients WHERE archived_at IS NULL");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth(["admin", "responsable"]), validateBody(createClientSchema), async (req, res, next) => {
  const { nom, telephone, adresse, email, type } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO clients (nom, telephone, adresse, email, type) VALUES ($1,$2,$3,$4,$5) RETURNING id_client",
      [nom, telephone, adresse, email, type]
    );
    res.status(201).json({ success: true, id: result.rows[0].id_client });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth(["admin", "responsable"]), validateBody(updateClientSchema), async (req, res, next) => {
  const { nom, telephone, adresse, email, type } = req.body;
  try {
    await db.query(
      "UPDATE clients SET nom=$1, telephone=$2, adresse=$3, email=$4, type=$5 WHERE id_client=$6",
      [nom, telephone, adresse, email, type, req.params.id]
    );
    res.json({ success: true, message: "Client mis à jour" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const check = await db.query("SELECT id_client FROM clients WHERE id_client = $1", [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Client introuvable" });
    await db.query("UPDATE clients SET archived_at = NOW() WHERE id_client = $1", [req.params.id]);
    res.json({ success: true, message: "Client archivé" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
