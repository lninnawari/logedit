const { Router } = require("express");

const { prisma } = require("../prisma");
const { requireAdmin } = require("../middleware/adminAuth");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = Router();

router.use(requireAdmin);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    res.json({ clients });
  })
);

module.exports = { clientRouter: router };
