const bcrypt = require("bcrypt");
const { Router } = require("express");
const { z } = require("zod");

const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireAdmin, signAdminToken } = require("../middleware/adminAuth");
const { adminLoginLimiter } = require("../middleware/rateLimiters");

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  adminLoginLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const admin = await prisma.adminUser.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!admin) return res.status(401).json({ error: "Invalid credentials." });

    const ok = await bcrypt.compare(input.password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });

    res.json({
      token: signAdminToken(admin),
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });
  })
);

router.get(
  "/me",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json({
      admin: {
        id: req.admin.adminId,
        email: req.admin.email,
      },
    });
  })
);

module.exports = { adminRouter: router };
