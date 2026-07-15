const path = require("node:path");

let spellPromise = null;
const tokenCache = new Map();
const maxTokenCacheSize = 10000;
const maxSuggestTokenLength = 30;
const tokensPerYield = 10;

function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

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

function rememberTokenResult(word, result) {
  if (tokenCache.size >= maxTokenCacheSize) {
    tokenCache.delete(tokenCache.keys().next().value);
  }
  tokenCache.set(word, result);
  return result;
}

function checkToken(spell, word) {
  const cached = tokenCache.get(word);
  if (cached) return cached;

  if (spell.spellSync(word)) return rememberTokenResult(word, { correct: true, candidates: [] });
  if (word.length > maxSuggestTokenLength) return rememberTokenResult(word, { correct: false, candidates: [] });

  return rememberTokenResult(word, {
    correct: false,
    candidates: normalizeSuggestions(word, spell.suggestSync(word)),
  });
}

async function checkChunk(text) {
  const originalText = String(text || "");
  if (!originalText.trim()) return [];

  const spell = await getSpellChecker();
  const issues = [];
  const tokens = collectKoreanTokens(originalText);

  for (let index = 0; index < tokens.length; index += 1) {
    if (index > 0 && index % tokensPerYield === 0) await yieldToEventLoop();

    const token = tokens[index];
    const { correct, candidates } = checkToken(spell, token.value);
    if (correct || candidates.length === 0) continue;

    issues.push({
      start: token.start,
      end: token.end,
      original: token.value,
      candidates,
      help: "Hunspell 한국어 사전 제안",
    });
  }

  return issues;
}

module.exports = {
  checkChunk,
  checkToken,
  collectKoreanTokens,
  getSpellChecker,
  normalizeSuggestions,
  yieldToEventLoop,
};
