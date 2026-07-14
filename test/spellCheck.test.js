const assert = require("node:assert/strict");
const test = require("node:test");

const { parseSpellerHtml } = require("../src/services/spellCheck");
const { remapOffsetsToBlocks, splitIntoChunks } = require("../src/services/spellCheckJobs");

test("parses nara speller result data from HTML", () => {
  const html = `
    <html><script>
      data = [{"errInfo":[{"start":0,"end":2,"orgStr":"됬다","candWord":"됐다|되었다","help":"맞춤법 오류"}]}];
    </script></html>
  `;

  assert.deepEqual(parseSpellerHtml(html), [
    {
      start: 0,
      end: 2,
      original: "됬다",
      candidates: ["됐다", "되었다"],
      help: "맞춤법 오류",
    },
  ]);
});

test("splits chunks without splitting blocks", () => {
  const chunks = splitIntoChunks(
    [
      { id: "a", textContent: "하나 둘" },
      { id: "b", textContent: "셋 넷" },
      { id: "c", textContent: "다섯" },
    ],
    4
  );

  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks[0].blocks.map((block) => block.blockId), ["a", "b"]);
  assert.deepEqual(chunks[1].blocks.map((block) => block.blockId), ["c"]);
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
