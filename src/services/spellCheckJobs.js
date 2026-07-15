const { randomUUID } = require("node:crypto");

const { replaceTextPreservingMarkup } = require("./htmlEditor");
const { checkChunk, createSuggestionBudget } = require("./spellCheck");

const jobs = new Map();
const finishedJobTtlMs = 30 * 60 * 1000;

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function findSplitPoint(text, start, maxEnd) {
  const preferred = ["\n", ". ", "? ", "! ", "。", " "];
  for (const marker of preferred) {
    const index = text.lastIndexOf(marker, maxEnd);
    if (index > start) return index + marker.length;
  }
  return maxEnd;
}

function splitBlockText(block, maxChars) {
  const text = String(block.textContent || "");
  if (!text.trim()) return [];

  const segments = [];
  let start = 0;

  while (start < text.length) {
    const maxEnd = Math.min(start + maxChars, text.length);
    const end = maxEnd >= text.length ? text.length : findSplitPoint(text, start, maxEnd);
    const segmentText = text.slice(start, end);

    if (segmentText.trim()) {
      segments.push({
        blockId: block.id,
        text: segmentText,
        offsetInBlock: start,
      });
    }

    start = end;
  }

  return segments;
}

function splitIntoChunks(blocks, maxChars = 500) {
  const chunks = [];
  let current = { blocks: [], text: "" };

  for (const block of blocks) {
    for (const segment of splitBlockText(block, maxChars)) {
      const separator = current.text ? "\n" : "";
      if (current.text && current.text.length + separator.length + segment.text.length > maxChars) {
        chunks.push(current);
        current = { blocks: [], text: "" };
      }

      const nextSeparator = current.text ? "\n" : "";
      const offsetInChunk = current.text.length + nextSeparator.length;
      current.text += nextSeparator + segment.text;
      current.blocks.push({
        blockId: segment.blockId,
        offsetInChunk,
        offsetInBlock: segment.offsetInBlock,
        length: segment.text.length,
      });
    }
  }

  if (current.blocks.length > 0) chunks.push(current);
  return chunks;
}

function isRollResultBlock(block) {
  const rawHtml = String(block.rawHtml || "");
  return (
    /<(table|tbody|thead|tfoot|tr|td|th)\b/i.test(rawHtml) ||
    /rolltemplate|sheet-rolltemplate|inlinerollresult|formattedformula/i.test(rawHtml)
  );
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
        start: owner.offsetInBlock + start,
        end: owner.offsetInBlock + end,
        original: issue.original,
        candidates: issue.candidates,
        help: issue.help,
      },
    ];
  });
}

function groupIssues(issues) {
  const grouped = new Map();

  for (const issue of issues) {
    const key = [issue.original, issue.help, ...(issue.candidates || [])].join("\u0000");
    const occurrence = {
      id: issue.id,
      blockId: issue.blockId,
      start: issue.start,
      end: issue.end,
      original: issue.original,
      candidates: issue.candidates,
      help: issue.help,
    };

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...occurrence,
        occurrenceCount: 0,
        occurrences: [],
      });
    }

    const group = grouped.get(key);
    group.occurrenceCount += 1;
    group.occurrences.push(occurrence);
  }

  return [...grouped.values()];
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
  const suggestionBudget = createSuggestionBudget();

  for (const chunk of chunks) {
    try {
      const issues = await checkChunk(chunk.text, { suggestionBudget });
      job.results.push(...remapOffsetsToBlocks(issues, chunk));
    } catch (error) {
      job.failures.push({
        blockIds: chunk.blocks.map((block) => block.blockId),
        message: error.message,
      });
    } finally {
      job.completed += 1;
      await yieldToEventLoop();
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
    select: { id: true, rawHtml: true, textContent: true },
  });
  const chunks = splitIntoChunks(blocks.filter((block) => !isRollResultBlock(block)));
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
    setImmediate(() => {
      processChunks(jobId, chunks);
    });
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
    results: job.status === "done" ? groupIssues(job.results) : [],
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
  isRollResultBlock,
  groupIssues,
  remapOffsetsToBlocks,
  splitIntoChunks,
  startSpellCheckJob,
  yieldToEventLoop,
};
