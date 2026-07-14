const assert = require("node:assert/strict");
const test = require("node:test");

const { remapOffsetsToBlocks, splitIntoChunks } = require("../src/services/spellCheckJobs");

test("splits chunks without splitting blocks", () => {
  const chunks = splitIntoChunks(
    [
      { id: "a", textContent: "하나 둘" },
      { id: "b", textContent: "셋 넷" },
      { id: "c", textContent: "다섯" },
    ],
    10
  );

  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks[0].blocks.map((block) => block.blockId), ["a", "b"]);
  assert.deepEqual(chunks[1].blocks.map((block) => block.blockId), ["c"]);
});

test("splits long blocks while preserving block offsets", () => {
  const chunks = splitIntoChunks([{ id: "a", textContent: "첫문장입니다. 둘째문장입니다." }], 8);

  assert.ok(chunks.length > 1);
  const secondChunk = chunks[1];
  const remapped = remapOffsetsToBlocks(
    [{ start: 0, end: 2, original: "둘째", candidates: ["두번째"], help: "맞춤법" }],
    secondChunk
  );

  assert.equal(remapped[0].blockId, "a");
  assert.equal(remapped[0].start, secondChunk.blocks[0].offsetInBlock);
});

test("remaps chunk offsets to block-local offsets", () => {
  const chunks = splitIntoChunks(
    [
      { id: "a", textContent: "문장 하나" },
      { id: "b", textContent: "됬다" },
    ],
    10
  );
  const chunk = chunks[0];
  const issueStart = chunk.text.indexOf("됬다");

  const remapped = remapOffsetsToBlocks(
    [{ start: issueStart, end: issueStart + 2, original: "됬다", candidates: ["됐다"], help: "맞춤법" }],
    chunk
  );

  assert.equal(remapped.length, 1);
  assert.equal(remapped[0].blockId, "b");
  assert.equal(remapped[0].start, 0);
  assert.equal(remapped[0].end, 2);
});
