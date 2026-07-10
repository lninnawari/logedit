const jwt = require("jsonwebtoken");

const { config } = require("../config");

function signAdminToken(admin) {
  return jwt.sign(
    {
      role: "admin",
      adminId: admin.id,
      email: admin.email,
    },
    config.jwtSecret,
    { expiresIn: "12h" }
  );
}

function requireAdmin(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing admin token." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Admin token required." });
    }

    req.admin = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid admin token." });
  }
}

module.exports = { requireAdmin, signAdminToken };
