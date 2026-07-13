const jwt = require("jsonwebtoken");

const { config } = require("../config");
const { prisma } = require("../prisma");

async function requireShareToken(req, res, next) {
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

    const shareLink = await prisma.shareLink.findUnique({
      where: { projectId: req.params.projectId },
      select: { id: true },
    });

    if (!shareLink || payload.shareLinkId !== shareLink.id) {
      return res.status(401).json({ error: "Expired share session token." });
    }

    req.shareSession = payload;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid share session token." });
    }

    return next(error);
  }
}

module.exports = { requireShareToken };
