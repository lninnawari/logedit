const cheerio = require("cheerio");

const MESSAGE_SELECTORS = [
  ".message",
  ".chat-message",
  ".msg",
  "[data-message-id]",
  "[data-testid='message']",
  "article",
  "p",
];

const SPEAKER_SELECTORS = [
  ".speaker",
  ".author",
  ".username",
  ".name",
  ".message-sender",
  ".by",
  "strong:first-child",
  "b:first-child",
];

const DEFAULT_HANDOUT_DESCRIPTION = "이미지/핸드아웃 위치";
const DEFAULT_HANDOUT_ICON = "★";

function removeHiddenElements($) {
  $("[hidden], [aria-hidden='true'], script, style, noscript").remove();
  $("[style]").each((_index, element) => {
    const style = String($(element).attr("style") || "").toLowerCase();
    if (style.includes("display:none") || style.includes("visibility:hidden")) {
      $(element).remove();
    }
  });
}

function makeHandoutRawHtml(description) {
  return `<p class="handout-marker"><span class="handout-icon">${escapeHtml(DEFAULT_HANDOUT_ICON)}</span> <span class="handout-text">${escapeHtml(
    description || DEFAULT_HANDOUT_DESCRIPTION
  )}</span></p>`;
}

function extractGenericHandoutDescription($, element) {
  const media = $(element).find("img, picture, video").first();
  const alt = media.attr("alt") || media.attr("title") || media.attr("aria-label");
  if (alt && alt.trim()) return alt.trim();

  const linkText = $(element).find("a").first().text().trim();
  if (linkText) return linkText;

  const text = extractText($, element);
  return text || DEFAULT_HANDOUT_DESCRIPTION;
}

function extractText($, element) {
  const parts = [];

  function visit(node) {
    if (node.type === "text") {
      const text = String(node.data || "").replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      return;
    }

    if (node.children) {
      node.children.forEach(visit);
    }
  }

  visit(element);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractSpeakerName($, element) {
  for (const selector of SPEAKER_SELECTORS) {
    const text = $(element).find(selector).first().text().trim();
    if (text) return stripSpeakerSuffix(text);
  }

  const text = extractText($, element);
  const match = text.match(/^([^:：\n]{1,40})[:：]\s+/);
  return match ? match[1].trim() : null;
}

function stripSpeakerSuffix(text) {
  return String(text || "").replace(/[:：]\s*$/, "").trim() || null;
}

function detectBlockType($, element) {
  if ($(element).find("img, picture, video").length > 0) return "handout";
  return extractSpeakerName($, element) ? "dialogue" : "narration";
}

function findMessageElements($) {
  for (const selector of MESSAGE_SELECTORS) {
    const elements = $(selector)
      .toArray()
      .filter((element) => extractText($, element) || $(element).find("img, picture, video").length > 0);

    if (elements.length > 1) return elements;
  }

  const bodyChildren = $("body")
    .children()
    .toArray()
    .filter((element) => extractText($, element) || $(element).find("img, picture, video").length > 0);

  return bodyChildren.length > 1 ? bodyChildren : [];
}

function toBlock($, element, orderIndex) {
  const blockType = detectBlockType($, element);
  const textContent = blockType === "handout" ? extractGenericHandoutDescription($, element) : extractText($, element);

  return {
    orderIndex,
    speakerName: extractSpeakerName($, element),
    rawHtml: blockType === "handout" ? makeHandoutRawHtml(textContent) : $.html(element),
    textContent,
    originalText: textContent,
    blockType,
  };
}

function parseCocofoliaLine(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const bracketMatch = normalized.match(/^\[([^\]]+)]\s*([^:：]+?)\s*[:：]\s*(.+)$/);
  if (bracketMatch) {
    return {
      channel: bracketMatch[1].trim(),
      speakerName: stripSpeakerSuffix(bracketMatch[2]),
      content: bracketMatch[3].trim(),
    };
  }

  const plainMatch = normalized.match(/^([^:：]{1,40}?)\s*[:：]\s*(.+)$/);
  if (plainMatch) {
    return {
      channel: null,
      speakerName: stripSpeakerSuffix(plainMatch[1]),
      content: plainMatch[2].trim(),
    };
  }

  return null;
}

