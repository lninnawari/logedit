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
];

const DEFAULT_HANDOUT_DESCRIPTION = "이미지/핸드아웃 위치";
const DEFAULT_HANDOUT_ICON = "★";
const SPLITTABLE_CHILD_TAGS = new Set(["a", "article", "div", "li", "p", "section"]);
const IMAGE_URL_PATTERN = /https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?/i;
const MARKDOWN_IMAGE_LINK_PATTERN = /^\s*(?:\/desc\s*)?\[([^\]]+)]\((https?:\/\/[^)\s]+\.(?:png|jpe?g|gif|webp)(?:\?[^)]*)?)\)\s*$/i;
const BARE_IMAGE_URL_PATTERN = /^\s*https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:\?\S*)?\s*$/i;
const HANDOUT_STYLE_PROPERTIES = new Set(["font-family", "font-style", "font-weight", "color", "line-height", "text-align"]);

function removeHiddenElements($) {
  $("[hidden], script, style, noscript, .hidden-message").remove();
  $("[aria-hidden='true']").each((_index, element) => {
    if ($(element).hasClass("avatar") || $(element).find("img, picture, video").length > 0) return;
    $(element).remove();
  });
  $("[style]").each((_index, element) => {
    const style = String($(element).attr("style") || "").toLowerCase();
    if (style.includes("display:none") || style.includes("visibility:hidden")) {
      $(element).remove();
    }
  });
  $("*")
    .filter((_index, element) => extractText($, element) === "This message has been hidden.")
    .remove();
}

function pickHandoutStyle(style) {
  const safeDeclarations = String(style || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const property = part.split(":")[0]?.trim().toLowerCase();
      return HANDOUT_STYLE_PROPERTIES.has(property);
    });

  return safeDeclarations.join("; ");
}

function handoutStyleAttribute(style) {
  const safeStyle = pickHandoutStyle(style);
  return safeStyle ? ` style="${escapeHtml(safeStyle)}"` : "";
}

function extractHandoutStyleFromHtml(content) {
  const source = String(content || "");
  if (!hasHtmlMarkup(source)) return "";

  const $ = cheerio.load(`<section id="handout-style-root">${source}</section>`, { decodeEntities: false });
  return (
    pickHandoutStyle($("#handout-style-root").children("[style]").first().attr("style")) ||
    pickHandoutStyle($("#handout-style-root").find("[style]").first().attr("style"))
  );
}

function extractGenericHandoutStyle($, element) {
  return pickHandoutStyle($(element).attr("style")) || pickHandoutStyle($(element).find("[style]").first().attr("style"));
}

