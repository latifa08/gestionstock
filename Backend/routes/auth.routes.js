const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const db = require("../db");
const env = require("../.env");
const { validateBody } = require("../middleware/validate");
const { forgotPasswordSchema, resetPasswordSchema } = require("../schemas/user.schema");
const { sendResetEmail } = require("../services/mailer");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, code: "TOO_MANY_REQUESTS", message: "Too many reset attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

function signAccess(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );
}

function signRefresh(userId) {
  return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

// POST /api/login
router.post("/login", loginLimiter, async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Email and password required" });
  }

  try {
    const result = await db.query(
      "SELECT id, email, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Invalid credentials" });
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      "INSERT INTO refresh_tokens (id_user, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, refreshToken, expiresAt]
    );

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      expires: expiresAt,
    });

    res.json({
      success: true,
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/auth/refresh", async (req, res, next) => {
  const token = req.cookies?.refresh_token;

  if (!token) {
    return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Refresh token required" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

    const stored = await db.query(
      "SELECT id, id_user, expires_at FROM refresh_tokens WHERE token = $1",
      [token]
    );

    if (stored.rows.length === 0 || new Date(stored.rows[0].expires_at) < new Date()) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Refresh token expired or invalid" });
    }

    const userResult = await db.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [payload.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "User not found" });
    }

    const user = userResult.rows[0];
    const accessToken = signAccess(user);

    res.json({ success: true, accessToken });
  } catch (err) {
    return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Invalid refresh token" });
  }
});

// POST /api/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  const { email } = req.body;
  const neutral = { success: true, message: "Si cet email est enregistré, un lien de réinitialisation a été envoyé." };

  try {
    const result = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.json(neutral);
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
      await client.query(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [userId, token, expiresAt]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    try {
      await sendResetEmail(email, token);
      console.log("✅ Reset email sent to", email);
    } catch (mailErr) {
      console.error("❌ Email send failed:", mailErr.message);
    }

    res.json(neutral);
  } catch (err) {
    next(err);
  }
});

// POST /api/reset-password
router.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
  const { token, password } = req.body;

  try {
    const result = await db.query(
      "SELECT id, user_id FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, code: "INVALID_TOKEN", message: "Reset link is invalid or has expired." });
    }

    const { id: tokenId, user_id: userId } = result.rows[0];
    const hash = await bcrypt.hash(password, 10);

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET password = $1 WHERE id = $2", [hash, userId]);
      await client.query("UPDATE password_reset_tokens SET used = true WHERE id = $1", [tokenId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({ success: true, message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    next(err);
  }
});

// POST /api/logout
router.post("/logout", async (req, res, next) => {
  const token = req.cookies?.refresh_token;

  if (token) {
    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [token]).catch(() => {});
  }

  res.clearCookie("refresh_token");
  res.json({ success: true });
});

module.exports = router;
