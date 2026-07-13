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
  sourceType: z.enum(["auto", "roll20", "cocofolia"]).default("auto"),
  customHandoutIcon: z.string().trim().min(1).max(8).optional(),
});

router.get(
  "/:token",
  asyncHandler(async (req, res) => {
    const uploadLink = await prisma.uploadLink.findUnique({
      where: { id: req.params.token },
      select: {
        id: true,
        createdAt: true,
        usedAt: true,
        uploadedProject: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });

    if (!uploadLink) return res.status(404).json({ error: "Upload link not found." });

    res.json({
      id: uploadLink.id,
      createdAt: uploadLink.createdAt,
      usedAt: uploadLink.usedAt,
      used: Boolean(uploadLink.usedAt),
      uploadedProject: uploadLink.uploadedProject,
    });
  })
);

router.post(
  "/:token/projects",
  upload.single("htmlFile"),
  asyncHandler(async (req, res) => {
    const input = intakeProjectSchema.parse(req.body);
    const uploadedHtml = req.file ? req.file.buffer.toString("utf8") : null;
    const originalHtml = uploadedHtml || input.html;

    if (!originalHtml) {
      return res.status(400).json({ error: "html text or htmlFile upload is required." });
    }

    const blocks = parseHtmlToBlocks(originalHtml, { sourceType: input.sourceType });
    const sharePassword = generateSharePassword();
    const passwordHash = await bcrypt.hash(sharePassword, 12);

    const project = await prisma.$transaction(async (tx) => {
      const claimed = await tx.uploadLink.updateMany({
        where: {
          id: req.params.token,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        const existing = await tx.uploadLink.findUnique({
          where: { id: req.params.token },
          select: { id: true, usedAt: true },
        });
        const error = new Error(existing ? "Upload link has already been used." : "Upload link not found.");
        error.status = existing ? 410 : 404;
        throw error;
      }

      const createdProject = await tx.project.create({
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
            create: {
              customHandoutIcon: input.customHandoutIcon || undefined,
            },
          },
        },
        include: {
          _count: { select: { blocks: true } },
        },
      });

      await tx.uploadLink.update({
        where: { id: req.params.token },
        data: { uploadedProjectId: createdProject.id },
      });

      return createdProject;
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
