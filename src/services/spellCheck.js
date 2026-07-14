const cheerio = require("cheerio");

const SPELLER_URL = process.env.SPELLCHECK_URL || "https://nara-speller.co.kr/speller/results";

function stripHtml(value) {
  return cheerio.load(String(value || ""), { decodeEntities: false }).text().trim();
}

function parseCandidateWords(value) {
  return String(value || "")
    .split("|")
    .map((candidate) => stripHtml(candidate))
    .filter(Boolean);
}

function parseSpellerHtml(html) {
  const match = String(html || "").match(/data\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];

  const parsed = JSON.parse(match[1]);
  const firstResult = Array.isArray(parsed) ? parsed[0] : null;
  const errors = Array.isArray(firstResult?.errInfo) ? firstResult.errInfo : [];

  return errors
    .filter((error) => error && error.candWord && Number.isFinite(Number(error.start)) && Number.isFinite(Number(error.end)))
    .map((error) => ({
      start: Number(error.start),
      end: Number(error.end),
      original: stripHtml(error.orgStr),
      candidates: parseCandidateWords(error.candWord),
      help: stripHtml(error.help),
    }))
    .filter((issue) => issue.original && issue.candidates.length > 0 && issue.end > issue.start);
}

async function checkChunk(text) {
  const body = `text1=${encodeURIComponent(String(text || "").split("\n").join("\r\n"))}`;

  const response = await fetch(SPELLER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      Referer: new URL("/speller/", SPELLER_URL).toString(),
      Origin: new URL(SPELLER_URL).origin,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Speller request failed with status ${response.status}`);
  }

  return parseSpellerHtml(await response.text());
}

module.exports = {
  checkChunk,
  parseSpellerHtml,
  SPELLER_URL,
};