function makeHandoutRawHtml(description, style = "") {
  return `<p class="handout-marker"${handoutStyleAttribute(style)}><span class="handout-icon">${escapeHtml(DEFAULT_HANDOUT_ICON)}</span> <span class="handout-text">${escapeHtml(
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
  if (hasClass($, element, "desc")) return null;

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

function hasClass($, element, className) {
  return String($(element).attr("class") || "")
    .split(/\s+/)
    .includes(className);
}

function isRoll20RenderedHtml(source) {
  if (!/class\s*=\s*["'][^"']*\bmessage\b/i.test(source)) return false;
  return /data-messageid\s*=/i.test(source) || /class\s*=\s*["'][^"']*\b(desc|general|you|avatar|by)\b/i.test(source);
}

function detectBlockType($, element) {
  if ($(element).find("img, picture, video").length > 0 && !extractText($, element)) return "handout";
  if (hasClass($, element, "desc")) return "narration";
  return extractSpeakerName($, element) ? "dialogue" : "narration";
}

function findMessageElements($) {
  let firstCandidateElements = [];

  for (const selector of MESSAGE_SELECTORS) {
    const elements = $(selector)
      .toArray()
      .filter((element) => extractText($, element) || $(element).find("img, picture, video").length > 0);

    if (elements.length > 0) {
      if (firstCandidateElements.length === 0) firstCandidateElements = elements;
      const expanded = expandMixedMessageElements($, elements);
      if (expanded.length > 1) return expanded;
    }
  }

  if (firstCandidateElements.length === 1) return firstCandidateElements;

  const bodyChildren = $("body")
    .children()
    .toArray()
    .filter((element) => extractText($, element) || $(element).find("img, picture, video").length > 0);

  if (bodyChildren.length > 0) {
    const expanded = expandMixedMessageElements($, bodyChildren);
    if (expanded.length > 1) return expanded;
  }

  return [];
}

function getDirectMessageChildren($, element) {
  const children = $(element)
    .children()
    .toArray()
    .filter((child) => {
      const tagName = String(child.tagName || "").toLowerCase();
      return SPLITTABLE_CHILD_TAGS.has(tagName) && (extractText($, child) || $(child).find("img, picture, video").length > 0);
    });

  if (children.length < 2) return [];

  const styledChildren = children.filter((child) => $(child).attr("style") || $(child).attr("class") || $(child).attr("data-messageid"));
  return styledChildren.length >= 2 ? children : [];
}

function expandMixedMessageElements($, elements) {
  return elements.flatMap((element) => {
    if (hasClass($, element, "message") && $(element).attr("data-messageid")) return [element];
    if (hasClass($, element, "desc")) return [element];

    const directChildren = getDirectMessageChildren($, element);
    return directChildren.length > 0 ? directChildren : [element];
  });
}

function splitHtmlMessageParts(content) {
  const source = String(content || "");
  if (!/<(a|div|p|li|article|section)\b/i.test(source)) return null;

  const $ = cheerio.load(`<section id="split-root">${source}</section>`, { decodeEntities: false });
  const children = collectVisiblePartElements($, $("#split-root").children().toArray());

  if (children.length >= 2) return children.map((child) => $.html(child));

  const nestedChildren = collectVisiblePartElements($, $("#split-root").find("a, div, p, li, section").toArray(), true);
  if (nestedChildren.length === 1) return [$.html(nestedChildren[0])];
  if (nestedChildren.length < 2) return null;
  return nestedChildren.map((child) => $.html(child));
}

function collectVisiblePartElements($, elements, requireLeaf = false) {
  return elements
    .filter((child) => {
      const tagName = String(child.tagName || "").toLowerCase();
      if (!SPLITTABLE_CHILD_TAGS.has(tagName)) return false;
      if (!extractText($, child) && $(child).find("img, picture, video").length === 0) return false;

      if (requireLeaf && tagName !== "a") {
        const hasVisibleChildPart = $(child)
          .children("a, div, p, li, section")
          .toArray()
          .some((grandchild) => extractText($, grandchild) || $(grandchild).find("img, picture, video").length > 0);
        if (hasVisibleChildPart) return false;
      }

      return true;
    })
    .filter((child) => {
      if (!requireLeaf) return true;
      return $(child).attr("style") || $(child).attr("class") || String(child.tagName || "").toLowerCase() === "a";
    });
}

function splitGenericHtmlParts($, element) {
  const children = collectVisiblePartElements(
    $,
    $(element)
    .children()
      .toArray()
  );

  if (children.length < 2) return null;
  return children;
}

function toBlock($, element, orderIndex) {
  const blockType = detectBlockType($, element);
  const textContent = blockType === "handout" ? extractGenericHandoutDescription($, element) : extractText($, element);

  return {
    orderIndex,
    speakerName: extractSpeakerName($, element),
    rawHtml: blockType === "handout" ? makeHandoutRawHtml(textContent, extractGenericHandoutStyle($, element)) : $.html(element),
    textContent,
    originalText: textContent,
    blockType,
  };
}

function parseGenericHtmlToBlocks(source) {
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

function hasHtmlMarkup(content) {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

function htmlToText(content) {
  return cheerio.load(String(content || "")).text().replace(/\s+/g, " ").trim();
}

function textForMarkdownDetection(content) {
  const source = String(content || "");
  const visibleText = hasHtmlMarkup(source) ? htmlToText(source) : "";
  return (visibleText || source).trim();
}

function imageUrlFromHref(value) {
  const text = String(value || "").trim();
  return IMAGE_URL_PATTERN.test(text) ? text : null;
}

function extractSingleHtmlImageLinkLabel(content) {
  const source = String(content || "").replace(/^\s*\/desc\s*/i, "").trim();
  if (!hasHtmlMarkup(source)) return null;

  const $ = cheerio.load(`<section id="roll20-link-root">${source}</section>`, { decodeEntities: false });
  const root = $("#roll20-link-root");
  const imageLinks = root
    .find("a[href]")
    .toArray()
    .filter((link) => imageUrlFromHref($(link).attr("href")));

  if (imageLinks.length !== 1) return null;

  const withoutLink = root.clone();
  withoutLink.find("a[href]").remove();
  if (withoutLink.text().replace(/\s+/g, " ").trim()) return null;

  const imageLink = imageLinks[0];
  const label = $(imageLink).text().replace(/\s+/g, " ").trim();
  return label || $(imageLink).attr("title") || $(imageLink).attr("aria-label") || DEFAULT_HANDOUT_DESCRIPTION;
}

function markdownLinksToText(content) {
  return String(content || "").replace(/\[([^\]]+)]\(([^)]*)\)/g, "$1");
}

function markdownLinksToHtml(content) {
  return String(content || "").replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
    return `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
  });
}

