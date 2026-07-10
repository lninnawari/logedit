const assert = require("node:assert/strict");
const test = require("node:test");

const { replaceTextPreservingMarkup } = require("../src/services/htmlEditor");

test("replaces text while preserving wrapper markup", () => {
  const rawHtml = '<div class="message" style="color:red"><span>안녕</span></div>';
  const nextHtml = replaceTextPreservingMarkup(rawHtml, "수정된 말");

  assert.match(nextHtml, /class="message"/);
  assert.match(nextHtml, /style="color:red"/);
  assert.match(nextHtml, /<span>수정된 말<\/span>/);
});

test("keeps earlier text markup and writes replacement into the last text node", () => {
  const rawHtml = '<p><b>민수:</b> 안녕</p>';
  const nextHtml = replaceTextPreservingMarkup(rawHtml, "반가워");

  assert.match(nextHtml, /<b>민수:<\/b>/);
  assert.match(nextHtml, /반가워/);
});
