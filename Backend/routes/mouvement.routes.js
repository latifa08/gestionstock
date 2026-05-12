const express = require("express");
const router  = express.Router();
const db      = require("../db");
const { requireAuth }  = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createMouvementSchema } = require("../schemas/mouvement.schema");

/* ── helpers ─────────────────────────────────────── */

async function syncProductQty(client, id_produit) {
  await client.query(
    "UPDATE produits SET quantite = (SELECT COALESCE(SUM(quantite),0) FROM lots WHERE id_produit = $1) WHERE id_produit = $1",
    [id_produit]
  );
}

/* Create or merge a lot on stock-in */
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

/* FEFO deduction on stock-out — skips expired lots, throws if insufficient valid stock */
async function deductFEFO(client, id_produit, quantite) {
  const lotsRes = await client.query(
    `SELECT id_lot, quantite FROM lots
     WHERE id_produit = $1 AND quantite > 0
       AND (date_expiration IS NULL OR date_expiration >= CURRENT_DATE)
     ORDER BY date_expiration ASC NULLS LAST, id_lot ASC`,
    [id_produit]
  );

  const available = lotsRes.rows.reduce((s, l) => s + Number(l.quantite), 0);
  if (available < quantite) {
    throw Object.assign(new Error(
      `Stock valide insuffisant : ${available} disponible (les lots expirés sont exclus), ${quantite} demandé`
    ), { statusCode: 400, code: "INSUFFICIENT_VALID_STOCK" });
  }

  let remaining = quantite;
  for (const lot of lotsRes.rows) {
    if (remaining <= 0) break;
    const deduct = Math.min(remaining, lot.quantite);
    await client.query("UPDATE lots SET quantite = quantite - $1 WHERE id_lot = $2", [deduct, lot.id_lot]);
    remaining -= deduct;
  }

  /* purge empty lots */
  await client.query("DELETE FROM lots WHERE id_produit = $1 AND quantite = 0", [id_produit]);

  return remaining === 0;
}

/* ── GET / ─────────────────────────────────────── */
router.get("/", requireAuth([]), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT m.id_mouvement, m.type, m.quantite, m.date, m.raison,
        p.nom_produit, c.nom AS nom_client, p.fournisseur AS nom_fournisseur,
        u.email AS created_by, u.role AS created_by_role
      FROM mouvements m
      LEFT JOIN produits p ON m.id_produit = p.id_produit
      LEFT JOIN clients  c ON m.id_client  = c.id_client
      LEFT JOIN users    u ON m.id_user    = u.id
      ORDER BY m.date DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

/* ── POST / ────────────────────────────────────── */
router.post("/", requireAuth([]), validateBody(createMouvementSchema), async (req, res, next) => {
  const { id_produit, id_client, id_fournisseur, type, quantite, raison, date, date_expiration } = req.body;

  const client = await db.connect();
  try {
    /* ── pre-flight stock check ── */
    const check = await client.query("SELECT quantite FROM produits WHERE id_produit = $1", [id_produit]);
    if (!check.rows.length) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Produit introuvable" });

    if (type === "sortie") {
      /* count only non-expired lots */
      const validRes = await client.query(
        `SELECT COALESCE(SUM(quantite),0) AS valid FROM lots
         WHERE id_produit = $1 AND quantite > 0
           AND (date_expiration IS NULL OR date_expiration >= CURRENT_DATE)`,
        [id_produit]
      );
      const valid = Number(validRes.rows[0].valid);
      if (valid < quantite) {
        return res.status(400).json({
          success: false,
          code: "INSUFFICIENT_VALID_STOCK",
          message: `Stock valide insuffisant : ${valid} disponible (lots expirés exclus), ${quantite} demandé`,
        });
      }
    } else if (type === "retour" && check.rows[0].quantite < quantite) {
      return res.status(400).json({
        success: false,
        code: "INSUFFICIENT_STOCK",
        message: `Stock insuffisant: ${check.rows[0].quantite} disponible, ${quantite} demandé`,
      });
    }

    await client.query("BEGIN");

    /* ── record mouvement ── */
    const result = await client.query(
      "INSERT INTO mouvements (id_produit, id_client, id_fournisseur, type, quantite, date, id_user, raison) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_mouvement",
      [id_produit, id_client || null, id_fournisseur || null, type, quantite, date || new Date(), req.user.id, raison || null]
    );

    /* ── lot management ── */
    if (type === "entree" || type === "retour") {
      await addToLot(client, id_produit, quantite, date_expiration);
    } else if (type === "sortie") {
      await deductFEFO(client, id_produit, quantite);
    } else {
      /* ajustement: treat as delta on the no-expiry lot */
      await addToLot(client, id_produit, quantite, null);
    }

    /* ── sync produits.quantite from lots ── */
    await syncProductQty(client, id_produit);

    await client.query("COMMIT");
    res.status(201).json({ success: true, id: result.rows[0].id_mouvement });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
