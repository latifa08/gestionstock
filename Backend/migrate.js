const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "tita2005",
  database: process.env.DB_NAME || "stock",
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getApplied() {
  const result = await db.query("SELECT filename FROM schema_migrations ORDER BY filename");
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getApplied();

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("cleanup") && !f.startsWith("reconcile"))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭  Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`⏳ Applying ${file}...`);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✅ Applied ${file}`);
      ran++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`❌ Failed on ${file}:`, err.message);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (ran === 0) {
    console.log("✅ All migrations already applied — nothing to do.");
  } else {
    console.log(`✅ Applied ${ran} migration(s).`);
  }

  await db.end();
}

runMigrations().catch((err) => {
  console.error("Migration runner error:", err);
  process.exit(1);
});
