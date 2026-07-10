const fs = require("fs");
const path = require("path");

const { parseHtmlToBlocks } = require("../src/services/htmlParser");

const target = process.argv[2];

if (!target) {
  console.error("Usage: node scripts/analyze-html.js <path-to-html>");
  process.exit(1);
}

const htmlPath = path.resolve(target);
const html = fs.readFileSync(htmlPath, "utf8");
const blocks = parseHtmlToBlocks(html);
const summary = {
  file: htmlPath,
  count: blocks.length,
  types: {},
  speakers: {},
  firstBlocks: blocks.slice(0, 10).map((block) => ({
    orderIndex: block.orderIndex,
    speakerName: block.speakerName,
    blockType: block.blockType,
    textContent: block.textContent.slice(0, 120),
  })),
};

for (const block of blocks) {
  summary.types[block.blockType] = (summary.types[block.blockType] || 0) + 1;
  if (block.speakerName) summary.speakers[block.speakerName] = (summary.speakers[block.speakerName] || 0) + 1;
}

console.log(JSON.stringify(summary, null, 2));
