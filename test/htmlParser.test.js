const assert = require("node:assert/strict");
const test = require("node:test");

const { parseCocofoliaLine, parseHtmlToBlocks, replaceInlineRolls } = require("../src/services/htmlParser");

test("parses repeated message blocks", () => {
  const blocks = parseHtmlToBlocks(`
    <div class="message"><span class="speaker">민수</span><span class="text">안녕</span></div>
    <div class="message"><span class="speaker">지영:</span><span class="text">반가워</span></div>
  `);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].speakerName, "민수");
  assert.equal(blocks[0].textContent, "민수 안녕");
  assert.equal(blocks[1].speakerName, "지영");
  assert.equal(blocks[1].blockType, "dialogue");
});

test("marks image blocks as handouts", () => {
  const blocks = parseHtmlToBlocks(`
    <div class="message"><img src="handout.png" alt="지도"></div>
    <div class="message">다음 장면</div>
  `);

  assert.equal(blocks[0].blockType, "handout");
  assert.equal(blocks[0].textContent, "지도");
  assert.equal(blocks[0].rawHtml.includes("<img"), false);
});

test("keeps character images in message blocks with text", () => {
  const blocks = parseHtmlToBlocks(`
    <div class="message"><img class="avatar" src="pc.png" alt=""><span class="speaker">GM:</span><span>어서 와</span></div>
  `);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "dialogue");
  assert.equal(blocks[0].rawHtml.includes("<img"), true);
});

test("keeps Roll20 aria-hidden avatar images in rendered HTML", () => {
  const blocks = parseHtmlToBlocks(`
    <div class="message general" data-messageid="g1">
      <div class="avatar" aria-hidden="true"><img src="https://example.com/avatar.png"></div>
      <span class="by">GM:</span> 어서 와
    </div>
  `);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "dialogue");
  assert.equal(blocks[0].speakerName, "GM");
  assert.match(blocks[0].rawHtml, /class="avatar"/);
  assert.match(blocks[0].rawHtml, /avatar\.png/);
});

test("removes hidden elements before extracting text", () => {
  const blocks = parseHtmlToBlocks(`
    <p><b>GM:</b> 보이는 말 <span hidden>숨김</span></p>
    <p style="display:none">비밀</p>
  `);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].textContent.includes("숨김"), false);
  assert.equal(blocks[0].textContent.includes("비밀"), false);
});

test("falls back to one block for unknown structures", () => {
  const blocks = parseHtmlToBlocks("그냥 텍스트만 있는 로그");

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].textContent, "그냥 텍스트만 있는 로그");
  assert.equal(blocks[0].blockType, "narration");
});

test("replaces Roll20 inline roll tokens with totals", () => {
  const content = replaceInlineRolls("듣기 $[[0]] / $[[1]]", [
    { results: { total: 57 } },
    { results: { total: 65 } },
  ]);

  assert.equal(content, "듣기 57 / 65");
});

test("parses Roll20 msgdata and skips hidden messages", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        a: {
          ".priority": 2,
          type: "general",
          who: "민수",
          content: "듣기 $[[0]]",
          inlinerolls: [{ results: { total: 57 } }],
        },
        b: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: "[지도](https://example.com/map.png)",
        },
        c: {
          ".priority": 3,
          type: "hidden",
          who: "GM",
          content: "비밀",
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].blockType, "handout");
  assert.equal(blocks[0].textContent, "지도");
  assert.equal(blocks[1].speakerName, "민수");
  assert.equal(blocks[1].textContent, "듣기 57");
});

test("renders Roll20 avatars in editable message HTML", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        a: {
          ".priority": 1,
          type: "general",
          who: "GM",
          avatar: "https://example.com/avatar.png",
          content: "어서 와",
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks[0].speakerName, "GM");
  assert.match(blocks[0].rawHtml, /character-avatar/);
  assert.match(blocks[0].rawHtml, /avatar\.png/);
});

test("renders nested Roll20 avatar-like image fields", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        a: {
          ".priority": 1,
          type: "general",
          who: "GM",
          character: {
            imageUrl: "https://example.com/character.webp",
          },
          content: "등장합니다",
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.match(blocks[0].rawHtml, /character-avatar/);
  assert.match(blocks[0].rawHtml, /character\.webp/);
});

