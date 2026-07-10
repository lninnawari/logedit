const crypto = require("crypto");

function generateSharePassword() {
  return crypto.randomBytes(6).toString("base64url");
}

module.exports = { generateSharePassword };
