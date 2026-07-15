const assert = require("node:assert/strict");
const test = require("node:test");

const { parseNaverResponse } = require("../src/services/spellCheck");
const { isRollResultBlock, remapOffsetsToBlocks, splitIntoChunks } = require("../src/services/spellCheckJobs");

test("parses marked naver spellcheck issues", () => {
  const raw = JSON.stringify({
    message: {
      result: {
        origin_html:
          "<span class='result_underline'>안녕 하세요.</span> <span class='result_underline'>작성됬습니다.</span>",
        html: "<em class='green_text'>안녕하세요.</em> <em class='red_text'>작성됐습니다.</em>",
        notag_html: "안녕하세요. 작성됐습니다.",
      },
    },
  });

  const issues = parseNaverResponse(raw, "안녕 하세요. 작성됬습니다.");

  assert.deepEqual(
    issues.map((issue) => ({
      start: issue.start,
      end: issue.end,
      original: issue.original,
      candidates: issue.candidates,
    })),
    [
      { start: 0, end: 7, original: "안녕 하세요.", candidates: ["안녕하세요."] },
      { start: 8, end: 15, original: "작성됬습니다.", candidates: ["작성됐습니다."] },
    ]
  );
});

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

test("detects roll result blocks for spellcheck exclusion", () => {
  assert.equal(
    isRollResultBlock({
      rawHtml: '<div class="sheet-rolltemplate-coc"><table><tbody><tr><td>결과</td></tr></tbody></table></div>',
    }),
    true
  );
  assert.equal(isRollResultBlock({ rawHtml: '<div class="message general">대사</div>' }), false);
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
