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
    ["됀", "된"],
    ["됄", "될"],
    ["됍", "됩"],
    ["되요", "돼요"],
    ["되서", "돼서"],
    ["되야", "돼야"],
    ["되도", "돼도"],
    ["뵈요", "봬요"],
    ["뵈어", "봬"],
    ["뵈었", "뵀"],
    ["할께", "할게"],
    ["갈께", "갈게"],
    ["볼께", "볼게"],
    ["줄께", "줄게"],
    ["올께", "올게"],
    ["할껄", "할걸"],
    ["갈껄", "갈걸"],
    ["볼껄", "볼걸"],
    ["줄껄", "줄걸"],
    ["어떻해", "어떡해"],
    ["어떻하지", "어떡하지"],
    ["어떻하", "어떡하"],
    ["맛춤", "맞춤"],
    ["몇일", "며칠"],
    ["웬지", "왠지"],
    ["왠만", "웬만"],
    ["왠일", "웬일"],
    ["왠걸", "웬걸"],
    ["금새", "금세"],
    ["요세", "요새"],
    ["구지", "굳이"],
    ["오랫만", "오랜만"],
    ["역활", "역할"],
    ["희안", "희한"],
    ["설겆", "설거지"],
    ["설레임", "설렘"],
    ["깨끗히", "깨끗이"],
    ["틈틈히", "틈틈이"],
    ["곰곰히", "곰곰이"],
    ["일일히", "일일이"],
    ["번번히", "번번이"],
    ["가르키", "가리키"],
    ["가르켜", "가리켜"],
    ["무릎쓰", "무릅쓰"],
    ["통채", "통째"],
    ["닥달", "닦달"],
    ["뒤치닥", "뒤치다꺼"],
    ["널부러", "널브러"],
    ["나즈막", "나지막"],
    ["바램", "바람"],
    ["뇌졸증", "뇌졸중"],
    ["삼가해", "삼가"],
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
    pattern: /[가-힣]+수밖에/g,
    replacement: (word) => word.replace("수밖에", " 수밖에"),
  },
  {
    pattern: /[가-힣]+줄(?:알|모르)[가-힣]*/g,
    replacement: (word) => word.replace("줄알", " 줄 알").replace("줄모르", " 줄 모르"),
  },
  {
    pattern: /[가-힣]+것같[가-힣]*/g,
    replacement: (word) => word.replace("것같", " 것 같"),
  },
  {
    pattern: /[가-힣]+거같[가-힣]*/g,
    replacement: (word) => word.replace("거같", " 거 같"),
  },
  {
    pattern: /[가-힣]+듯하[가-힣]*/g,
    replacement: (word) => word.replace("듯하", " 듯하"),
  },
  {
    pattern: /[가-힣]+듯싶[가-힣]*/g,
    replacement: (word) => word.replace("듯싶", " 듯싶"),
  },
  {
    pattern: /[가-힣]+척하[가-힣]*/g,
    replacement: (word) => word.replace("척하", " 척하"),
  },
  {
    pattern: /[가-힣]+만하[가-힣]*/g,
    replacement: (word) => word.replace("만하", " 만하"),
  },
  {
    pattern: /[가-힣]+법하[가-힣]*/g,
    replacement: (word) => word.replace("법하", " 법하"),
  },
  {
    pattern: /[가-힣]+뻔하[가-힣]*/g,
    replacement: (word) => word.replace("뻔하", " 뻔하"),
  },
  {
    pattern: /[가-힣]+뿐(?:이다|만|이라|인데|이고|이|은|을|에)?/g,
    replacement: (word) => word.replace("뿐", " 뿐"),
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
  const cheapCandidates = fastSuggestions(word);
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
  const fast = fastSuggestions(normalizedWord);
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
