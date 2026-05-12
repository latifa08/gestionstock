const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createProductSchema, updateProductSchema } = require("../schemas/product.schema");

async function syncProductQty(client, id_produit) {
  await client.query(
    "UPDATE produits SET quantite = (SELECT COALESCE(SUM(quantite),0) FROM lots WHERE id_produit = $1) WHERE id_produit = $1",
    [id_produit]
  );
}

async function addToLot(client, id_produit, quantite, date_expiration) {
  const expVal = date_expiration || null;
  const existing = await client.query(
    "SELECT id_lot FROM lots WHERE id_produit = $1 AND date_expiration IS NOT DISTINCT FROM $2",
    [id_produit, expVal]
  );
  if (existing.rows.length) {
    await client.query("UPDATE lots SET quantite = quantite + $1 WHERE id_lot = $2", [quantite, existing.rows[0].id_lot]);
  } else {
    await client.query(
      "INSERT INTO lots (id_produit, quantite, date_expiration) VALUES ($1,$2,$3)",
      [id_produit, quantite, expVal]
    );
  }
}

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
  try {
    const result = await db.query(
      `SELECT p.*,
         COALESCE((
           SELECT SUM(l.quantite) FROM lots l
           WHERE l.id_produit = p.id_produit AND l.quantite > 0
             AND (l.date_expiration IS NULL OR l.date_expiration >= CURRENT_DATE)
         ), 0) AS valid_stock
       FROM produits p WHERE p.code_bar = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Produit introuvable" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}); 

router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const archived = req.query.archived === "true";
    const result = await db.query(
      `SELECT p.*,
         COALESCE((SELECT SUM(l.quantite) FROM lots l WHERE l.id_produit = p.id_produit), 0) AS quantite,
         (SELECT MIN(l.date_expiration)
          FROM lots l
          WHERE l.id_produit = p.id_produit
            AND l.quantite > 0
            AND l.date_expiration IS NOT NULL
            AND l.date_expiration >= CURRENT_DATE
         ) AS prochaine_expiration,
         (SELECT COUNT(*)
          FROM lots l
          WHERE l.id_produit = p.id_produit AND l.quantite > 0
            AND l.date_expiration IS NOT NULL AND l.date_expiration < CURRENT_DATE
         ) AS lots_expires
       FROM produits p
       WHERE ${archived ? "p.archived_at IS NOT NULL" : "p.archived_at IS NULL"}
       ORDER BY p.id_produit DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth(["admin", "responsable"]), validateBody(createProductSchema), async (req, res, next) => {
  const { nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar, date_expiration } = req.body;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO produits (nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar, date_expiration)
       VALUES ($1,$2,$3,0,$4,$5,$6,$7,$8,$9) RETURNING id_produit`,
      [nom_produit, categorie, description, prix_unitaire, fournisseur, date_ajout || new Date(), niveau_alerte, code_bar || Date.now().toString(), date_expiration || null]
    );
    const id_produit = result.rows[0].id_produit;

    if (quantite > 0) {
      await addToLot(client, id_produit, quantite, date_expiration || null);
      await syncProductQty(client, id_produit);
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, id: id_produit });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.put("/:id", requireAuth(["admin", "responsable"]), validateBody(updateProductSchema), async (req, res, next) => {
  const id = req.params.id;
  const d = req.body;
  try {
    await db.query(
      `UPDATE produits SET nom_produit=$1, categorie=$2, description=$3, prix_unitaire=$4,
       fournisseur=$5, date_ajout=$6, niveau_alerte=$7, code_bar=$8 WHERE id_produit=$9`,
      [d.nom_produit, d.categorie, d.description, d.prix_unitaire, d.fournisseur, d.date_ajout, d.niveau_alerte, d.code_bar, id]
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
