const { Pool } = require("pg");
const env = require("./.env");

const db = new Pool({
  host: env.DB_HOST || "localhost",
  user: env.DB_USER || "postgres",
  password: env.DB_PASSWORD || "tita2005",
  database: env.DB_NAME || "stock",
  port: parseInt(env.DB_PORT || "5432"),
});

db.connect((err) => {
  if (err) console.error("❌ DB Error:", err);
  else console.log("✅ Connected to stock database");
});

module.exports = db;
