const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", 
  database: "r",
  port: 3309
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
});




app.get("/fournisseurs", (req, res) => {
  db.query("SELECT * FROM fournisseurs", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

app.get("/fournisseurs/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM fournisseurs WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results[0]);
  });
});


app.post("/fournisseurs", (req, res) => {
  const { nom, societe, telephone, email, adresse } = req.body;
  if (!nom || !societe || !telephone) {
    return res.status(400).json({ error: "Nom, Société et Téléphone sont obligatoires" });
  }
  db.query(
    "INSERT INTO fournisseurs (nom, societe, telephone, email, adresse) VALUES (?, ?, ?, ?, ?)",
    [nom, societe, telephone, email, adresse],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ id: result.insertId, nom, societe, telephone, email, adresse });
    }
  );
});


app.put("/fournisseurs/:id", (req, res) => {
  const { id } = req.params;
  const { nom, societe, telephone, email, adresse } = req.body;
  db.query(
    "UPDATE fournisseurs SET nom=?, societe=?, telephone=?, email=?, adresse=? WHERE id=?",
    [nom, societe, telephone, email, adresse, id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Fournisseur updated" });
    }
  );
});


app.delete("/fournisseurs/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM fournisseurs WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Fournisseur deleted" });
  });
});


app.listen(5002, () => console.log("Server running on port 5002"));