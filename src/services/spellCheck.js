const { spawn } = require("node:child_process");
const path = require("node:path");

const provider = process.env.SPELLCHECK_PROVIDER || "hanspell";
const pythonCommand = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const scriptPath = path.join(__dirname, "..", "..", "scripts", "spellcheck_hanspell.py");

function runPythonSpellCheck(text) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `py-hanspell exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          reject(new Error(parsed.error || "py-hanspell failed"));
          return;
        }
        resolve(parsed.issues || []);
      } catch (error) {
        reject(new Error(`Invalid py-hanspell response: ${error.message}`));
      }
    });

    child.stdin.end(JSON.stringify({ text: String(text || "") }));
  });
}

async function checkChunk(text) {
  if (provider !== "hanspell") {
    throw new Error(`Unsupported spellcheck provider: ${provider}`);
  }

  return runPythonSpellCheck(text);
}

module.exports = {
  checkChunk,
  runPythonSpellCheck,
};
