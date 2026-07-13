const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Router } = require("express");
const { z } = require("zod");

const { config } = require("../config");
const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireShareToken } = require("../middleware/shareAuth");
const { shareVerifyLimiter } = require("../middleware/rateLimiters");
const {
  buildBlockFromTemplate,
  replaceTextNodeAtIndexPreservingMarkup,
  replaceTextPreservingMarkup,
  textFromHtml,
} = require("../services/htmlEditor");

const router = Router();

const verifySchema = z.object({
  password: z.string().min(1),
});

const updateBlockSchema = z.object({
  textContent: z.string(),
  textNodeIndex: z.number().int().min(0).optional(),
});

const createBlockSchema = z.object({
  afterBlockId: z.string().uuid().nullable().optional(),
  blockType: z.enum(["dialogue", "narration"]),
  speakerName: z.string().trim().min(1).optional().nullable(),
  textContent: z.string().trim().min(1),
});

async function computeInsertOrderIndex(projectId, afterBlockId) {
  if (!afterBlockId) {
    const first = await prisma.messageBlock.findFirst({
      where: { projectId, isDeleted: false },
      orderBy: { orderIndex: "asc" },
      select: { orderIndex: true },
    });
    return first ? first.orderIndex - 1 : 0;
  }

  const previous = await prisma.messageBlock.findFirst({
    where: { id: afterBlockId, projectId, isDeleted: false },
    select: { orderIndex: true },
  });
  if (!previous) {
    const error = new Error("Previous block not found.");
    error.status = 404;
    throw error;
  }

  const next = await prisma.messageBlock.findFirst({
    where: { projectId, isDeleted: false, orderIndex: { gt: previous.orderIndex } },
    orderBy: { orderIndex: "asc" },
    select: { orderIndex: true },
  });

  return next ? (previous.orderIndex + next.orderIndex) / 2 : previous.orderIndex + 1;
}

async function findTemplateBlock(projectId, blockType) {
  const template = await prisma.messageBlock.findFirst({
    where: {
      projectId,
      blockType,
      isDeleted: false,
    },
    orderBy: { orderIndex: "asc" },
    select: { rawHtml: true },
  });

  return template?.rawHtml || "";
}

router.post(
  "/:projectId/verify",
  shareVerifyLimiter,
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
      where: { projectId: req.params.projectId, isDeleted: false },
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
        isDeleted: false,
      },
    });

    if (!block) return res.status(404).json({ error: "Block not found." });

    const rawHtml =
      input.textNodeIndex == null
        ? replaceTextPreservingMarkup(block.rawHtml, input.textContent)
        : replaceTextNodeAtIndexPreservingMarkup(block.rawHtml, input.textNodeIndex, input.textContent);
    const textContent = input.textNodeIndex == null ? input.textContent : textFromHtml(rawHtml);
    const updated = await prisma.messageBlock.update({
      where: { id: block.id },
      data: {
        rawHtml,
        textContent,
        isEdited: true,
      },
    });

    res.json(updated);
  })
);

router.post(
  "/:projectId/blocks",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const input = createBlockSchema.parse(req.body);
    if (input.blockType === "dialogue" && !input.speakerName) {
      return res.status(400).json({ error: "speakerName is required for dialogue blocks." });
    }

    const orderIndex = await computeInsertOrderIndex(req.params.projectId, input.afterBlockId || null);
    const templateRawHtml = await findTemplateBlock(req.params.projectId, input.blockType);
    const rawHtml = buildBlockFromTemplate(input.blockType, templateRawHtml, {
      speakerName: input.speakerName || "",
      textContent: input.textContent,
    });
    const textContent = textFromHtml(rawHtml);
    const block = await prisma.messageBlock.create({
      data: {
        projectId: req.params.projectId,
        orderIndex,
        speakerName: input.blockType === "dialogue" ? input.speakerName : null,
        rawHtml,
        textContent,
        originalText: textContent,
        blockType: input.blockType,
        isAdded: true,
      },
    });

    res.status(201).json(block);
  })
);

router.delete(
  "/:projectId/blocks/:blockId",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const block = await prisma.messageBlock.findFirst({
      where: {
        id: req.params.blockId,
        projectId: req.params.projectId,
        isDeleted: false,
      },
    });

    if (!block) return res.status(404).json({ error: "Block not found." });

    const updated = await prisma.messageBlock.update({
      where: { id: block.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json(updated);
  })
);

router.get(
  "/:projectId/trash",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const blocks = await prisma.messageBlock.findMany({
      where: { projectId: req.params.projectId, isDeleted: true },
      orderBy: [{ deletedAt: "desc" }, { orderIndex: "asc" }],
    });

    res.json({ blocks });
  })
);

router.post(
  "/:projectId/blocks/:blockId/restore",
  requireShareToken,
  asyncHandler(async (req, res) => {
    const block = await prisma.messageBlock.findFirst({
      where: {
        id: req.params.blockId,
        projectId: req.params.projectId,
        isDeleted: true,
      },
    });

    if (!block) return res.status(404).json({ error: "Deleted block not found." });

    const restored = await prisma.messageBlock.update({
      where: { id: block.id },
      data: { isDeleted: false, deletedAt: null },
    });

    res.json(restored);
  })
);

module.exports = { shareRouter: router };