test("uses markdown image labels for Roll20 desc handout markers", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        image: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: "/desc [이미지](https://example.com/handout.png)",
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "handout");
  assert.equal(blocks[0].textContent, "이미지");
  assert.match(blocks[0].rawHtml, /이미지/);
  assert.doesNotMatch(blocks[0].rawHtml, /handout\.png/);
});

test("uses rendered Roll20 desc image link labels for handout markers", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        image: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: '<a href="https://example.com/handout.png">이미지</a>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "handout");
  assert.equal(blocks[0].textContent, "이미지");
  assert.doesNotMatch(blocks[0].rawHtml, /handout\.png/);
});

test("keeps Roll20 desc htmlcontent when content is absent", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          htmlcontent: {
            html: '<a style="display:block">도입</a>',
          },
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "narration");
  assert.equal(blocks[0].textContent, "도입");
  assert.match(blocks[0].rawHtml, /display:block/);
});

test("formats Roll20 sheet template messages into readable text", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        roll: {
          ".priority": 1,
          type: "general",
          who: "민수",
          content: "{{name=듣기}} {{success=$[[0]]}} {{hard=$[[1]]}} {{extreme=$[[2]]}} {{roll1=$[[3]]}}",
          inlinerolls: [
            { results: { total: 65 } },
            { results: { total: 32 } },
            { results: { total: 13 } },
            { results: { total: 57 } },
          ],
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks[0].textContent, "듣기: 57 (성공 65 / 어려움 32 / 극단 13)");
});

test("parses Cocofolia channel speaker lines", () => {
  const parsed = parseCocofoliaLine("[メイン] KP : 문이 열립니다.");

  assert.deepEqual(parsed, {
    channel: "メイン",
    speakerName: "KP",
    content: "문이 열립니다.",
  });
});

test("parses Cocofolia-like HTML paragraph logs", () => {
  const blocks = parseHtmlToBlocks(`
    <html><body>
      <p style="color:#333333;">[メイン] KP : 문이 열립니다.</p>
      <p style="color:#0055aa;">[メイン] 탐사자 : 들어가 볼게요.</p>
      <p style="color:#888888;">[雑談] system : BGM을 변경했습니다.</p>
    </body></html>
  `);

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].speakerName, "KP");
  assert.equal(blocks[0].textContent, "문이 열립니다.");
  assert.equal(blocks[1].speakerName, "탐사자");
  assert.equal(blocks[2].textContent, "BGM을 변경했습니다.");
});

test("splits mixed styled child messages into separate blocks", () => {
  const blocks = parseHtmlToBlocks(`
    <html><body>
      <article class="log-export">
        <div style="color:#333333;">KP: 첫 번째 설명</div>
        <div style="color:#0055aa;">탐사자: 대답합니다</div>
      </article>
    </body></html>
  `);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].textContent, "KP: 첫 번째 설명");
  assert.equal(blocks[1].textContent, "탐사자: 대답합니다");
});

test("keeps Roll20 desc anchor headings visible as editable blocks", () => {
  const blocks = parseHtmlToBlocks(`
    <div class="message desc" data-messageid="-Ov3Vfd-L7PQNxVck9E0">
      <div class="spacer"></div>
      <a style="text-decoration: none ; text-align: center ; display: block ; color: #807f85">─────── CHAPTER 0  ───────</a>
      <a style="text-decoration: none ; color: #333333 ; text-align: center ; display: block">도입</a>
    </div>
  `);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].textContent, "─────── CHAPTER 0 ───────");
  assert.equal(blocks[1].textContent, "도입");
  assert.match(blocks[0].rawHtml, /CHAPTER 0/);
});

test("parses rendered Roll20 HTML before Cocofolia fallback", () => {
  const blocks = parseHtmlToBlocks(`
    <body>
      <div class="message desc" data-messageid="d1">
        <a href="https://example.com/title.png"><img src="https://example.com/title.png" alt="타이틀"></a>
      </div>
      <div class="message desc" data-messageid="d2">
        <div class="spacer"></div>
        <a style="display:block">&lt;협연: 종언의 꽃&gt; 아네모네 캠페인</a>
      </div>
      <div class="message general" data-messageid="g1">
        <div class="avatar"><img src="https://example.com/gm.png"></div>
        <span class="by">GM:</span> 본문
      </div>
    </body>
  `);

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].blockType, "handout");
  assert.equal(blocks[0].textContent, "타이틀");
  assert.equal(blocks[1].blockType, "narration");
  assert.equal(blocks[1].speakerName, null);
  assert.equal(blocks[1].textContent, "<협연: 종언의 꽃> 아네모네 캠페인");
  assert.equal(blocks[2].blockType, "dialogue");
  assert.equal(blocks[2].speakerName, "GM");
  assert.match(blocks[2].rawHtml, /class="avatar"/);
});

