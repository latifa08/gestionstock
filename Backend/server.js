const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ================== DB ==================
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "stock",
  port: 3309,
});

const dbPromise = db.promise();

// ================== TEST ==================
db.getConnection((err, conn) => {
  if (err) {
    console.error(" DB Error:", err);
  } else {
    console.log("✅ Connected to stock database");
    conn.release();
  }
});


// ================== PRODUCTS ==================
app.get("/products", async (req, res) => {
  try {
    const [rows] = await dbPromise.query(
      "SELECT * FROM produits ORDER BY id_produit DESC"
    );
    res.json(rows);
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
  } = req.body;

  try {
    const [result] = await dbPromise.query(
      `INSERT INTO produits 
      (nom_produit, categorie, description, quantite, prix_unitaire, fournisseur, date_ajout, niveau_alerte)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nom_produit,
        categorie,
        description,
        quantite,
        prix_unitaire,
        fournisseur,
        date_ajout,
        niveau_alerte,
      ]
    );

    res.json({ id: result.insertId, message: "Produit ajouté" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    await dbPromise.query(
      `UPDATE produits SET 
      nom_produit=?, categorie=?, description=?, quantite=?, prix_unitaire=?, fournisseur=?, date_ajout=?, niveau_alerte=? 
      WHERE id_produit=?`,
      [
        data.nom_produit,
        data.categorie,
        data.description,
        data.quantite,
        data.prix_unitaire,
        data.fournisseur,
        data.date_ajout,
        data.niveau_alerte,
        id,
      ]
    );

    res.json({ message: "Produit modifié" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await dbPromise.query("DELETE FROM mouvements WHERE id_produit=?", [id]);
    await dbPromise.query("DELETE FROM produits WHERE id_produit=?", [id]);

    res.json({ message: "Produit supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== CLIENTS ==================
app.get("/clients", async (req, res) => {
  try {
    const [rows] = await dbPromise.query("SELECT * FROM clients");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/clients", async (req, res) => {
  const { nom, telephone, adresse, email, type } = req.body;

  try {
    const [result] = await dbPromise.query(
      "INSERT INTO clients (nom, telephone, adresse, email, type) VALUES (?, ?, ?, ?, ?)",
      [nom, telephone, adresse, email, type]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/clients/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await dbPromise.query("DELETE FROM mouvements WHERE id_client=?", [id]);
    await dbPromise.query("DELETE FROM clients WHERE id_client=?", [id]);

    res.json({ message: "Client supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== FOURNISSEURS ==================
app.get("/fournisseurs", async (req, res) => {
  try {
    const [rows] = await dbPromise.query("SELECT * FROM fournisseurs");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/fournisseurs", async (req, res) => {
  const { nom, societe, telephone, email, adresse } = req.body;

  try {
    const [result] = await dbPromise.query(
      "INSERT INTO fournisseurs (nom, societe, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)",
      [nom, societe, telephone, email, adresse]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/fournisseurs/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await dbPromise.query("DELETE FROM mouvements WHERE id_fournisseur=?", [id]);
    await dbPromise.query("DELETE FROM fournisseurs WHERE id=?", [id]);

    res.json({ message: "Fournisseur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== MOUVEMENTS ==================
app.get("/mouvements", async (req, res) => {
  try {
    const [rows] = await dbPromise.query(`
      SELECT 
        m.id_mouvement,
        m.type,
        m.quantite,
        m.date,
        p.nom_produit AS produit,
        c.nom AS client,
        f.nom AS fournisseur
      FROM mouvements m
      LEFT JOIN produits p ON m.id_produit = p.id_produit
      LEFT JOIN clients c ON m.id_client = c.id_client
      LEFT JOIN fournisseurs f ON m.id_fournisseur = f.id
      ORDER BY m.date DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/mouvements", async (req, res) => {
  const { id_produit, id_client, id_fournisseur, type, quantite, date } = req.body;

  try {
    const [result] = await dbPromise.query(
      `INSERT INTO mouvements 
      (id_produit, id_client, id_fournisseur, type, quantite, date)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [id_produit, id_client || null, id_fournisseur || null, type, quantite, date || new Date()]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================== DASHBOARD ==================

// OVERVIEW
app.get("/dashboard/overview", async (req, res) => {
  try {
    const [[products]] = await dbPromise.query(`
      SELECT 
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN quantite = 0 THEN 1 ELSE 0 END) AS outOfStock
      FROM produits
    `);

    const [[clients]] = await dbPromise.query(
      "SELECT COUNT(*) AS totalClients FROM clients"
    );

    const [[fournisseurs]] = await dbPromise.query(
      "SELECT COUNT(*) AS totalFournisseurs FROM fournisseurs"
    );

    res.json({
      totalProducts: products.totalProducts || 0,
      outOfStock: products.outOfStock || 0,
      totalClients: clients.totalClients || 0,
      totalFournisseurs: fournisseurs.totalFournisseurs || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// TOP PRODUCTS
app.get("/dashboard/top-products", async (req, res) => {
  try {
    const [rows] = await dbPromise.query(`
      SELECT p.nom_produit AS produit, SUM(m.quantite) AS ventes
      FROM mouvements m
      JOIN produits p ON p.id_produit = m.id_produit
      WHERE m.type IN ('SORTIE','vente')
      GROUP BY m.id_produit
      ORDER BY ventes DESC
      LIMIT 5
    `);

    const max = rows[0]?.ventes || 1;

    res.json(
      rows.map(r => ({
        produit: r.produit,
        ventes: r.ventes,
        percent: Math.round((r.ventes / max) * 100),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PIE STOCK
app.get("/dashboard/pie-stock", async (req, res) => {
  try {
    const [[data]] = await dbPromise.query(`
      SELECT 
        SUM(CASE WHEN quantite > 0 THEN 1 ELSE 0 END) AS enStock,
        SUM(CASE WHEN quantite = 0 THEN 1 ELSE 0 END) AS horsStock
      FROM produits
    `);

    res.json([
      { name: "En Stock", value: data.enStock || 0 },
      { name: "Hors stock", value: data.horsStock || 0 },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// BAR ACTIVITY
app.get("/dashboard/bar-activity", async (req, res) => {
  try {
    const [rows] = await dbPromise.query(`
      SELECT date FROM mouvements WHERE type IN ('SORTIE','vente')
    `);

    const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

    const result = days.map((d, idx) => ({
      name: d,
      value: rows.filter(r => {
        const date = new Date(r.date);
        return date.getDay() === idx;
      }).length
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================================================
// 👤 REGISTER
// ===================================================
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email ou password manquant",
      });
    }

    // check if exists
    const [exist] = await dbPromise.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (exist.length > 0) {
      return res.json({
        success: false,
        message: "الحساب موجود مسبقا",
      });
    }

    // hash password
    const hash = await bcrypt.hash(password, 10);

    // insert user
    const [result] = await dbPromise.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, role || "responsable"]
    );

    res.json({
      success: true,
      message: "User created",
      user: {
        id: result.insertId,
        email,
        role: role || "responsable",
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});


// ===================================================
// 🔐 LOGIN
// ===================================================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await dbPromise.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "الحساب غير موجود",
      });
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({
        success: false,
        message: "كلمة السر خاطئة",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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
// 👑 CREATE ADMIN (مرة وحدة فقط)
// ===================================================
app.get("/api/create-admin", async (req, res) => {
  try {
    const email = "admin@gmail.com";
    const password = "123456";

    const [exist] = await dbPromise.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (exist.length > 0) {
      return res.json({ message: "Admin already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    await dbPromise.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, "admin"]
    );

    res.json({ success: true, message: "Admin created" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 👤 GET ALL USERS
// ===================================================
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await dbPromise.query(
      "SELECT id, email, role FROM users"
    );
    res.json(rows);
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

    const hash = await bcrypt.hash(password, 10);

    const [result] = await dbPromise.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [email, hash, role || "magasinier"]
    );

    res.json({
      success: true,
      id: result.insertId,
    });

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

    await dbPromise.query(
      "UPDATE users SET email = ?, role = ? WHERE id = ?",
      [email, role, req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================================================
// 🗑️ DELETE USER
// ===================================================
app.delete("/api/users/:id", async (req, res) => {
  try {
    await dbPromise.query(
      "DELETE FROM users WHERE id = ?",
      [req.params.id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ================== START ==================
app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000")
);