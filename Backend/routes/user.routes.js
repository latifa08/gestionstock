const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createUserSchema, updateUserSchema } = require("../schemas/user.schema");

router.get("/", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const result = await db.query("SELECT id, email, role, first_name, last_name, phone, created_at FROM users");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth(["admin"]), validateBody(createUserSchema), async (req, res, next) => {
  const { email, password, role, first_name, last_name, phone } = req.body;
  try {
    const exist = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (exist.rows.length > 0) return res.status(409).json({ success: false, code: "CONFLICT", message: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (email, password, role, first_name, last_name, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [email, hash, role, first_name || null, last_name || null, phone || null]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth(["admin"]), validateBody(updateUserSchema), async (req, res, next) => {
  const { email, role, first_name, last_name, phone } = req.body;
  const fields = [];
  const values = [];

  if (email !== undefined) { fields.push(`email = $${fields.length + 1}`); values.push(email); }
  if (role !== undefined) { fields.push(`role = $${fields.length + 1}`); values.push(role); }
  if (first_name !== undefined) { fields.push(`first_name = $${fields.length + 1}`); values.push(first_name); }
  if (last_name !== undefined) { fields.push(`last_name = $${fields.length + 1}`); values.push(last_name); }
  if (phone !== undefined) { fields.push(`phone = $${fields.length + 1}`); values.push(phone); }
  if (fields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });

  values.push(req.params.id);
  try {
    const exist = await db.query("SELECT id FROM users WHERE id = $1", [req.params.id]);
    if (exist.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "User not found" });

    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${fields.length + 1}`, values);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const user = await db.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (user.rows.length === 0) return res.status(404).json({ success: false, code: "NOT_FOUND", message: "User not found" });
    if (user.rows[0].role === "admin") return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Cannot delete admin" });

    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
