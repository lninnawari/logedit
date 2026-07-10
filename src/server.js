const { createApp } = require("./app");
const { config, requireRuntimeConfig } = require("./config");

requireRuntimeConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`TRPG log editor API listening on http://localhost:${config.port}`);
});
