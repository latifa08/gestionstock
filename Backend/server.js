const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const env = require("./.env");
const db = require("./db");
const { handleDbError } = require("./middleware/errors");

const app = express();

app.use(cors({ origin: env.FRONT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===================================================
// Routes
// ===================================================
app.use("/api", require("./routes/auth.routes"));
app.use("/products", require("./routes/product.routes"));
app.use("/clients", require("./routes/client.routes"));
app.use("/fournisseurs", require("./routes/fournisseur.routes"));
app.use("/mouvements", require("./routes/mouvement.routes"));
app.use("/api/vente", require("./routes/vente.routes"));
app.use("/api/facture", require("./routes/facture.routes"));
app.use("/api/factures", (req, res, next) => {
  req.url = "/s" + req.url;
  require("./routes/facture.routes")(req, res, next);
});
app.use("/api/users", require("./routes/user.routes"));
app.use("/dashboard", require("./routes/dashboard.routes"));
app.use("/api/rapport-stock", require("./routes/rapport.routes"));
app.use("/", require("./routes/stock-alert.routes"));

// ===================================================
// Global error handler (must be last)
// ===================================================
app.use(handleDbError);

// ===================================================
// Startup
// ===================================================
async function createAdmin() {
  const exist = await db.query("SELECT id FROM users WHERE email = $1", ["mazounilatifa44@gmail.com"]);
  if (exist.rows.length > 0) return;
  const bcrypt = require("bcrypt");
  const hash = await bcrypt.hash("123456", 10);
  await db.query("INSERT INTO users (email, password, role) VALUES ($1,$2,'admin')", ["mazounilatifa44@gmail.com", hash]);
  console.log("✅ Admin created");
}

createAdmin().catch(console.error);

app.listen(env.PORT, () =>
  console.log(`🚀 Server running on http://localhost:${env.PORT}`)
);
