const jwt = require("jsonwebtoken");

const { config } = require("../config");

function requireShareToken(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing share session token." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.projectId !== req.params.projectId) {
      return res.status(403).json({ error: "Token project mismatch." });
    }

    req.shareSession = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid share session token." });
  }
}

module.exports = { requireShareToken };
