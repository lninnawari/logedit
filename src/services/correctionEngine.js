const cheerio = require("cheerio");

function stripHtml(text) {
  return cheerio.load(String(text || ""), { decodeEntities: false }).text();
}

function normalizeEllipsisText(text, customEllipsis = "…") {
  return String(text).replace(/\.{3,}/g, (match) => customEllipsis.repeat(Math.floor(match.length / 3)));
}

function normalizeQuoteText(text, openQuote = "“", closeQuote = "”") {
  let isOpen = true;
  return String(text).replace(/"/g, () => {
    const quote = isOpen ? openQuote : closeQuote;
    isOpen = !isOpen;
    return quote;
  });
}

function applySpeakerTabText(text) {
  return String(text).replace(/^([^:\n：]{1,40})\s*[:：]\s*/, "$1\t");
}

function cleanBlankLinesText(text) {
  return String(text).replace(/\n{3,}/g, "\n\n").trim();
}

function formatHandoutText(description, icon = "★") {
  const label = String(description || "이미지/핸드아웃 위치").trim();
  return `${icon || "★"} ${label}`;
}

function blockToText(block, settings) {
  if (settings.markHandoutPosition && block.blockType === "handout") {
    return formatHandoutText(block.textContent, settings.customHandoutIcon);
  }

  let text = block.textContent || "";

  if (settings.removeHtmlTags) text = stripHtml(text);
  if (settings.normalizeEllipsis) text = normalizeEllipsisText(text, settings.customEllipsis);
  if (settings.normalizeQuotes) text = normalizeQuoteText(text, settings.customQuoteOpen, settings.customQuoteClose);
  if (settings.speakerTabFormat) text = applySpeakerTabText(text);

  return text.trim();
}

function applyCorrections(blocks, settings) {
  const safeSettings = {
    removeHtmlTags: true,
    removeHiddenMessage: true,
    normalizeEllipsis: true,
    normalizeQuotes: true,
    speakerTabFormat: true,
    cleanBlankLines: true,
    markHandoutPosition: true,
    customQuoteOpen: "“",
    customQuoteClose: "”",
    customEllipsis: "…",
    customHandoutIcon: "★",
    ...settings,
  };

  let text = blocks
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((block) => blockToText(block, safeSettings))
    .filter(Boolean)
    .join("\n\n");

  if (safeSettings.cleanBlankLines) text = cleanBlankLinesText(text);

  return `${text}\n`;
}

module.exports = {
  applyCorrections,
  stripHtml,
  normalizeEllipsisText,
  normalizeQuoteText,
  applySpeakerTabText,
  cleanBlankLinesText,
  formatHandoutText,
};
