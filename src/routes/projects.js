const bcrypt = require("bcrypt");
const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Router } = require("express");
const { z } = require("zod");

const { config } = require("../config");
const { prisma } = require("../prisma");
const { requireAdmin } = require("../middleware/adminAuth");
const { asyncHandler } = require("../middleware/asyncHandler");
const { applyCorrections } = require("../services/correctionEngine");
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

const createProjectSchema = z.object({
  title: z.string().trim().min(1).default("Untitled log"),
  html: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  sourceType: z.enum(["auto", "roll20", "cocofolia"]).default("auto"),
  customHandoutIcon: z.string().trim().min(1).max(8).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["editing", "confirmed", "downloaded"]),
});

const updateSettingsSchema = z
  .object({
    removeHtmlTags: z.boolean().optional(),
    removeHiddenMessage: z.boolean().optional(),
    normalizeEllipsis: z.boolean().optional(),
    normalizeQuotes: z.boolean().optional(),
    speakerTabFormat: z.boolean().optional(),
    cleanBlankLines: z.boolean().optional(),
    markHandoutPosition: z.boolean().optional(),
    customQuoteOpen: z.string().min(1).optional(),
    customQuoteClose: z.string().min(1).optional(),
    customEllipsis: z.string().min(1).optional(),
    customHandoutIcon: z.string().trim().min(1).max(8).optional(),
  })
  .strict();

const updateSharePasswordSchema = z.object({
  password: z.string().min(6),
});

router.use(requireAdmin);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        shareLink: { select: { id: true, createdAt: true } },
        correctionSettings: true,
        _count: { select: { blocks: { where: { isDeleted: false } } } },
      },
    });

    res.json({
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        blockCount: project._count.blocks,
        sharePath: `/share/${project.id}`,
        shareLinkId: project.shareLink?.id || null,
        correctionSettings: project.correctionSettings,
      })),
    });
  })
);

router.post(
  "/upload-links",
  asyncHandler(async (_req, res) => {
    const uploadLink = await prisma.uploadLink.create({
      data: {},
      select: {
        id: true,
        createdAt: true,
        usedAt: true,
      },
    });

    res.status(201).json({
      id: uploadLink.id,
      path: `/intake/${uploadLink.id}`,
      createdAt: uploadLink.createdAt,
      usedAt: uploadLink.usedAt,
    });
  })
);

router.post(
  "/",
  upload.single("htmlFile"),
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const uploadedHtml = req.file ? req.file.buffer.toString("utf8") : null;
    const originalHtml = uploadedHtml || input.html;

    if (!originalHtml) {
      return res.status(400).json({ error: "html text or htmlFile upload is required." });
    }

    const blocks = parseHtmlToBlocks(originalHtml, { sourceType: input.sourceType });
    const plainPassword = input.password || generateSharePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const project = await prisma.project.create({
      data: {
        title: input.title,
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
        shareLink: true,
        _count: {
          select: { blocks: true },
        },
      },
    });

    res.status(201).json({
      projectId: project.id,
      title: project.title,
      blockCount: project._count.blocks,
      share: {
        id: project.shareLink.id,
        path: `/share/${project.id}`,
        password: plainPassword,
      },
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        shareLink: { select: { id: true, createdAt: true } },
        correctionSettings: true,
        _count: { select: { blocks: { where: { isDeleted: false } } } },
      },
    });

    if (!project) return res.status(404).json({ error: "Project not found." });
    return res.json(project);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const input = updateStatusSchema.parse(req.body);
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: input.status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json(project);
  })
);

router.patch(
  "/:id/share-link/password",
  asyncHandler(async (req, res) => {
    const input = updateSharePasswordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const shareLink = await prisma.shareLink.update({
      where: { projectId: req.params.id },
      data: { id: randomUUID(), passwordHash },
      select: { id: true, projectId: true, createdAt: true },
    });

    res.json(shareLink);
  })
);

router.post(
  "/:id/share-session",
  asyncHandler(async (req, res) => {
    const shareLink = await prisma.shareLink.findUnique({
      where: { projectId: req.params.id },
    });

    if (!shareLink) return res.status(404).json({ error: "Share link not found." });

    const token = jwt.sign(
      {
        projectId: req.params.id,
        shareLinkId: shareLink.id,
        adminEdit: true,
      },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    res.json({ token, path: `/share/${req.params.id}` });
  })
);

router.patch(
  "/:id/correction-settings",
  asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);
    const settings = await prisma.correctionSettings.update({
      where: { projectId: req.params.id },
      data: input,
    });

    res.json(settings);
  })
);

async function renderCorrectedText(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      blocks: { where: { isDeleted: false }, orderBy: { orderIndex: "asc" } },
      correctionSettings: true,
    },
  });

  if (!project) return null;
  return applyCorrections(project.blocks, project.correctionSettings || {});
}

router.get(
  "/:id/preview",
  asyncHandler(async (req, res) => {
    const text = await renderCorrectedText(req.params.id);
    if (text == null) return res.status(404).json({ error: "Project not found." });
    res.type("text/plain; charset=utf-8").send(text);
  })
);

router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const text = await renderCorrectedText(req.params.id);
    if (text == null) return res.status(404).json({ error: "Project not found." });

    await prisma.project.update({
      where: { id: req.params.id },
      data: { status: "downloaded" },
    });

    res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.txt"`);
    res.type("text/plain; charset=utf-8").send(text);
  })
);

module.exports = { projectRouter: router };
