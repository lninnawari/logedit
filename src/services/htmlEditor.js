const cheerio = require("cheerio");

function collectTextNodes(node, nodes = []) {
  if (!node) return nodes;

  if (node.type === "text") {
    const currentText = String(node.data || "");
    if (currentText.trim()) nodes.push(node);
    return nodes;
  }

  if (node.children) {
    node.children.forEach((child) => collectTextNodes(child, nodes));
  }

  return nodes;
}

function replaceTextPreservingMarkup(rawHtml, nextText) {
  const $ = cheerio.load(rawHtml || "", { decodeEntities: false });
  const rootChildren = $.root().children().toArray();
  const searchRoots = rootChildren.length > 0 ? rootChildren : $.root().contents().toArray();
  const textNodes = searchRoots.flatMap((node) => collectTextNodes(node));

  if (textNodes.length === 0) {
    return nextText;
  }

  textNodes[textNodes.length - 1].data = nextText;

  const bodyHtml = $("body").html();
  return bodyHtml == null ? $.root().html() : bodyHtml;
}

function textFromHtml(rawHtml) {
  const $ = cheerio.load(rawHtml || "", { decodeEntities: false });
  const rootChildren = $.root().children().toArray();
  const searchRoots = rootChildren.length > 0 ? rootChildren : $.root().contents().toArray();
  return searchRoots
    .flatMap((node) => collectTextNodes(node))
    .map((node) => String(node.data || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

function replaceTextNodeAtIndexPreservingMarkup(rawHtml, textNodeIndex, nextText) {
  const $ = cheerio.load(rawHtml || "", { decodeEntities: false });
  const rootChildren = $.root().children().toArray();
  const searchRoots = rootChildren.length > 0 ? rootChildren : $.root().contents().toArray();
  const textNodes = searchRoots.flatMap((node) => collectTextNodes(node));
  const targetIndex = Number(textNodeIndex);

  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= textNodes.length) {
    return replaceTextPreservingMarkup(rawHtml, nextText);
  }

  textNodes[targetIndex].data = nextText;

  const bodyHtml = $("body").html();
  return bodyHtml == null ? $.root().html() : bodyHtml;
}

const SPEAKER_SELECTOR = ".by, .speaker, .author, .username, .name, .message-sender, .byline";

const FALLBACK_TEMPLATES = {
  dialogue: '<div class="message general"><span class="by"></span><span class="content"></span></div>',
  narration: '<div class="message desc"><span class="content"></span></div>',
};

function serialize($) {
  const bodyHtml = $("body").html();
  return bodyHtml == null ? $.root().html() : bodyHtml;
}

function buildBlockFromTemplate(blockType, templateRawHtml, { speakerName = "", textContent = "" } = {}) {
  const type = blockType === "dialogue" ? "dialogue" : "narration";
  const $ = cheerio.load(templateRawHtml || FALLBACK_TEMPLATES[type], { decodeEntities: false });

  $("img, picture, video, .avatar, .character-avatar, .tstamp, time, .timestamp").remove();

  if (type === "dialogue") {
    const speaker = String(speakerName || "").trim() || "Speaker";
    const speakerElement = $(SPEAKER_SELECTOR).first();
    if (speakerElement.length) {
      speakerElement.text(`${speaker}:`);
    } else {
      const root = $("body").children().first().length ? $("body").children().first() : $.root().children().first();
      root.prepend(`<span class="by"></span> `);
      root.find(".by").first().text(`${speaker}:`);
    }

    const speakerNode = $(SPEAKER_SELECTOR).first().get(0);
    const textNodes = collectTextNodes($.root().get(0)).filter((node) => {
      let current = node.parent;
      while (current) {
        if (current === speakerNode) return false;
        current = current.parent;
      }
      return true;
    });

    if (textNodes.length > 0) {
      textNodes[textNodes.length - 1].data = textContent;
    } else {
      const contentElement = $(".content").first();
      if (contentElement.length) contentElement.text(textContent);
      else $("<span class=\"content\"></span>").text(textContent).insertAfter($(SPEAKER_SELECTOR).first());
    }
  } else {
    const textNodes = collectTextNodes($.root().get(0));
    if (textNodes.length > 0) textNodes[textNodes.length - 1].data = textContent;
    else {
      const root = $("body").children().first().length ? $("body").children().first() : $.root().children().first();
      if (root.length) root.text(textContent);
    }
  }

  return serialize($);
}

module.exports = {
  buildBlockFromTemplate,
  collectTextNodes,
  replaceTextPreservingMarkup,
  replaceTextNodeAtIndexPreservingMarkup,
  textFromHtml,
};
