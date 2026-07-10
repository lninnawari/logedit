const fs = require("fs");
const path = require("path");

require("dotenv/config");

const { createApp } = require("../src/app");
const { prisma } = require("../src/prisma");

const samplePath = process.argv[2];

if (!samplePath) {
  console.error("Usage: node scripts/e2e-sample.js <path-to-html>");
  process.exit(1);
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve(server);
    });
  });
}

async function requestJson(baseUrl, path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const { headers: _headers, ...restOptions } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    ...restOptions,
    headers,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${body.error || response.statusText}`);
  return body;
}

async function requestText(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${body}`);
  return body;
}

async function getAdminToken(baseUrl) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required for admin-protected e2e.");
  }

  const data = await requestJson(baseUrl, "/api/admin/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });

  return data.token;
}

async function main() {
  const html = fs.readFileSync(path.resolve(samplePath), "utf8");
  const app = createApp();
  const server = await listen(app);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const password = `test-${Date.now()}`;
  let projectId = null;

  try {
    const adminToken = await getAdminToken(baseUrl);
    const created = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: "E2E Roll20 sample",
        password,
        html,
      }),
    });

    projectId = created.projectId;
    const verified = await requestJson(baseUrl, `/api/share/${projectId}/verify`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    const blocksResponse = await requestJson(baseUrl, `/api/share/${projectId}/blocks`, {
      headers: { Authorization: `Bearer ${verified.token}` },
    });

    const editableBlock = blocksResponse.blocks.find((block) => block.blockType !== "handout");
    if (!editableBlock) throw new Error("No editable text block found.");

    const patched = await requestJson(baseUrl, `/api/share/${projectId}/blocks/${editableBlock.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${verified.token}` },
      body: JSON.stringify({ textContent: "E2E 수정 문장..." }),
    });

    const preview = await requestText(baseUrl, `/api/projects/${projectId}/preview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const download = await requestText(baseUrl, `/api/projects/${projectId}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const countsAfterDelete = await Promise.all([
      prisma.project.count({ where: { id: projectId } }),
      prisma.messageBlock.count({ where: { projectId } }),
      prisma.shareLink.count({ where: { projectId } }),
      prisma.correctionSettings.count({ where: { projectId } }),
    ]);

    console.log(
      JSON.stringify(
        {
          projectId,
          createdBlockCount: created.blockCount,
          fetchedBlockCount: blocksResponse.blocks.length,
          patched: {
            id: patched.id,
            isEdited: patched.isEdited,
            textContent: patched.textContent,
          },
          previewContainsEdit: preview.includes("E2E 수정 문장…"),
          downloadContainsEdit: download.includes("E2E 수정 문장…"),
          countsAfterDelete: {
            projects: countsAfterDelete[0],
            blocks: countsAfterDelete[1],
            shareLinks: countsAfterDelete[2],
            correctionSettings: countsAfterDelete[3],
          },
        },
        null,
        2
      )
    );
  } finally {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
