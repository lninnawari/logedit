const path = require("node:path");

let spellPromise = null;
const tokenCache = new Map();
const maxTokenCacheSize = 10000;
const maxSuggestTokenLength = 30;
const tokensPerYield = 10;
const defaultSuggestionLimit = 300;
const enableExpensiveSuggestions = process.env.HUNSPELL_SUGGEST === "true";
const includeSuspiciousWords = process.env.SPELLCHECK_INCLUDE_SUSPICIOUS === "true";
const minSuspiciousTokenLength = 4;

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

const spacingRules = [
  {
    pattern: /[가-힣]+텐데/g,
    replacement: (word) => word.replace(/텐데$/, " 텐데"),
  },
  {
    pattern: /[가-힣]+테니까/g,
    replacement: (word) => word.replace(/테니까$/, " 테니까"),
  },
  {
    pattern: /[가-힣]+수(?:있|없)[가-힣]*/g,
    replacement: (word) => word.replace("수있", " 수 있").replace("수없", " 수 없"),
  },
  {
    pattern: /[가-힣]+것같[가-힣]*/g,
    replacement: (word) => word.replace("것같", " 것 같"),
  },
  {
    pattern: /[가-힣]+거같[가-힣]*/g,
    replacement: (word) => word.replace("거같", " 거 같"),
  },
];

function collectSpacingIssues(text) {
  const issues = [];

  for (const rule of spacingRules) {
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(text);

    while (match) {
      const original = match[0];
      const replacement = rule.replacement(original);
      if (replacement !== original) {
        issues.push({
          start: match.index,
          end: match.index + original.length,
          original,
          candidates: [replacement],
          help: "띄어쓰기 후보",
        });
      }
      match = rule.pattern.exec(text);
    }
  }

  return issues.sort((a, b) => a.start - b.start || a.end - b.end);
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

async function suggestWord(word) {
  const normalizedWord = String(word || "").trim();
  if (!normalizedWord || normalizedWord.length > maxSuggestTokenLength) return [];

  const spell = await getSpellChecker();
  const fast = fastSuggestions(normalizedWord).filter((candidate) => spell.spellSync(candidate));
  const hunspell = spell.spellSync(normalizedWord) ? [] : normalizeSuggestions(normalizedWord, spell.suggestSync(normalizedWord));
  return normalizeSuggestions(normalizedWord, [...fast, ...hunspell]);
}

function overlapsAnyIssue(token, issues) {
  return issues.some((issue) => token.start < issue.end && token.end > issue.start);
}

function shouldListSuspiciousWord(word, candidates) {
  return candidates.length > 0 || (includeSuspiciousWords && word.length >= minSuspiciousTokenLength);
}

async function checkChunk(text, options = {}) {
  const originalText = String(text || "");
  if (!originalText.trim()) return [];

  const spell = await getSpellChecker();
  const issues = collectSpacingIssues(originalText);
  const tokens = collectKoreanTokens(originalText);
  const suggestionBudget = options.suggestionBudget || createSuggestionBudget();

  for (let index = 0; index < tokens.length; index += 1) {
    if (index > 0 && index % tokensPerYield === 0) await yieldToEventLoop();

    const token = tokens[index];
    if (overlapsAnyIssue(token, issues)) continue;

    const { correct, candidates } = checkToken(spell, token.value, { suggestionBudget });
    if (correct) continue;
    if (!shouldListSuspiciousWord(token.value, candidates)) continue;

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
  collectSpacingIssues,
  createSuggestionBudget,
  fastSuggestions,
  getSpellChecker,
  normalizeSuggestions,
  shouldListSuspiciousWord,
  suggestWord,
  yieldToEventLoop,
};
