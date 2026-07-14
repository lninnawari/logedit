const cheerio = require("cheerio");

const SPELLCHECK_QUERY_URL = "https://search.naver.com/search.naver?query=%EB%A7%9E%EC%B6%A4%EB%B2%95%20%EA%B2%80%EC%82%AC%EA%B8%B0";
const SPELLCHECK_URL = "https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy";
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

let cachedPassportKey = "";
let cachedPassportKeyAt = 0;
const passportKeyTtlMs = 10 * 60 * 1000;

function textFromHtml(value) {
  return cheerio.load(String(value || ""), { decodeEntities: false }).text();
}

function diffText(original, checked, help = "네이버 맞춤법 검사 제안") {
  const issues = [];
  let start = 0;
  let originalEnd = original.length;
  let checkedEnd = checked.length;

  while (start < originalEnd && start < checkedEnd && original[start] === checked[start]) {
    start += 1;
  }

  while (originalEnd > start && checkedEnd > start && original[originalEnd - 1] === checked[checkedEnd - 1]) {
    originalEnd -= 1;
    checkedEnd -= 1;
  }

  if (start < originalEnd || start < checkedEnd) {
    issues.push({
      start,
      end: originalEnd,
      original: original.slice(start, originalEnd),
      candidates: [checked.slice(start, checkedEnd)],
      help,
    });
  }

  return issues;
}

function parseMarkedIssues(result, originalText) {
  const $origin = cheerio.load(result.origin_html || "", { decodeEntities: false });
  const $checked = cheerio.load(result.html || "", { decodeEntities: false });
  const originals = $origin("span.result_underline")
    .toArray()
    .map((node) => $origin(node).text())
    .filter(Boolean);
  const candidates = $checked("em")
    .toArray()
    .map((node) => $checked(node).text());

  let searchFrom = 0;
  return originals.flatMap((original, index) => {
    const start = originalText.indexOf(original, searchFrom);
    const candidate = candidates[index] ?? "";
    if (start < 0 || original === candidate) return [];

    searchFrom = start + original.length;
    return [
      {
        start,
        end: start + original.length,
        original,
        candidates: [candidate],
        help: "네이버 맞춤법 검사 제안",
      },
    ];
  });
}

function parseNaverResponse(rawText, originalText) {
  const data = JSON.parse(rawText);
  const result = data?.message?.result;
  if (!result) {
    const message = data?.message?.error || "네이버 맞춤법 검사 응답 형식이 올바르지 않습니다.";
    throw new Error(message);
  }

  const checked = textFromHtml(result.notag_html || result.html || "");
  if (!checked || checked === originalText) return [];
  const markedIssues = parseMarkedIssues(result, originalText);
  if (markedIssues.length > 0) return markedIssues;
  return diffText(originalText, checked);
}

async function fetchPassportKey() {
  const now = Date.now();
  if (cachedPassportKey && now - cachedPassportKeyAt < passportKeyTtlMs) return cachedPassportKey;

  const response = await fetch(SPELLCHECK_QUERY_URL, {
    headers: { "User-Agent": userAgent },
  });
  if (!response.ok) throw new Error(`네이버 맞춤법 검사 페이지 호출 실패: ${response.status}`);

  const html = await response.text();
  const match = html.match(/SpellerProxy\?passportKey=([a-zA-Z0-9]+)/);
  if (!match) throw new Error("네이버 맞춤법 검사 키를 찾지 못했습니다.");

  cachedPassportKey = match[1];
  cachedPassportKeyAt = now;
  return cachedPassportKey;
}

async function checkChunk(text) {
  const originalText = String(text || "");
  if (!originalText.trim()) return [];

  const passportKey = await fetchPassportKey();
  const url = new URL(SPELLCHECK_URL);
  url.searchParams.set("passportKey", passportKey);
  url.searchParams.set("where", "nexearch");
  url.searchParams.set("color_blindness", "0");
  url.searchParams.set("q", originalText);

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Referer: SPELLCHECK_QUERY_URL,
    },
  });
  if (!response.ok) throw new Error(`네이버 맞춤법 검사 호출 실패: ${response.status}`);

  return parseNaverResponse(await response.text(), originalText);
}

module.exports = {
  checkChunk,
  diffText,
  parseMarkedIssues,
  parseNaverResponse,
};