function looksLikeCocofoliaLine(text) {
  return /^\[[^\]]+]\s*[^:：]+?\s*[:：]\s*.+$/.test(String(text || "").trim());
}

function parseCocofoliaElement($, element) {
  const spans = $(element)
    .find("span")
    .toArray()
    .map((span) => $(span).text().replace(/\s+/g, " ").trim());

  if (spans.length < 3) return null;

  const channelMatch = spans[0].match(/^\[([^\]]+)]$/);
  if (!channelMatch) return null;

  const content = spans.slice(2).join(" ").trim();
  if (!content) return null;

  return {
    channel: channelMatch[1].trim(),
    speakerName: stripSpeakerSuffix(spans[1]),
    content,
  };
}

function cocofoliaEntryToBlock(entry, orderIndex, rawHtml = null) {
  const isHandout = /https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?/i.test(entry.content);
  const blockType = isHandout ? "handout" : entry.speakerName ? "dialogue" : "narration";
  const textContent = blockType === "handout" ? entry.content || DEFAULT_HANDOUT_DESCRIPTION : entry.content;
  const channel = entry.channel ? `<span class="channel">[${escapeHtml(entry.channel)}]</span> ` : "";
  const byline = entry.speakerName ? `<span class="by">${escapeHtml(entry.speakerName)}:</span> ` : "";
  const html =
    blockType === "handout"
      ? makeHandoutRawHtml(textContent)
      : rawHtml || `<p class="ccfolia-message">${channel}${byline}<span class="content">${escapeHtml(entry.content)}</span></p>`;

  return {
    orderIndex,
    speakerName: entry.speakerName,
    rawHtml: html,
    textContent,
    originalText: textContent,
    blockType,
  };
}

function parseCocofoliaStatic(source) {
  const $ = cheerio.load(source, { decodeEntities: false });
  removeHiddenElements($);

  const elementEntries = $("p, li, .message, .chat-message, [data-message]")
    .toArray()
    .map((element) => {
      const text = extractText($, element);
      const parsed = parseCocofoliaElement($, element) || parseCocofoliaLine(text);
      return parsed ? { parsed, rawHtml: $.html(element) } : null;
    })
    .filter(Boolean);

  if (elementEntries.length >= 2) {
    return elementEntries.map((entry, index) => cocofoliaEntryToBlock(entry.parsed, index, entry.rawHtml));
  }

  const textLines = cheerio
    .load(source)
    .text()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lineEntries = textLines.map(parseCocofoliaLine).filter(Boolean);
  const cocofoliaLikeLineCount = textLines.filter(looksLikeCocofoliaLine).length;

  if (lineEntries.length >= 2 && cocofoliaLikeLineCount >= Math.max(2, Math.ceil(textLines.length * 0.5))) {
    return lineEntries.map((entry, index) => cocofoliaEntryToBlock(entry, index));
  }

  return null;
}

function extractRoll20Msgdata(source) {
  const marker = "var msgdata = ";
  const start = source.indexOf(marker);
  if (start < 0) return null;

  const valueStart = start + marker.length;
  const quote = source[valueStart];
  if (quote !== '"' && quote !== "'") return null;

  const end = source.indexOf(`${quote};`, valueStart + 1);
  if (end < 0) return null;

  try {
    const encoded = source.slice(valueStart + 1, end);
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function flattenRoll20Groups(groups) {
  return groups
    .flatMap((group) => Object.entries(group || {}))
    .sort(([_leftId, left], [_rightId, right]) => {
      const leftPriority = Number(left[".priority"] || 0);
      const rightPriority = Number(right[".priority"] || 0);
      return leftPriority - rightPriority;
    });
}

function replaceInlineRolls(content, inlinerolls = []) {
  return String(content || "").replace(/\$\[\[(\d+)]]/g, (_match, indexText) => {
    const roll = inlinerolls[Number(indexText)];
    const total = roll && roll.results ? roll.results.total : null;
    return total == null ? "" : String(total);
  });
}

function parseRoll20Template(content) {
  const pairs = [];
  const pattern = /\{\{([^=}]+)=([^]*?)}}/g;
  let match;

  while ((match = pattern.exec(String(content || ""))) != null) {
    pairs.push([match[1].trim(), match[2].trim()]);
  }

  if (pairs.length === 0) return null;

  const values = Object.fromEntries(pairs);
  if (values.name && values.roll1) {
    const thresholds = [
      values.success ? `성공 ${values.success}` : null,
      values.hard ? `어려움 ${values.hard}` : null,
      values.extreme ? `극단 ${values.extreme}` : null,
    ].filter(Boolean);
    return `${values.name}: ${values.roll1}${thresholds.length ? ` (${thresholds.join(" / ")})` : ""}`;
  }

  if (values.name) {
    const rest = pairs
      .filter(([key]) => key !== "name")
      .map(([key, value]) => `${key} ${value}`)
      .join(" / ");
    return rest ? `${values.name}: ${rest}` : values.name;
  }

  return pairs.map(([key, value]) => `${key}: ${value}`).join(" / ");
}

function markdownLinksToText(content) {
  return String(content || "").replace(/\[([^\]]+)]\(([^)]*)\)/g, "$1");
}

