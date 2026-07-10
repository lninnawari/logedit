const bcrypt = require("bcrypt");
const { Router } = require("express");
const { z } = require("zod");

const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { signAdminToken } = require("../middleware/adminAuth");

const router = Router();

const setupAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function hasAdminUser() {
  const count = await prisma.adminUser.count();
  return count > 0;
}

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ required: !(await hasAdminUser()) });
  })
);

router.post(
  "/admin",
  asyncHandler(async (req, res) => {
    if (await hasAdminUser()) {
      return res.status(403).json({ error: "Initial setup is already complete." });
    }

    const input = setupAdminSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const admin = await prisma.adminUser.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    res.status(201).json({
      token: signAdminToken(admin),
      admin,
    });
  })
);

module.exports = { setupRouter: router };
