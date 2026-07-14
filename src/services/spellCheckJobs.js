const { randomUUID } = require("node:crypto");

const { replaceTextPreservingMarkup } = require("./htmlEditor");
const { checkChunk } = require("./spellCheck");

const jobs = new Map();
const finishedJobTtlMs = 30 * 60 * 1000;

function countWords(text) {
  return String(text || "").split(/\s+/).filter(Boolean).length;
}

function splitIntoChunks(blocks, maxWords = 280) {
  const chunks = [];
  let current = { blocks: [], text: "", wordCount: 0 };

  for (const block of blocks) {
    const blockText = String(block.textContent || "");
    if (!blockText.trim()) continue;

    const blockWordCount = countWords(blockText);
    if (current.blocks.length > 0 && current.wordCount + blockWordCount > maxWords) {
      chunks.push(current);
      current = { blocks: [], text: "", wordCount: 0 };
    }

    const separator = current.text ? "\n" : "";
    const offsetInChunk = current.text.length + separator.length;
    current.text += separator + blockText;
    current.blocks.push({
      blockId: block.id,
      offsetInChunk,
      length: blockText.length,
    });
    current.wordCount += blockWordCount;
  }

  if (current.blocks.length > 0) chunks.push(current);
  return chunks;
}

function findOwningBlock(issue, chunk) {
  return [...chunk.blocks].reverse().find((block) => block.offsetInChunk <= issue.start);
}

function remapOffsetsToBlocks(issues, chunk) {
  return issues.flatMap((issue) => {
    const owner = findOwningBlock(issue, chunk);
    if (!owner) return [];

    const start = issue.start - owner.offsetInChunk;
    const end = issue.end - owner.offsetInChunk;
    if (start < 0 || end > owner.length) return [];

    return [
      {
        id: randomUUID(),
        blockId: owner.blockId,
        start,
        end,
        original: issue.original,
        candidates: issue.candidates,
        help: issue.help,
      },
    ];
  });
}

function cleanupJobs() {
  const now = Date.now();
  for (const [jobId, job] of jobs) {
    if (job.finishedAt && now - job.finishedAt > finishedJobTtlMs) jobs.delete(jobId);
  }
}

async function processChunks(jobId, chunks) {
  const job = jobs.get(jobId);
  if (!job) return;

  for (const chunk of chunks) {
    try {
      const issues = await checkChunk(chunk.text);
      job.results.push(...remapOffsetsToBlocks(issues, chunk));
    } catch (error) {
      job.failures.push({
        blockIds: chunk.blocks.map((block) => block.blockId),
        message: error.message,
      });
    } finally {
      job.completed += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  job.status = "done";
  job.finishedAt = Date.now();
}

async function startSpellCheckJob(prisma, projectId) {
  cleanupJobs();

  const blocks = await prisma.messageBlock.findMany({
    where: { projectId, isDeleted: false, blockType: { not: "handout" } },
    orderBy: { orderIndex: "asc" },
    select: { id: true, textContent: true },
  });
  const chunks = splitIntoChunks(blocks);
  const jobId = randomUUID();

  jobs.set(jobId, {
    id: jobId,
    projectId,
    status: chunks.length > 0 ? "running" : "done",
    total: chunks.length,
    completed: 0,
    results: [],
    failures: [],
    createdAt: Date.now(),
    finishedAt: chunks.length > 0 ? null : Date.now(),
  });

  if (chunks.length > 0) {
    processChunks(jobId, chunks);
  }

  return jobId;
}

function getSpellCheckJob(projectId, jobId) {
  const job = jobs.get(jobId);
  if (!job || job.projectId !== projectId) return null;
  return {
    status: job.status,
    total: job.total,
    completed: job.completed,
    results: job.status === "done" ? job.results : [],
    failures: job.status === "done" ? job.failures : [],
  };
}

function applyChangeToText(text, change) {
  return `${text.slice(0, change.start)}${change.replacement}${text.slice(change.end)}`;
}

async function applySpellCheckChanges(prisma, projectId, changes) {
  const grouped = new Map();
  for (const change of changes) {
    if (!grouped.has(change.blockId)) grouped.set(change.blockId, []);
    grouped.get(change.blockId).push(change);
  }

  const updatedBlocks = [];
  const skipped = [];

  for (const [blockId, blockChanges] of grouped) {
    const block = await prisma.messageBlock.findFirst({
      where: { id: blockId, projectId, isDeleted: false, blockType: { not: "handout" } },
    });

    if (!block) {
      skipped.push(...blockChanges.map((change) => ({ ...change, reason: "block-not-found" })));
      continue;
    }

    let nextText = block.textContent || "";
    const validChanges = [];

    for (const change of [...blockChanges].sort((a, b) => b.start - a.start)) {
      const currentOriginal = nextText.slice(change.start, change.end);
      if (currentOriginal !== change.original) {
        skipped.push({ ...change, reason: "text-changed" });
        continue;
      }

      validChanges.push(change);
      nextText = applyChangeToText(nextText, change);
    }

    if (validChanges.length === 0 || nextText === block.textContent) continue;

    const updated = await prisma.messageBlock.update({
      where: { id: block.id },
      data: {
        textContent: nextText,
        rawHtml: replaceTextPreservingMarkup(block.rawHtml, nextText),
        isEdited: true,
      },
    });
    updatedBlocks.push(updated);
  }

  return { updatedBlocks, skipped };
}

module.exports = {
  applySpellCheckChanges,
  getSpellCheckJob,
  remapOffsetsToBlocks,
  splitIntoChunks,
  startSpellCheckJob,
};