function markdownLinksToHtml(content) {
  return String(content || "").replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
    return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
  });
}

function isRoll20Handout(message, htmlContent) {
  if (/https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?/i.test(String(message.content || ""))) return true;
  return /<img\b/i.test(htmlContent);
}

function extractMarkdownLabel(content) {
  const match = String(content || "").match(/\[([^\]]+)]\(([^)]*)\)/);
  return match ? match[1].trim() : null;
}

function extractRoll20HandoutDescription(message, formattedContent) {
  return extractMarkdownLabel(message.content) || cheerio.load(formattedContent || "").text().replace(/\s+/g, " ").trim() || DEFAULT_HANDOUT_DESCRIPTION;
}

function roll20MessageToBlock(entry, orderIndex) {
  const [id, message] = entry;
  const type = message.type || "general";
  const speakerName = stripSpeakerSuffix(message.who);
  const replacedContent = replaceInlineRolls(message.content, message.inlinerolls);
  const formattedContent = parseRoll20Template(replacedContent) || markdownLinksToText(replacedContent);
  const htmlContent = markdownLinksToHtml(formattedContent);
  const blockType = isRoll20Handout(message, htmlContent) ? "handout" : speakerName ? "dialogue" : "narration";
  const textContent =
    blockType === "handout" ? extractRoll20HandoutDescription(message, formattedContent) : cheerio.load(htmlContent).text().replace(/\s+/g, " ").trim();
  const byline = speakerName ? `<span class="by">${escapeHtml(speakerName)}:</span> ` : "";
  const rawHtml =
    blockType === "handout"
      ? makeHandoutRawHtml(textContent)
      : `<div class="message ${escapeHtml(type)}" data-messageid="${escapeHtml(id)}">${byline}<span class="content">${htmlContent}</span></div>`;

  return {
    orderIndex,
    speakerName,
    rawHtml,
    textContent,
    originalText: textContent,
    blockType,
  };
}

function parseRoll20Msgdata(source) {
  const groups = extractRoll20Msgdata(source);
  if (!Array.isArray(groups)) return null;

  return flattenRoll20Groups(groups)
    .filter(([_id, message]) => message && message.type !== "hidden")
    .map((entry, index) => roll20MessageToBlock(entry, index));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseHtmlToBlocks(html) {
  const source = typeof html === "string" ? html : "";
  const roll20Blocks = parseRoll20Msgdata(source);
  if (roll20Blocks && roll20Blocks.length > 0) return roll20Blocks;

  const cocofoliaBlocks = parseCocofoliaStatic(source);
  if (cocofoliaBlocks && cocofoliaBlocks.length > 0) return cocofoliaBlocks;

  const $ = cheerio.load(source, { decodeEntities: false });

  removeHiddenElements($);

  const elements = findMessageElements($);
  if (elements.length === 0) {
    const fallbackText = $("body").text().trim() || $.root().text().trim() || source.trim();

    return [
      {
        orderIndex: 0,
        speakerName: null,
        rawHtml: source,
        textContent: fallbackText,
        originalText: fallbackText,
        blockType: "narration",
      },
    ];
  }

  return elements.map((element, index) => toBlock($, element, index));
}

module.exports = {
  parseHtmlToBlocks,
  removeHiddenElements,
  parseCocofoliaLine,
  replaceInlineRolls,
};