test("uses explicit source type to parse Cocofolia before generic HTML", () => {
  const blocks = parseHtmlToBlocks(
    `
      <p style="color:#333333;">[main] KP : 문이 열립니다.</p>
      <p style="color:#0055aa;">[main] PC : 들어갑니다.</p>
    `,
    { sourceType: "cocofolia" }
  );

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].speakerName, "KP");
  assert.equal(blocks[0].textContent, "문이 열립니다.");
  assert.equal(blocks[1].speakerName, "PC");
  assert.equal(blocks[1].textContent, "들어갑니다.");
});

test("splits nested styled Roll20 desc children instead of dropping them", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          content:
            '<div class="outer"><div class="spacer"></div><a style="display:block">─────── CHAPTER 0 ───────</a><a style="display:block">도입</a></div>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].textContent, "─────── CHAPTER 0 ───────");
  assert.equal(blocks[1].textContent, "도입");
});

test("keeps a single nested styled Roll20 desc part visible", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: '<div class="outer"><div class="spacer"></div><a style="display:block;color:#333">도입</a></div>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].textContent, "도입");
  assert.match(blocks[0].rawHtml, /display:block/);
});

test("classifies mixed Roll20 desc parts independently from image links", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: '<a style="display:block">장면 시작</a><a style="display:block">[이미지](https://example.com/map.png)</a>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].blockType, "narration");
  assert.equal(blocks[0].textContent, "장면 시작");
  assert.equal(blocks[1].blockType, "handout");
  assert.equal(blocks[1].textContent, "이미지");
});

test("preserves styled Roll20 desc macro tables", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          content:
            '<div class="sheet-rolltemplate-coc"><table style="width:100%"><tbody><tr><td>{{name=Listen}}</td></tr><tr><td>Result</td><td>65</td></tr></tbody></table></div>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "narration");
  assert.match(blocks[0].rawHtml, /sheet-rolltemplate-coc/);
  assert.match(blocks[0].rawHtml, /<table/);
  assert.match(blocks[0].rawHtml, /Result/);
  assert.equal(blocks[0].textContent.includes("Result"), true);
});

test("does not treat styled desc image urls as handouts unless the whole desc is an image link", () => {
  const msgdata = Buffer.from(
    JSON.stringify([
      {
        desc: {
          ".priority": 1,
          type: "desc",
          who: "",
          content: '<div style="background-image:url(https://example.com/bg.png)">Scene text</div>',
        },
      },
    ]),
    "utf8"
  ).toString("base64");

  const blocks = parseHtmlToBlocks(`<script>var msgdata = "${msgdata}";</script>`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].blockType, "narration");
  assert.equal(blocks[0].textContent, "Scene text");
  assert.match(blocks[0].rawHtml, /background-image/);
});

test("parses actual Cocofolia span-based HTML logs with empty speaker", () => {
  const blocks = parseHtmlToBlocks(`
    <html><body>
      <p style="color:#888888;">
        <span> [main]</span>
        <span></span> :
        <span>ddaf</span>
      </p>
      <p style="color:#888888;">
        <span> [main]</span>
        <span></span> :
        <span>1D8  (1D8) ＞ 2</span>
      </p>
    </body></html>
  `);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].speakerName, null);
  assert.equal(blocks[0].blockType, "narration");
  assert.equal(blocks[0].textContent, "ddaf");
  assert.equal(blocks[1].textContent, "1D8 (1D8) ＞ 2");
});

test("parses Cocofolia-like plain text logs", () => {
  const blocks = parseHtmlToBlocks(`
    [メイン] KP : 장면을 시작합니다.
    [メイン] PC1 : 확인했습니다.
    [情報] KP : 핸드아웃을 공개합니다.
  `);

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].speakerName, "KP");
  assert.equal(blocks[1].speakerName, "PC1");
  assert.equal(blocks[2].textContent, "핸드아웃을 공개합니다.");
});
