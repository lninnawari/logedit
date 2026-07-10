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

module.exports = {
  collectTextNodes,
  replaceTextPreservingMarkup,
};
