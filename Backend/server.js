const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ================== DB ==================
const db = new Pool({
  host: "localhost",
  user: "postgres",
  password: "tita2005",
  database: "stock",
  port: 5432,
});

module.exports = db;

// ================== TEST ==================
db.connect((err) => {
  if (err) console.error("❌ DB Error:", err);
  else console.log("✅ Connected to stock database");
});

// ===================================================
// 📦 PRODUITS
// ===================================================

app.get("/products", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM produits ORDER BY id_produit DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/products", async (req, res) => {
  const {
    nom_produit,
    categorie,
    description,
    quantite,
    prix_unitaire,
    fournisseur,
    date_ajout,
    niveau_alerte,
    code_bar,
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO produits 
      (nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte, code_bar)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id_produit`,
      [
        nom_produit,
        categorie,
        description,
        quantite,
        prix_unitaire,
        fournisseur,
        date_ajout || new Date(),
        niveau_alerte,
        code_bar || Date.now().toString(),
      ]
    );

    res.json({ id: result.rows[0].id_produit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/products/:id", async (req, res) => {
  const id = req.params.id;
  const d = req.body;

  try {
    await db.query(
      `UPDATE produits SET 
      nom_produit=$1,
      categorie=$2,
      description=$3,
      quantite=$4,
      prix_unitaire=$5,
      fournisseur=$6,
      date_ajout=$7,
      niveau_alerte=$8,
      code_bar=$9
      WHERE id_produit=$10`,
      [
        d.nom_produit,
        d.categorie,
        d.description,
        d.quantite,
        d.prix_unitaire,
        d.fournisseur,
        d.date_ajout,
        d.niveau_alerte,
        d.code_bar,
        id,
      ]
    );

    res.json({ message: "Produit modifié" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM mouvements WHERE id_produit=$1", [id]);
    await db.query("DELETE FROM produits WHERE id_produit=$1", [id]);

    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 👥 CLIENTS
// ===================================================
app.get("/clients", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM clients");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/clients", async (req, res) => {
  const { nom, telephone, adresse, email, type } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO clients (nom, telephone, adresse, email, type)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id_client`,
      [nom, telephone, adresse, email, type]
    );

    res.json({ id: result.rows[0].id_client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/clients/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM mouvements WHERE id_client=$1", [id]);
    await db.query("DELETE FROM clients WHERE id_client=$1", [id]);

    res.json({ message: "Client supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/clients/:id", async (req, res) => {
  const id = req.params.id;
  const { nom, telephone, adresse, email, type } = req.body;

  try {
    await db.query(
      `UPDATE clients 
       SET nom=$1, telephone=$2, adresse=$3, email=$4, type=$5
       WHERE id_client=$6`,
      [nom, telephone, adresse, email, type, id]
    );

    res.json({ message: "Client updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Update error" });
  }
});
// ===================================================
// 🚚 FOURNISSEURS
// ===================================================
app.get("/fournisseurs", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM fournisseurs");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/fournisseurs", async (req, res) => {
  const { nom, societe, telephone, email, adresse } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO fournisseurs (nom, societe, telephone, email, adresse)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [nom, societe, telephone, email, adresse]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/fournisseurs/:id", async (req, res) => {
  const id = req.params.id;
  const { nom, societe, telephone, email, adresse } = req.body;

  try {
    const result = await db.query(
      `UPDATE fournisseurs 
       SET nom=$1, societe=$2, telephone=$3, email=$4, adresse=$5
       WHERE id=$6`,
      [nom, societe, telephone, email, adresse, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Fournisseur introuvable" });
    }

    res.json({ message: "Fournisseur mis à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/fournisseurs/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("DELETE FROM mouvements WHERE id_fournisseur=$1", [id]);
    await db.query("DELETE FROM fournisseurs WHERE id=$1", [id]);

    res.json({ message: "Fournisseur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================================================
// 📊 MOUVEMENTS
// ===================================================
app.get("/mouvements", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id_mouvement,
        m.type,
        m.quantite,
        m.date,

        p.nom_produit AS nom_produit,
        c.nom AS nom_client,

        -- 🔥 هنا نجيب fournisseur من produit
        p.fournisseur AS nom_fournisseur

      FROM mouvements m
      LEFT JOIN produits p ON m.id_produit = p.id_produit
      LEFT JOIN clients c ON m.id_client = c.id_client

      ORDER BY m.date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/mouvements", async (req, res) => {
  try {
    const {
      id_produit,
      id_client,
      id_fournisseur,
      type,
      quantite,
      date
    } = req.body;

    if (!id_produit || !type || !quantite) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const result = await db.query(
      `INSERT INTO mouvements 
      (id_produit, id_client, id_fournisseur, type, quantite, date)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id_mouvement`,
      [
        id_produit,
        id_client || null,
        id_fournisseur || null,
        type,
        parseInt(quantite),
        date || new Date()
      ]
    );

    res.json({ id: result.rows[0].id_mouvement });

  } catch (err) {
    console.log("POST MOUVEMENTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
app.get("/clients", async (req, res) => {
  const result = await db.query("SELECT * FROM clients");
  res.json(result.rows);
});

app.get("/products", async (req, res) => {
  const result = await db.query("SELECT * FROM produits");
  res.json(result.rows);
});


// ===================================================
// 📊 DASHBOARD
// ===================================================
// ===================================================
// 📊 DASHBOARD OVERVIEW
// ===================================================
app.get("/dashboard/overview", async (req, res) => {
  try {
    const productsResult = await db.query(`
      SELECT 
        COUNT(*) AS totalproducts,
        COALESCE(SUM(CASE WHEN quantite = 0 THEN 1 ELSE 0 END), 0) AS outofstock
      FROM produits
    `);

    const clientsResult = await db.query(
      "SELECT COUNT(*) AS totalclients FROM clients"
    );

    const fournisseursResult = await db.query(
      "SELECT COUNT(*) AS totalfournisseurs FROM fournisseurs"
    );

    const p = productsResult.rows[0] || {};
    const c = clientsResult.rows[0] || {};
    const f = fournisseursResult.rows[0] || {};

    res.json({
      totalProducts: Number(p.totalproducts) || 0,
      outOfStock: Number(p.outofstock) || 0,
      totalClients: Number(c.totalclients) || 0,
      totalFournisseurs: Number(f.totalfournisseurs) || 0,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// ===================================================
// 📦 PRODUCTS (PIE CHART)
// ===================================================
app.get("/dashboard/products", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id_produit, nom_produit, quantite
      FROM produits
    `);

    res.json(
      result.rows.map(p => ({
        id: p.id_produit,
        name: p.nom_produit,
        quantite: Number(p.quantite) || 0
      }))
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// ===================================================
// 📊 MOUVEMENTS (FOR CHARTS + TOP PRODUCTS)
// ===================================================
app.get("/dashboard/mouvements", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id_mouvement,
        m.id_produit,
        m.date,
        m.type,
        m.quantite,

        -- 🔥 FIX FINAL (ما يبقاش Produit 1 / Unknown)
        COALESCE(
          p.nom_produit,
          CONCAT('Produit ', m.id_produit),
          'Produit supprimé'
        ) AS nom_produit

      FROM mouvements m
      LEFT JOIN produits p 
        ON p.id_produit = m.id_produit
      ORDER BY m.date ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 🔍 SCANNER
// ===================================================
app.get("/api/produits/:code", async (req, res) => {
  try {
    const code = req.params.code;

    const result = await db.query(
      "SELECT * FROM produits WHERE code_bar = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    const p = result.rows[0];

    res.json({
      success: true,
      data: {
        id_produit: p.id_produit,
        code_bar: p.code_bar,
        nom_produit: p.nom_produit,
        prix_unitaire: p.prix_unitaire,
        quantite: p.quantite,
      },
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});


// ===================================================
// 🛒 VENTE
// ===================================================
app.post("/api/vente", async (req, res) => {
  const cart = req.body.cart;

  if (!cart || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Panier vide",
    });
  }

  try {
    for (let item of cart) {

      const check = await db.query(
        "SELECT quantite FROM produits WHERE id_produit = $1",
        [item.id_produit]
      );

      if (check.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Produit introuvable",
        });
      }

      const stock = Number(check.rows[0].quantite || 0);
      const qty = Number(item.quantity || 0);

      if (stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour ${item.nom_produit}`,
        });
      }

      await db.query(
        `UPDATE produits 
         SET quantite = quantite - $1
         WHERE id_produit = $2`,
        [qty, item.id_produit]
      );
    }

    res.json({
      success: true,
      message: "Vente validée avec succès",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ===================================================
// 🧾 FACTURE
// 🧾 CREATE FACTURE
app.post("/api/facture", async (req, res) => {
  const { client, fournisseur, date_facture, produits } = req.body;

  if (!Array.isArray(produits) || produits.length === 0) {
    return res.status(400).json({ message: "Aucun produit envoyé" });
  }

  try {
    await db.query("BEGIN");

    const numero = "FAC-" + Date.now();

    // ✅ fix client (avoid null/empty)
    const clientValue =
      client && client.trim() !== "" ? client : "Sans client";

    const result = await db.query(
      `INSERT INTO factures (numero, client, fournisseur, date_facture)
       VALUES ($1, $2, $3, $4)
       RETURNING id_facture`,
      [numero, clientValue, fournisseur, date_facture]
    );

    const id_facture = result.rows[0].id_facture;

    for (let p of produits) {
      const prodResult = await db.query(
        "SELECT * FROM produits WHERE id_produit=$1",
        [p.id_produit]
      );

      const prod = prodResult.rows[0];

      if (!prod) {
        throw new Error("Produit introuvable");
      }

      if (prod.quantite < p.quantite) {
        throw new Error(`Stock insuffisant pour ${prod.nom_produit}`);
      }

      // update stock
      await db.query(
        `UPDATE produits 
         SET quantite = quantite - $1 
         WHERE id_produit = $2`,
        [p.quantite, p.id_produit]
      );

      // facture details
      await db.query(
        `INSERT INTO facture_details (id_facture, id_produit, quantite, prix)
         VALUES ($1, $2, $3, $4)`,
        [id_facture, p.id_produit, p.quantite, prod.prix_unitaire]
      );

      // mouvements
      await db.query(
        `INSERT INTO mouvements (id_produit, type, quantite)
         VALUES ($1, 'sortie', $2)`,
        [p.id_produit, p.quantite]
      );
    }

    await db.query("COMMIT");

    res.json({
      success: true,
      message: "Facture créée avec succès",
      id_facture,
      numero,
    });
  } catch (err) {
    await db.query("ROLLBACK");

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});


// ======================
// 📋 GET ALL FACTURES
// ======================
app.get("/api/factures", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_facture, numero, client, fournisseur, date_facture 
       FROM factures 
       ORDER BY id_facture DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ======================
// 👁️ GET FACTURE BY ID
// ======================
app.get("/api/facture/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const factureResult = await db.query(
      "SELECT * FROM factures WHERE id_facture=$1",
      [id]
    );

    if (factureResult.rows.length === 0) {
      return res.status(404).json({ message: "Facture introuvable" });
    }

    const facture = factureResult.rows[0];

    const detailsResult = await db.query(
      `SELECT fd.*, p.nom_produit
       FROM facture_details fd
       JOIN produits p ON p.id_produit = fd.id_produit
       WHERE fd.id_facture=$1`,
      [id]
    );

    const details = detailsResult.rows;

    const total = details.reduce(
      (acc, d) => acc + Number(d.prix) * Number(d.quantite),
      0
    );

    res.json({
      ...facture,
      details,
      total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ======================
// 🗑️ DELETE FACTURE
// ======================
app.delete("/api/facture/:id", async (req, res) => {
  const id = req.params.id;

  try {
    await db.query("BEGIN");

    const detailsResult = await db.query(
      "SELECT * FROM facture_details WHERE id_facture=$1",
      [id]
    );

    const details = detailsResult.rows;

    if (details.length === 0) {
      throw new Error("Facture introuvable ou déjà supprimée");
    }

    for (let d of details) {
      await db.query(
        `UPDATE produits 
         SET quantite = quantite + $1 
         WHERE id_produit = $2`,
        [d.quantite, d.id_produit]
      );

      await db.query(
        `INSERT INTO mouvements (id_produit, type, quantite)
         VALUES ($1, 'retour', $2)`,
        [d.id_produit, d.quantite]
      );
    }

    await db.query("DELETE FROM facture_details WHERE id_facture=$1", [id]);
    await db.query("DELETE FROM factures WHERE id_facture=$1", [id]);

    await db.query("COMMIT");

    res.json({
      success: true,
      message: "Facture supprimée avec succès",
    });

  } catch (err) {
    await db.query("ROLLBACK");

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// ===================================================
// 🔐 AUTH
// ===================================================
// ===================================================
// 🔐 REGISTER
// ===================================================
app.post("/api/register", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "missing fields" });
    }

    const allowedRoles = ["admin", "responsable", "magasinier"];
    const finalRole = allowedRoles.includes(role) ? role : "magasinier";

    const exist = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (exist.rows.length > 0) {
      return res.status(409).json({ success: false, message: "User exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email, hash, finalRole]
    );

    res.json({ success: true, id: result.rows[0].id });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===================================================
// 🔐 LOGIN
// ===================================================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "missing fields" });
    }

    const result = await db.query(
      "SELECT id, email, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, message: "Wrong password" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || "magasinier",
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ===================================================
// 👑 CREATE ADMIN (SAFE)
// ===================================================


async function createAdmin() {
  const email = "admin@gmail.com";

  const exist = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (exist.rows.length > 0) {
    console.log("ℹ️ Admin already exists");
    return;
  }

  const hash = await bcrypt.hash("123456", 10);

  await db.query(
    `INSERT INTO users (email, password, role)
     VALUES ($1, $2, 'admin')`,
    [email, hash]
  );

  console.log("✅ Admin created");
}

createAdmin();


// ===================================================
// 👤 GET USERS
// ===================================================
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, email, role FROM users"
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================================================
// ➕ CREATE USER (ADMIN PANEL)
// ===================================================
app.post("/api/users", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "missing fields" });
    }

    const allowedRoles = ["admin", "responsable", "magasinier"];
    const userRole = allowedRoles.includes(role) ? role : "magasinier";

    const exist = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (exist.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email, hash, userRole]
    );

    res.json({ success: true, id: result.rows[0].id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// ✏️ UPDATE USER
// ===================================================
app.put("/api/users/:id", async (req, res) => {
  try {
    const { email, role } = req.body;

    const exist = await db.query(
      "SELECT id FROM users WHERE id = $1",
      [req.params.id]
    );

    if (exist.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const fields = [];
    const values = [];

    if (email) {
      fields.push(`email = $${fields.length + 1}`);
      values.push(email);
    }

    if (role) {
      const allowedRoles = ["admin", "responsable", "magasinier"];
      fields.push(`role = $${fields.length + 1}`);
      values.push(allowedRoles.includes(role) ? role : "magasinier");
    }

    values.push(req.params.id);

    await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${fields.length + 1}`,
      values
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================================================
// ❌ DELETE USER (NO ADMIN DELETE)
// ===================================================
app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [req.params.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.rows[0].role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin" });
    }

    await db.query(
      "DELETE FROM users WHERE id = $1",
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ====================== // 📊 RAPPORT STOCK (REAL) // ======================
// ======================
// 📊 RAPPORT STOCK
// ======================
// ======================
// 📊 RAPPORT STOCK
// ======================
app.get("/api/rapport-stock", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.id_produit,
        p.nom_produit,
        p.categorie,
        p.prix_unitaire,

        COALESCE(SUM(
          CASE 
            WHEN LOWER(TRIM(m.type)) = 'entree' THEN m.quantite 
            ELSE 0 
          END
        ), 0)::INTEGER AS entree,

        COALESCE(SUM(
          CASE 
            WHEN LOWER(TRIM(m.type)) = 'sortie' THEN m.quantite 
            ELSE 0 
          END
        ), 0)::INTEGER AS sortie,

        COALESCE(SUM(
          CASE 
            WHEN LOWER(TRIM(m.type)) = 'retour' THEN m.quantite 
            ELSE 0 
          END
        ), 0)::INTEGER AS retour,

        -- 🔥 FIXED STOCK (ruptures fix)
        COALESCE(
          (
            COALESCE(SUM(CASE WHEN LOWER(TRIM(m.type))='entree' THEN m.quantite ELSE 0 END),0)
            -
            COALESCE(SUM(CASE WHEN LOWER(TRIM(m.type))='sortie' THEN m.quantite ELSE 0 END),0)
          ),
          0
        )::INTEGER AS stock,

        (
          (
            COALESCE(SUM(CASE WHEN LOWER(TRIM(m.type))='entree' THEN m.quantite ELSE 0 END),0)
            -
            COALESCE(SUM(CASE WHEN LOWER(TRIM(m.type))='sortie' THEN m.quantite ELSE 0 END),0)
          ) * COALESCE(p.prix_unitaire,0)
        )::NUMERIC AS valeur_stock

      FROM produits p
      LEFT JOIN mouvements m 
        ON p.id_produit = m.id_produit

      GROUP BY 
        p.id_produit,
        p.nom_produit,
        p.categorie,
        p.prix_unitaire
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// ======================
// ⚠️ STOCK ALERT
// ======================
app.get("/stock-alert", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id_produit, nom_produit AS produit, quantite AS stock
      FROM produits
      WHERE quantite <= niveau_alerte OR quantite = 0
    `);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ===================================================
// 🚀 SERVER
// ===================================================

app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000")
);