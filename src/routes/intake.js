const bcrypt = require("bcrypt");
const multer = require("multer");
const { Router } = require("express");
const { z } = require("zod");

const { prisma } = require("../prisma");
const { asyncHandler } = require("../middleware/asyncHandler");
const { parseHtmlToBlocks } = require("../services/htmlParser");
const { generateSharePassword } = require("../services/passwords");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const intakeProjectSchema = z.object({
  clientName: z.string().trim().min(1),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  contact: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  title: z.string().trim().min(1).default("Untitled request"),
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
    const clientEmail = input.clientEmail || null;

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: input.clientName,
          email: clientEmail,
          contact: input.contact || null,
          notes: input.notes || null,
        },
      });

      const project = await tx.project.create({
        data: {
          title: input.title,
          status: "submitted",
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
          projectClients: {
            create: {
              clientId: client.id,
              role: "requester",
            },
          },
        },
        include: {
          _count: { select: { blocks: true } },
        },
      });

      return { client, project };
    });

    res.status(201).json({
      projectId: result.project.id,
      clientId: result.client.id,
      title: result.project.title,
      status: result.project.status,
      blockCount: result.project._count.blocks,
      message: "Request submitted.",
    });
  })
);

module.exports = { intakeRouter: router };
