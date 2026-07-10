const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const { z } = require("zod");

const { config } = require("../config");
const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireShareToken } = require("../middleware/shareAuth");
const { replaceTextPreservingMarkup } = require("../services/htmlEditor");

const router = Router();

const verifySchema = z.object({
  password: z.string().min(1),
});

const updateBlockSchema = z.object({
  textContent: z.string(),
});

router.post(
  "/:projectId/verify",
  asyncHandler(async (req, res) => {
    const input = verifySchema.parse(req.body);
    const shareLink = await prisma.shareLink.findUnique({
      where: { projectId: req.params.projectId },
    });

    if (!shareLink) return res.status(404).json({ error: "Share link not found." });

    const ok = await bcrypt.compare(input.password, shareLink.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid password." });

    const token = jwt.sign(
      {
        projectId: req.params.projectId,
        shareLinkId: shareLink.id,
      },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    res.json({ token });
  })
);

router.get(
  "/:projectId/blocks",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const blocks = await prisma.messageBlock.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { orderIndex: "asc" },
    });
    const settings = await prisma.correctionSettings.findUnique({
      where: { projectId: req.params.projectId },
    });

    res.json({ blocks, settings });
  })
);

router.patch(
  "/:projectId/blocks/:blockId",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const input = updateBlockSchema.parse(req.body);
    const block = await prisma.messageBlock.findFirst({
      where: {
        id: req.params.blockId,
        projectId: req.params.projectId,
      },
    });

    if (!block) return res.status(404).json({ error: "Block not found." });

    const rawHtml = replaceTextPreservingMarkup(block.rawHtml, input.textContent);
    const updated = await prisma.messageBlock.update({
      where: { id: block.id },
      data: {
        rawHtml,
        textContent: input.textContent,
        isEdited: true,
      },
    });

    res.json(updated);
  })
);

module.exports = { shareRouter: router };
