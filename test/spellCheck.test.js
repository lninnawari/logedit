const assert = require("node:assert/strict");
const test = require("node:test");

const {
  checkChunk,
  collectKoreanTokens,
  collectSpacingIssues,
  fastSuggestions,
  normalizeSuggestions,
} = require("../src/services/spellCheck");
const { isRollResultBlock, remapOffsetsToBlocks, splitIntoChunks } = require("../src/services/spellCheckJobs");

test("collects Korean token offsets", () => {
  assert.deepEqual(collectKoreanTokens("GM: 안녕 하세요 123"), [
    { value: "안녕", start: 4, end: 6 },
    { value: "하세요", start: 7, end: 10 },
  ]);
});

test("normalizes Hunspell suggestions", () => {
  assert.deepEqual(normalizeSuggestions("됬다", ["됐다", "됐다", "됬다", "되었다"]), ["됐다", "되었다"]);
});

test("builds fast Korean typo suggestions without Hunspell suggest", () => {
  assert.deepEqual(fastSuggestions("작성됬다"), ["작성됐다"]);
  assert.deepEqual(fastSuggestions("안녕하세여"), ["안녕하세요"]);
  assert.deepEqual(fastSuggestions("맛춤법"), ["맞춤법"]);
});

test("collects common Korean spacing issues", () => {
  const issues = collectSpacingIssues("아닐텐데 할수있다 그럴것같다 없을테니까");

  assert.deepEqual(
    issues.map((issue) => [issue.original, issue.candidates[0]]),
    [
      ["아닐텐데", "아닐 텐데"],
      ["할수있다", "할 수 있다"],
      ["그럴것같다", "그럴 것 같다"],
      ["없을테니까", "없을 테니까"],
    ]
  );
});

test("checks Korean text with Hunspell dictionary", async () => {
  const issues = await checkChunk("작성됬다 안녕하세여 맛춤법");

  assert.deepEqual(
    issues.map((issue) => issue.original),
    ["작성됬다", "안녕하세여", "맛춤법"]
  );
  assert.ok(issues[0].candidates.includes("작성됐다"));
  assert.ok(issues[1].candidates.includes("안녕하세요"));
  assert.ok(issues[2].candidates.includes("맞춤법"));
});

test("splits chunks without splitting blocks", () => {
  const chunks = splitIntoChunks(
    [
      { id: "a", textContent: "하나 둘" },
      { id: "b", textContent: "셋넷" },
      { id: "c", textContent: "다섯" },
    ],
    7
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
  assert.equal(isRollResultBlock({ rawHtml: '<div class="message general">대화</div>' }), false);
});

test("splits long blocks while preserving block offsets", () => {
  const chunks = splitIntoChunks([{ id: "a", textContent: "첫문장입니다. 두번째문장입니다." }], 8);

  assert.ok(chunks.length > 1);
  const secondChunk = chunks[1];
  const remapped = remapOffsetsToBlocks(
    [{ start: 0, end: 2, original: "두번", candidates: ["두 번째"], help: "맞춤법" }],
    secondChunk
  );

  assert.equal(remapped[0].blockId, "a");
  assert.equal(remapped[0].start, secondChunk.blocks[0].offsetInBlock);
});

test("remaps chunk offsets to block-local offsets", () => {
  const chunks = splitIntoChunks(
    [
      { id: "a", textContent: "문장 하나" },
      { id: "b", textContent: "둘다" },
    ],
    10
  );
  const chunk = chunks[0];
  const issueStart = chunk.text.indexOf("둘다");

  const remapped = remapOffsetsToBlocks(
    [{ start: issueStart, end: issueStart + 2, original: "둘다", candidates: ["둘 다"], help: "맞춤법" }],
    chunk
  );

  assert.equal(remapped.length, 1);
  assert.equal(remapped[0].blockId, "b");
  assert.equal(remapped[0].start, 0);
  assert.equal(remapped[0].end, 2);
});
