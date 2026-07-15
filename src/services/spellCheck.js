const path = require("node:path");

let spellPromise = null;
const tokenCache = new Map();
const maxTokenCacheSize = 10000;
const maxSuggestTokenLength = 30;
const tokensPerYield = 10;
const defaultSuggestionLimit = 300;
const enableExpensiveSuggestions = process.env.HUNSPELL_SUGGEST === "true";

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
    .slice(0, 5);
}

function fastSuggestions(word) {
  const suggestions = [];
  const replacements = [
    ["됬", "됐"],
    ["되요", "돼요"],
    ["맛춤", "맞춤"],
    ["몇일", "며칠"],
    ["왠만", "웬만"],
    ["금새", "금세"],
  ];

  for (const [from, to] of replacements) {
    if (word.includes(from)) suggestions.push(word.replaceAll(from, to));
  }

  if (word.endsWith("하세여")) suggestions.push(`${word.slice(0, -3)}하세요`);
  else if (word.endsWith("여") && word.length >= 3) suggestions.push(`${word.slice(0, -1)}요`);

  return normalizeSuggestions(word, suggestions);
}

function rememberTokenResult(word, result) {
  if (tokenCache.size >= maxTokenCacheSize) {
    tokenCache.delete(tokenCache.keys().next().value);
  }
  tokenCache.set(word, result);
  return result;
}

function createSuggestionBudget(limit = defaultSuggestionLimit) {
  return { remaining: limit };
}

function checkToken(spell, word, options = {}) {
  const cached = tokenCache.get(word);
  if (cached) return cached;

  if (spell.spellSync(word)) return rememberTokenResult(word, { correct: true, candidates: [] });
  const cheapCandidates = fastSuggestions(word).filter((candidate) => spell.spellSync(candidate));
  if (cheapCandidates.length > 0) return rememberTokenResult(word, { correct: false, candidates: cheapCandidates });
  if (!enableExpensiveSuggestions) return rememberTokenResult(word, { correct: false, candidates: [] });
  if (word.length > maxSuggestTokenLength) return rememberTokenResult(word, { correct: false, candidates: [] });
  if (options.suggestionBudget && options.suggestionBudget.remaining <= 0) {
    return { correct: false, candidates: [] };
  }

  if (options.suggestionBudget) options.suggestionBudget.remaining -= 1;

  return rememberTokenResult(word, {
    correct: false,
    candidates: normalizeSuggestions(word, spell.suggestSync(word)),
  });
}

async function checkChunk(text, options = {}) {
  const originalText = String(text || "");
  if (!originalText.trim()) return [];

  const spell = await getSpellChecker();
  const issues = [];
  const tokens = collectKoreanTokens(originalText);
  const suggestionBudget = options.suggestionBudget || createSuggestionBudget();

  for (let index = 0; index < tokens.length; index += 1) {
    if (index > 0 && index % tokensPerYield === 0) await yieldToEventLoop();

    const token = tokens[index];
    const { correct, candidates } = checkToken(spell, token.value, { suggestionBudget });
    if (correct || candidates.length === 0) continue;

    issues.push({
      start: token.start,
      end: token.end,
      original: token.value,
      candidates,
      help: enableExpensiveSuggestions ? "Hunspell 한국어 사전 제안" : "빠른 맞춤법 후보",
    });
  }

  return issues;
}

module.exports = {
  checkChunk,
  checkToken,
  collectKoreanTokens,
  createSuggestionBudget,
  fastSuggestions,
  getSpellChecker,
  normalizeSuggestions,
  yieldToEventLoop,
};
