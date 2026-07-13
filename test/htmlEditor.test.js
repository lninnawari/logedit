const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildBlockFromTemplate,
  replaceTextNodeAtIndexPreservingMarkup,
  replaceTextPreservingMarkup,
  textFromHtml,
} = require("../src/services/htmlEditor");

test("replaces text while preserving wrapper markup", () => {
  const rawHtml = '<div class="message" style="color:red"><span>안녕</span></div>';
  const nextHtml = replaceTextPreservingMarkup(rawHtml, "수정된 말");

  assert.match(nextHtml, /class="message"/);
  assert.match(nextHtml, /style="color:red"/);
  assert.match(nextHtml, /<span>수정된 말<\/span>/);
});

test("builds a dialogue block from a styled template without copying avatars", () => {
  const rawHtml =
    '<div class="message general" style="color:#333"><div class="avatar"><img src="avatar.png"></div><span class="by">GM:</span><span class="content">old</span></div>';
  const nextHtml = buildBlockFromTemplate("dialogue", rawHtml, {
    speakerName: "PC",
    textContent: "<hello>",
  });

  assert.match(nextHtml, /style="color:#333"/);
  assert.match(nextHtml, /<span class="by">PC:<\/span>/);
  assert.match(nextHtml, /&lt;hello&gt;/);
  assert.doesNotMatch(nextHtml, /avatar\.png/);
});

test("builds a fallback narration block", () => {
  const nextHtml = buildBlockFromTemplate("narration", "", {
    textContent: "scene start",
  });

  assert.match(nextHtml, /message desc/);
  assert.match(nextHtml, /scene start/);
});

test("replaces one text node while preserving neighboring styled text", () => {
  const rawHtml = '<div class="message desc"><a style="text-align:center">CHAPTER 0</a><a style="color:#333">Intro</a></div>';
  const nextHtml = replaceTextNodeAtIndexPreservingMarkup(rawHtml, 1, "Opening");

  assert.match(nextHtml, /CHAPTER 0/);
  assert.match(nextHtml, /Opening/);
  assert.match(nextHtml, /text-align:center/);
  assert.match(nextHtml, /color:#333/);
  assert.equal(textFromHtml(nextHtml), "CHAPTER 0 Opening");
});

test("keeps earlier text markup and writes replacement into the last text node", () => {
  const rawHtml = '<p><b>민수:</b> 안녕</p>';
  const nextHtml = replaceTextPreservingMarkup(rawHtml, "반가워");

  assert.match(nextHtml, /<b>민수:<\/b>/);
  assert.match(nextHtml, /반가워/);
});
