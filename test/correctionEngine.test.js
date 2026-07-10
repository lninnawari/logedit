const assert = require("node:assert/strict");
const test = require("node:test");

const {
  applyCorrections,
  applySpeakerTabText,
  normalizeEllipsisText,
  normalizeQuoteText,
  stripHtml,
  formatHandoutText,
} = require("../src/services/correctionEngine");

test("strips HTML tags", () => {
  assert.equal(stripHtml("<b>안녕</b>"), "안녕");
});

test("normalizes ellipsis by groups of three dots", () => {
  assert.equal(normalizeEllipsisText("음... 아니......"), "음… 아니……");
});

test("normalizes straight double quotes", () => {
  assert.equal(normalizeQuoteText('"대사"'), "“대사”");
});

test("applies speaker tab format", () => {
  assert.equal(applySpeakerTabText("민수: 안녕"), "민수\t안녕");
});

test("applies corrections to sorted blocks", () => {
  const result = applyCorrections(
    [
      { orderIndex: 1, textContent: '"응..."', blockType: "dialogue" },
      { orderIndex: 0, textContent: "민수: <b>안녕</b>", blockType: "dialogue" },
      { orderIndex: 2, textContent: "지도", blockType: "handout" },
    ],
    {}
  );

  assert.equal(result, "민수\t안녕\n\n“응…”\n\n★ 지도\n");
});

test("formats handouts with a custom icon", () => {
  assert.equal(formatHandoutText("지도", "■"), "■ 지도");
  assert.equal(
    applyCorrections([{ orderIndex: 0, textContent: "캐릭터 이미지", blockType: "handout" }], {
      customHandoutIcon: "▣",
    }),
    "▣ 캐릭터 이미지\n"
  );
});
