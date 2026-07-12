const bcrypt = require("bcrypt");
const multer = require("multer");
const { Router } = require("express");
const { z } = require("zod");

const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { parseHtmlToBlocks } = require("../services/htmlParser");
const { generateSharePassword } = require("../services/passwords");

const router = Router();
const htmlUploadLimit = 30 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: htmlUploadLimit,
    fieldSize: htmlUploadLimit,
  },
});

const intakeProjectSchema = z.object({
  notes: z.string().trim().max(5000).optional(),
  title: z.string().trim().min(1),
  html: z.string().min(1).optional(),
});

router.post(
  "/projects",
  upload.single("htmlFile"),
  asyncHandler(async (req, res) => {
    const input = intakeProjectSchema.parse(req.body);
    const uploadedHtml = req.file ? req.file.buffer.toString("utf8") : null;
    const originalHtml = uploadedHtml || input.html;

    if (!originalHtml) {
      return res.status(400).json({ error: "html text or htmlFile upload is required." });
    }

    const blocks = parseHtmlToBlocks(originalHtml);
    const sharePassword = generateSharePassword();
    const passwordHash = await bcrypt.hash(sharePassword, 12);

    const project = await prisma.project.create({
      data: {
        title: input.title,
        status: "editing",
        originalHtml,
        blocks: {
          create: blocks,
        },
        shareLink: {
          create: { passwordHash },
        },
        correctionSettings: {
          create: {},
        },
      },
      include: {
        _count: { select: { blocks: true } },
      },
    });

    res.status(201).json({
      projectId: project.id,
      title: project.title,
      blockCount: project._count.blocks,
      message: "Upload received.",
    });
  })
);

module.exports = { intakeRouter: router };
