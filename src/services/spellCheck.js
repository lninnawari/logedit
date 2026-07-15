const path = require("node:path");

let spellPromise = null;

function dictionaryPath(filename) {
  return path.join(process.cwd(), "node_modules", "dictionary-ko", filename);
}

async function getSpellChecker() {
  if (!spellPromise) {
    spellPromise = import("hunspell-native").then(({ Hunspell }) =>
      new Hunspell({
        aff: dictionaryPath("index.aff"),
        dic: dictionaryPath("index.dic"),
      })
    );
  }

  return spellPromise;
}

function collectKoreanTokens(text) {
  const tokens = [];
  const pattern = /[가-힣]+/g;
  let match = pattern.exec(text);

  while (match) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    match = pattern.exec(text);
  }

  return tokens;
}

function normalizeSuggestions(word, suggestions) {
  return [...new Set(suggestions || [])]
    .filter((suggestion) => suggestion && suggestion !== word)
    .slice(0, 8);
}

async function checkChunk(text) {
  const originalText = String(text || "");
  if (!originalText.trim()) return [];

  const spell = await getSpellChecker();
  return collectKoreanTokens(originalText).flatMap((token) => {
    if (spell.spellSync(token.value)) return [];

    const candidates = normalizeSuggestions(token.value, spell.suggestSync(token.value));
    if (candidates.length === 0) return [];

    return [
      {
        start: token.start,
        end: token.end,
        original: token.value,
        candidates,
        help: "Hunspell 한국어 사전 제안",
      },
    ];
  });
}

module.exports = {
  checkChunk,
  collectKoreanTokens,
  getSpellChecker,
  normalizeSuggestions,
};
