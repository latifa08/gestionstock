const jwt = require("jsonwebtoken");
const env = require("../.env");

function requireAuth(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication token required",
      });
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.user = { id: payload.id, email: payload.email, role: payload.role };

      if (roles.length > 0 && !roles.includes(payload.role)) {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          message: `Access denied. Required role(s): ${roles.join(", ")}`,
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  };
}

module.exports = { requireAuth };
