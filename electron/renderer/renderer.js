const $ = (id) => document.getElementById(id);

const state = {
  serverUrl: localStorage.getItem("serverUrl") || "",
  adminToken: localStorage.getItem("adminToken") || "",
  admin: JSON.parse(localStorage.getItem("admin") || "null"),
};

function setText(id, text) {
  $(id).textContent = text || "";
}

function show(id, visible) {
  $(id).classList.toggle("hidden", !visible);
}

function server(path) {
  return `${state.serverUrl.replace(/\/+$/, "")}${path}`;
}

async function api(path, options = {}) {
  const response = await fetch(server(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(typeof body === "object" && body.error ? body.error : "요청에 실패했습니다.");
  return body;
}

async function fetchAdminText(path) {
  const response = await fetch(server(path), {
    headers: { Authorization: `Bearer ${state.adminToken}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "요청에 실패했습니다.");
  return text;
}

function saveSession(token, admin) {
  state.adminToken = token;
  state.admin = admin;
  localStorage.setItem("adminToken", token);
  localStorage.setItem("admin", JSON.stringify(admin));
}

function clearSession() {
  state.adminToken = "";
  state.admin = null;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("admin");
}

async function refreshMode() {
  $("serverUrl").value = state.serverUrl;
  setText("serverState", "");
  show("setupForm", false);
  show("loginForm", false);
  show("sessionPanel", false);
  show("uploadForm", false);
  show("projectsPanel", false);

  if (!state.serverUrl) {
    setText("serverState", "서버 URL을 입력하세요.");
    return;
  }

  try {
    const setup = await api("/api/setup/status");
    if (setup.required) {
      show("setupForm", true);
      return;
    }

    if (!state.adminToken) {
      show("loginForm", true);
      return;
    }

    setText("adminEmail", state.admin?.email || "");
    show("sessionPanel", true);
    show("uploadForm", true);
    show("projectsPanel", true);
    await loadProjects();
  } catch (error) {
    setText("serverState", error.message);
  }
}

async function loadProjects() {
  const box = $("projects");
  box.textContent = "불러오는 중";
  try {
    const data = await api("/api/projects", {
      headers: { Authorization: `Bearer ${state.adminToken}` },
    });
    box.textContent = "";
    if (!data.projects.length) {
      box.textContent = "아직 프로젝트가 없습니다.";
      return;
    }

    for (const project of data.projects) {
      const item = document.createElement("article");
      item.className = "project-item";
      item.innerHTML = `
        <div>
          <h3></h3>
          <p>${project.status} · ${project.blockCount.toLocaleString()} blocks</p>
        </div>
        <div class="actions">
          <button data-action="share">공유</button>
          <button data-action="preview">미리보기</button>
          <button data-action="download">저장</button>
          <button data-action="delete" class="danger">삭제</button>
        </div>
      `;
      item.querySelector("h3").textContent = project.title;
      item.querySelector('[data-action="share"]').addEventListener("click", () => {
        window.trpgHome.openExternal(server(project.sharePath));
      });
      item.querySelector('[data-action="preview"]').addEventListener("click", async () => {
        const text = await fetchAdminText(`/api/projects/${project.id}/preview`);
        alert(text.slice(0, 4000));
      });
      item.querySelector('[data-action="download"]').addEventListener("click", async () => {
        const text = await fetchAdminText(`/api/projects/${project.id}/download`);
        await window.trpgHome.saveText({ defaultPath: `${project.title || project.id}.txt`, text });
        await loadProjects();
      });
      item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (!confirm("이 프로젝트를 삭제할까요?")) return;
        await api(`/api/projects/${project.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${state.adminToken}` },
        });
        await loadProjects();
      });
      box.appendChild(item);
    }
  } catch (error) {
    box.textContent = error.message;
  }
}

$("serverForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.serverUrl = $("serverUrl").value.trim();
  localStorage.setItem("serverUrl", state.serverUrl);
  await refreshMode();
});

$("setupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("setupPassword").value;
  if (password !== $("setupConfirm").value) {
    setText("serverState", "비밀번호가 일치하지 않습니다.");
    return;
  }
  try {
    const data = await api("/api/setup/admin", {
      method: "POST",
      body: JSON.stringify({ email: $("setupEmail").value, password }),
    });
    saveSession(data.token, data.admin);
    await refreshMode();
  } catch (error) {
    setText("serverState", error.message);
  }
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    });
    saveSession(data.token, data.admin);
    await refreshMode();
  } catch (error) {
    setText("serverState", error.message);
  }
});

$("logoutButton").addEventListener("click", async () => {
  clearSession();
  await refreshMode();
});

$("refreshProjects").addEventListener("click", loadProjects);

$("uploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setText("uploadResult", "");
  try {
    const formData = new FormData();
    formData.set("title", $("title").value || "Untitled log");
    if ($("sharePassword").value) formData.set("password", $("sharePassword").value);
    const file = $("htmlFile").files?.[0];
    if (file) formData.set("htmlFile", file);
    if (!file && $("htmlText").value) formData.set("html", $("htmlText").value);

    const response = await fetch(server("/api/projects"), {
      method: "POST",
      headers: { Authorization: `Bearer ${state.adminToken}` },
      body: formData,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "업로드에 실패했습니다.");

    setText("uploadResult", `${body.blockCount.toLocaleString()} blocks · ${server(body.share.path)} · ${body.share.password}`);
    $("htmlFile").value = "";
    $("htmlText").value = "";
    await loadProjects();
  } catch (error) {
    setText("uploadResult", error.message);
  }
});

refreshMode();
