const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createProductSchema, updateProductSchema } = require("../schemas/product.schema");

const uploadDir = path.join(__dirname, "../uploads/products");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});
  

router.get("/code/:code", async (req, res, next) => {
  const code = req.params.code.trim();

  console.log("SCAN RECEIVED:", code);
 

  try {
    const result = await db.query(
      "SELECT * FROM produits WHERE code_bar = $1",
      [code]
    );

    console.log("DB RESULT:", result.rows);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: "Produit introuvable"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
}); 

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const archived = req.query.archived === "true";
    const result = await db.query(
      `SELECT * FROM produits WHERE ${archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"} ORDER BY id_produit DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth(["admin", "responsable"]), validateBody(createProductSchema), async (req, res, next) => {
  const { nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO produits (nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_produit`,
      [nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout || new Date(), niveau_alerte, code_bar || Date.now().toString()]
    
    );
    res.status(201).json({ success: true, id: result.rows[0].id_produit });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth(["admin", "responsable"]), validateBody(updateProductSchema), async (req, res, next) => {
  const id = req.params.id;
  const d = req.body;
  try {
    await db.query(
      `UPDATE produits SET nom_produit=$1, categorie=$2, description=$3, quantite=$4, prix_unitaire=$5,
       fournisseur=$6, date_ajout=$7, niveau_alerte=$8, code_bar=$9 WHERE id_produit=$10`,
      [d.nom_produit, d.categorie, d.description, d.quantite, d.prix_unitaire, d.fournisseur, d.date_ajout, d.niveau_alerte, d.code_bar, id]
    );
    res.json({ success: true, message: "Produit mis à jour" });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  const id = req.params.id;
  try {
    const check = await db.query("SELECT quantite FROM produits WHERE id_produit = $1", [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit introuvable" });
    if (check.rows[0].quantite > 0) {
      return res.status(409).json({ success: false, code: "CONFLICT", message: "Impossible d'archiver un produit avec du stock. Transférez ou ajustez le stock d'abord." });
    }
    await db.query("UPDATE produits SET archived_at = NOW() WHERE id_produit = $1", [id]);
    res.json({ success: true, message: "Produit archivé" });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/restore", requireAuth(["admin"]), async (req, res, next) => {
  const id = req.params.id;
  try {
    const check = await db.query("SELECT id_produit FROM produits WHERE id_produit = $1 AND archived_at IS NOT NULL", [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit archivé introuvable" });
    await db.query("UPDATE produits SET archived_at = NULL WHERE id_produit = $1", [id]);
    res.json({ success: true, message: "Produit restauré" });
  } catch (err) {
    next(err);
  }
});

router.delete("/permanent/:id", requireAuth(["admin"]), async (req, res, next) => {
  const id = req.params.id;
  const client = await db.connect();
  try {
    const check = await client.query("SELECT id_produit FROM produits WHERE id_produit = $1 AND archived_at IS NOT NULL", [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit archivé introuvable" });

    await client.query("BEGIN");
    await client.query("DELETE FROM mouvements WHERE id_produit = $1", [id]);
    await client.query("DELETE FROM facture_details WHERE id_produit = $1", [id]);
    await client.query("DELETE FROM vente_details WHERE id_produit = $1", [id]);
    await client.query("DELETE FROM produits WHERE id_produit = $1", [id]);
    await client.query("COMMIT");

    res.json({ success: true, message: "Produit supprimé définitivement" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.post("/:id/image", requireAuth(["admin", "responsable"]), upload.single("image"), async (req, res, next) => {
  const id = req.params.id;
  if (!req.file) return res.status(400).json({ success: false, message: "Aucun fichier fourni" });
  const imageUrl = `/uploads/products/${req.file.filename}`;
  try {
    await db.query("UPDATE produits SET image_url = $1 WHERE id_produit = $2", [imageUrl, id]);
    res.json({ success: true, image_url: imageUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
