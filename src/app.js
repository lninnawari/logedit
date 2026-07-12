const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const { adminRouter } = require("./routes/admin");
const { intakeRouter } = require("./routes/intake");
const { projectRouter } = require("./routes/projects");
const { setupRouter } = require("./routes/setup");
const { shareRouter } = require("./routes/share");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "trpg-log-editor",
    });
  });

  app.use("/api/setup", setupRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/intake", intakeRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/share", shareRouter);

  const clientDistPath = path.resolve(__dirname, "..", "dist", "client");
  const clientIndexPath = path.join(clientDistPath, "index.html");

  if (fs.existsSync(clientIndexPath)) {
    app.use(express.static(clientDistPath));
    app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
      res.sendFile(clientIndexPath);
    });
  }

  app.use((req, res) => {
    res.status(404).json({
      error: "Not found",
      path: req.path,
    });
  });

  app.use((err, _req, res, _next) => {
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid request body.",
        issues: err.issues,
      });
    }

    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  return app;
}

module.exports = { createApp };