function isRoll20Handout(message, htmlContent, sourceContent = null) {
  const source = sourceContent == null ? message.content : sourceContent;
  const detectionText = textForMarkdownDetection(source);
  if (MARKDOWN_IMAGE_LINK_PATTERN.test(detectionText) || BARE_IMAGE_URL_PATTERN.test(detectionText)) return true;
  if (extractSingleHtmlImageLinkLabel(source)) return true;
  return /<img\b/i.test(htmlContent) && !htmlToText(htmlContent);
}

function extractMarkdownLabel(content) {
  const match = textForMarkdownDetection(content).match(/\[([^\]]+)]\(([^)]*)\)/);
  return match ? match[1].trim() : null;
}

function extractRoll20HandoutDescription(message, formattedContent, sourceContent = null) {
  const source = sourceContent == null ? message.content : sourceContent;
  return (
    extractMarkdownLabel(source) ||
    extractSingleHtmlImageLinkLabel(source) ||
    cheerio.load(formattedContent || "").text().replace(/\s+/g, " ").trim() ||
    DEFAULT_HANDOUT_DESCRIPTION
  );
}

function findImageLikeUrl(value, preferredKey = "") {
  if (value == null) return null;

  if (typeof value === "string") {
    const text = value.trim();
    if (!/^https?:\/\//i.test(text)) return null;
    if (preferredKey && /(avatar|img|image|icon|src|picture|thumb|url)/i.test(preferredKey)) return text;
    return IMAGE_URL_PATTERN.test(text) ? text : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageLikeUrl(item, preferredKey);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    const preferredEntries = entries.filter(([key]) => /(avatar|img|image|icon|src|picture|thumb|url)/i.test(key));
    const otherEntries = entries.filter(([key]) => !/(avatar|img|image|icon|src|picture|thumb|url)/i.test(key));

    for (const [key, nestedValue] of [...preferredEntries, ...otherEntries]) {
      const found = findImageLikeUrl(nestedValue, key);
      if (found) return found;
    }
  }

  return null;
}

function makeAvatarHtml(message) {
  const avatarUrl = findImageLikeUrl({
    avatar: message.avatar,
    avatarURL: message.avatarURL,
    avatarUrl: message.avatarUrl,
    imgsrc: message.imgsrc,
    image: message.image,
    picture: message.picture,
    icon: message.icon,
    thumb: message.thumb,
    player: message.player,
    character: message.character,
    speakingas: message.speakingas,
    who: null,
  });
  if (!avatarUrl || !/^https?:\/\//i.test(String(avatarUrl))) return "";
  return `<img class="character-avatar" src="${escapeHtml(avatarUrl)}" alt="" aria-hidden="true">`;
}

function objectContentToString(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const preferredKeys = ["content", "html", "htmlcontent", "innerHTML", "value", "text"];
  for (const key of preferredKeys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key];
  }

  if (Array.isArray(value)) {
    return value.map(objectContentToString).filter(Boolean).join(" ");
  }

  return Object.values(value).map(objectContentToString).filter(Boolean).join(" ");
}

function roll20MessageContent(message) {
  if (typeof message.content === "string") return message.content;
  return objectContentToString(message.htmlcontent);
}

function roll20MessageToBlock(entry, orderIndex, contentOverride = null) {
  const [id, message] = entry;
  const type = message.type || "general";
  const speakerName = stripSpeakerSuffix(message.who);
  const replacedContent = contentOverride == null ? replaceInlineRolls(roll20MessageContent(message), message.inlinerolls) : contentOverride;
  const preserveDescHtml = type === "desc" && hasHtmlMarkup(replacedContent);
  const formattedContent = preserveDescHtml ? replacedContent : parseRoll20Template(replacedContent) || markdownLinksToText(replacedContent);
  const htmlContent = preserveDescHtml ? replacedContent : markdownLinksToHtml(formattedContent);
  const blockType = isRoll20Handout(message, htmlContent, replacedContent) ? "handout" : speakerName ? "dialogue" : "narration";
  const textContent =
    blockType === "handout"
      ? extractRoll20HandoutDescription(message, formattedContent, replacedContent)
      : htmlToText(htmlContent);
  const avatar = blockType === "handout" ? "" : makeAvatarHtml(message);
  const byline = speakerName ? `<span class="by">${escapeHtml(speakerName)}:</span> ` : "";
  const rawHtml =
    blockType === "handout"
      ? makeHandoutRawHtml(textContent, extractHandoutStyleFromHtml(replacedContent))
      : type === "desc"
        ? `<div class="message ${escapeHtml(type)}" data-messageid="${escapeHtml(id)}">${avatar}${byline}<div class="content">${htmlContent}</div></div>`
        : `<div class="message ${escapeHtml(type)}" data-messageid="${escapeHtml(id)}">${avatar}${byline}<span class="content">${htmlContent}</span></div>`;

  return {
    orderIndex,
    speakerName,
    rawHtml,
    textContent,
    originalText: textContent,
    blockType,
  };
}

function shouldPreserveRoll20Desc(content) {
  const source = String(content || "");
  return (
    /<(table|tbody|thead|tfoot|tr|td|th)\b/i.test(source) ||
    /rolltemplate|sheet-|inlinerollresult|userscript-|formattedformula/i.test(source) ||
    /\{\{[^=}]+=/i.test(source)
  );
}

function roll20EntryToBlocks(entry) {
  const [_id, message] = entry;
  const replacedContent = replaceInlineRolls(roll20MessageContent(message), message.inlinerolls);
  if (message.type === "desc") return [roll20MessageToBlock(entry, 0)];

  return [roll20MessageToBlock(entry, 0, replacedContent)];
}

function parseRoll20Msgdata(source) {
  const groups = extractRoll20Msgdata(source);
  if (!Array.isArray(groups)) return null;

  return flattenRoll20Groups(groups)
    .filter(([_id, message]) => message && message.type !== "hidden")
    .flatMap(roll20EntryToBlocks)
    .map((block, index) => ({
      ...block,
      orderIndex: index,
    }));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseHtmlToBlocks(html, options = {}) {
  const source = typeof html === "string" ? html : "";
  const sourceType = options.sourceType || "auto";

  if (sourceType === "roll20") {
    const roll20Blocks = parseRoll20Msgdata(source);
    if (roll20Blocks && roll20Blocks.length > 0) return roll20Blocks;
    return parseGenericHtmlToBlocks(source);
  }

  if (sourceType === "cocofolia") {
    const cocofoliaBlocks = parseCocofoliaStatic(source);
    if (cocofoliaBlocks && cocofoliaBlocks.length > 0) return cocofoliaBlocks;
    return parseGenericHtmlToBlocks(source);
  }

  const roll20Blocks = parseRoll20Msgdata(source);
  if (roll20Blocks && roll20Blocks.length > 0) return roll20Blocks;

  if (isRoll20RenderedHtml(source)) return parseGenericHtmlToBlocks(source);

  const cocofoliaBlocks = parseCocofoliaStatic(source);
  if (cocofoliaBlocks && cocofoliaBlocks.length > 0) return cocofoliaBlocks;

  return parseGenericHtmlToBlocks(source);
}

module.exports = {
  parseHtmlToBlocks,
  removeHiddenElements,
  parseCocofoliaLine,
  replaceInlineRolls,
};
