import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import DOMPurify from "dompurify";
import { Check, Copy, Download, Eye, EyeOff, KeyRound, Loader2, LogOut, RefreshCw, Save, Send, Trash2, Upload, X } from "lucide-react";

import "./styles.css";

function getProjectId() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)/);
  return match ? match[1] : "";
}

function isSharePath() {
  return /^\/share\/[^/]+/.test(window.location.pathname);
}

function isIntakePath() {
  return window.location.pathname === "/upload";
}

async function api(path, options = {}) {
  const { headers: optionHeaders, ...fetchOptions } = options;
  const response = await fetch(path, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...optionHeaders,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === "object" && body.error ? body.error : "요청에 실패했습니다.";
    throw new Error(message);
  }

  return body;
}

function HtmlPasteInput({ id, value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || document.activeElement === ref.current) return;
    if (ref.current.textContent !== value) ref.current.textContent = value;
  }, [value]);

  function handlePaste(event) {
    const clipboardHtml = event.clipboardData.getData("text/html");
    const clipboardText = event.clipboardData.getData("text/plain");
    const pastedValue = clipboardHtml || clipboardText;
    if (!pastedValue) return;

    event.preventDefault();
    onChange(pastedValue);
    if (ref.current) ref.current.textContent = "";
  }

  return value ? (
    <div className="html-paste-summary" id={id}>
      <span>HTML 붙여넣기 완료</span>
      <small>{value.length.toLocaleString()}자</small>
      <button type="button" className="icon-button" onClick={() => onChange("")} title="붙여넣은 HTML 지우기">
        <X size={16} />
      </button>
    </div>
  ) : (
    <div
      id={id}
      ref={ref}
      className="html-paste-box"
      contentEditable
      data-placeholder={placeholder}
      role="textbox"
      aria-multiline="true"
      tabIndex={0}
      onInput={(event) => onChange(event.currentTarget.textContent || "")}
      onPaste={handlePaste}
      suppressContentEditableWarning
    />
  );
}

function AuthPanel({ projectId, onToken }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await api(`/api/share/${projectId}/verify`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      onToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={submit}>
        <div className="auth-icon">
          <KeyRound size={24} />
        </div>
        <h1>공유 로그</h1>
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" disabled={!password || isSubmitting}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          확인
        </button>
      </form>
    </main>
  );
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.token, data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={submit}>
        <div className="auth-icon">
          <KeyRound size={24} />
        </div>
        <h1>관리자 로그인</h1>
        <label htmlFor="adminEmail">이메일</label>
        <input id="adminEmail" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus />
        <label htmlFor="adminPassword">비밀번호</label>
        <input
          id="adminPassword"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" disabled={!email || !password || isSubmitting}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          로그인
        </button>
      </form>
    </main>
  );
}

function AdminSetup({ onSetup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await api("/api/setup/admin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSetup(data.token, data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="auth-panel" onSubmit={submit}>
        <div className="auth-icon">
          <KeyRound size={24} />
        </div>
        <h1>관리자 계정 만들기</h1>
        <label htmlFor="setupEmail">이메일</label>
        <input id="setupEmail" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" autoFocus />
        <label htmlFor="setupPassword">비밀번호</label>
        <input
          id="setupPassword"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        <label htmlFor="setupConfirmPassword">비밀번호 확인</label>
        <input
          id="setupConfirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" disabled={!email || password.length < 8 || !confirmPassword || isSubmitting}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          생성
        </button>
      </form>
    </main>
  );
}

function PublicUploadPage() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [html, setHtml] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (notes) formData.set("notes", notes);
      formData.set("title", title);
      if (file) formData.set("htmlFile", file);
      if (!file && html) formData.set("html", html);

      const response = await fetch("/api/intake/projects", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "업로드에 실패했습니다.");

      setResult(body);
      setTitle("");
      setNotes("");
      setFile(null);
      setHtml("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-shell">
      <form className="intake-panel" onSubmit={submit}>
        <header>
          <h1>로그 원본 업로드</h1>
          <p>프로젝트명은 닉네임 - 시나리오 제목 형식으로 적어주세요.</p>
        </header>
        <label htmlFor="requestTitle">프로젝트명</label>
        <input id="requestTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="닉네임 - 시나리오 제목" required />
        <label htmlFor="requestNotes">메모</label>
        <textarea id="requestNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="같이 전달할 내용이 있다면 적어주세요." />
        <label htmlFor="requestFile">HTML 파일</label>
        <input id="requestFile" type="file" accept=".html,text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <label htmlFor="requestHtml">HTML 붙여넣기</label>
        <HtmlPasteInput id="requestHtml" value={html} onChange={setHtml} placeholder="파일 대신 HTML을 붙여넣을 수 있습니다." />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" disabled={isSubmitting || !title || (!file && !html)}>
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          업로드
        </button>
        {result ? (
          <section className="result-panel">
            <h2>업로드되었습니다</h2>
            <p>{result.blockCount.toLocaleString()}개 블록을 읽었습니다.</p>
            <code>{result.projectId}</code>
          </section>
        ) : null}
      </form>
    </main>
  );
}

function UploadPanel({ adminToken, onUploaded }) {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [html, setHtml] = useState("");
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("title", title || "Untitled log");
      if (password) formData.set("password", password);
      if (file) formData.set("htmlFile", file);
      if (!file && html) formData.set("html", html);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "업로드에 실패했습니다.");
      setResult(body);
      setShowPassword(false);
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="upload-panel" onSubmit={submit}>
      <header>
        <h1>로그 업로드</h1>
      </header>
      <label htmlFor="title">제목</label>
      <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="세션 이름" />
      <label htmlFor="uploadPassword">공유 비밀번호</label>
      <input
        id="uploadPassword"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="비워두면 자동 생성"
      />
      <label htmlFor="htmlFile">HTML 파일</label>
      <input id="htmlFile" type="file" accept=".html,text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <label htmlFor="html">HTML 붙여넣기</label>
      <HtmlPasteInput id="html" value={html} onChange={setHtml} placeholder="파일 대신 원본 HTML을 붙여넣을 수 있습니다." />
      {error ? <p className="error-text">{error}</p> : null}
      <button className="primary-button" disabled={isSubmitting || (!file && !html)}>
        {isSubmitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
        업로드
      </button>
      {result ? (
        <section className="result-panel">
          <h2>공유 정보</h2>
          <p>{result.blockCount.toLocaleString()} blocks</p>
          <div className="copy-row">
            <a href={result.share.path}>{window.location.origin + result.share.path}</a>
            <button type="button" className="icon-button" onClick={() => copyText(window.location.origin + result.share.path)} title="링크 복사">
              <Copy size={16} />
            </button>
          </div>
          <div className="password-row">
            <code>{showPassword ? result.share.password : "******"}</code>
            <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} title="비밀번호 보기">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </section>
      ) : null}
    </form>
  );
}

function ProjectList({ adminToken, refreshKey, onDeleted }) {
  const [projects, setProjects] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const data = await api("/api/projects", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      setProjects(data.projects);
      setState("ready");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function deleteProject(projectId) {
    if (!window.confirm("이 프로젝트를 삭제할까요? 관련 블록과 공유 링크도 함께 삭제됩니다.")) return;
    await api(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    onDeleted();
    load();
  }

  async function updateHandoutIcon(projectId, customHandoutIcon) {
    await api(`/api/projects/${projectId}/correction-settings`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ customHandoutIcon }),
    });
    load();
  }

  async function resetSharePassword(projectId) {
    const password = window.prompt("새 공유 비밀번호를 입력하세요. 최소 6자입니다.");
    if (!password) return;
    await api(`/api/projects/${projectId}/share-link/password`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ password }),
    });
    window.alert("공유 비밀번호가 변경되었습니다.");
  }

  async function openEditor(projectId) {
    const data = await api(`/api/projects/${projectId}/share-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    window.sessionStorage.setItem(`share:${projectId}`, data.token);
    window.location.href = data.path;
  }

  async function reparseProject(projectId) {
    if (!window.confirm("원본 HTML을 다시 분석할까요? 현재 블록 수정 내용은 원본 기준으로 초기화됩니다.")) return;

    await api(`/api/projects/${projectId}/reparse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await load();
    window.alert("다시 분석했습니다.");
  }

  async function openPreview(projectId) {
    const text = await fetchAdminText(`/api/projects/${projectId}/preview`, adminToken);
    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (previewWindow) {
      previewWindow.document.write(`<pre>${escapeHtml(text)}</pre>`);
      previewWindow.document.close();
    }
  }

  async function downloadTxt(projectId) {
    const text = await fetchAdminText(`/api/projects/${projectId}/download`, adminToken);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="project-panel">
      <header className="panel-header">
        <h2>프로젝트</h2>
        <button className="icon-button" onClick={load} title="새로고침">
          <RefreshCw size={18} />
        </button>
      </header>
      {state === "loading" ? <p className="muted-text">불러오는 중</p> : null}
      {state === "error" ? <p className="error-text">{error}</p> : null}
      {state === "ready" && projects.length === 0 ? <p className="muted-text">아직 프로젝트가 없습니다.</p> : null}
      {state === "ready" ? (
        <div className="project-list">
          {projects.map((project) => (
            <article className="project-item" key={project.id}>
              <div>
                <h3>{project.title}</h3>
                <p>
                  {project.blockCount.toLocaleString()} blocks · 최종 저장 {formatDateTime(project.updatedAt)}
                </p>
                <label className="compact-setting">
                  이미지 아이콘
                  <input
                    value={project.correctionSettings?.customHandoutIcon || "★"}
                    maxLength={8}
                    onChange={(event) => {
                      const value = event.target.value || "★";
                      setProjects((current) =>
                        current.map((item) =>
                          item.id === project.id
                            ? {
                                ...item,
                                correctionSettings: {
                                  ...(item.correctionSettings || {}),
                                  customHandoutIcon: value,
                                },
                              }
                            : item
                        )
                      );
                    }}
                    onBlur={(event) => updateHandoutIcon(project.id, event.target.value || "★")}
                  />
                </label>
              </div>
              <div className="project-actions">
                <button className="ghost-button" onClick={() => openEditor(project.id)}>
                  수정
                </button>
                <button className="icon-button" onClick={() => copyText(window.location.origin + project.sharePath)} title="링크 복사">
                  <Copy size={16} />
                </button>
                <button className="ghost-button" onClick={() => openPreview(project.id)}>
                  미리보기
                </button>
                <button className="ghost-button" onClick={() => reparseProject(project.id)}>
                  다시 분석
                </button>
                <button className="ghost-button" onClick={() => resetSharePassword(project.id)}>
                  비밀번호 변경
                </button>
                <button className="icon-button" onClick={() => downloadTxt(project.id)} title="TXT 다운로드">
                  <Download size={17} />
                </button>
                <button className="icon-button danger" onClick={() => deleteProject(project.id)} title="삭제">
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

async function fetchAdminText(path, token) {
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "요청에 실패했습니다.");
  return text;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function AdminHome() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [setupState, setSetupState] = useState("checking");
  const [adminToken, setAdminToken] = useState(() => window.localStorage.getItem("adminToken") || "");
  const [admin, setAdmin] = useState(() => {
    const raw = window.localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });
  const refresh = () => setRefreshKey((value) => value + 1);

  useEffect(() => {
    api("/api/setup/status")
      .then((data) => setSetupState(data.required ? "required" : "complete"))
      .catch(() => setSetupState("complete"));
  }, []);

  function login(token, nextAdmin) {
    window.localStorage.setItem("adminToken", token);
    window.localStorage.setItem("admin", JSON.stringify(nextAdmin));
    setAdminToken(token);
    setAdmin(nextAdmin);
    setSetupState("complete");
  }

  function logout() {
    window.localStorage.removeItem("adminToken");
    window.localStorage.removeItem("admin");
    setAdminToken("");
    setAdmin(null);
  }

  if (setupState === "checking") {
    return (
      <main className="center-state">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  if (setupState === "required") {
    return <AdminSetup onSetup={login} />;
  }

  if (!adminToken) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-actions">
          <button className="primary-button" onClick={() => setIsUploadOpen(true)}>
            <Upload size={16} />
            업로드
          </button>
          <span>{admin?.email}</span>
          <button className="ghost-button" onClick={logout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>
      <div className="admin-grid single">
        <ProjectList adminToken={adminToken} refreshKey={refreshKey} onDeleted={refresh} />
      </div>
      {isUploadOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsUploadOpen(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" onClick={() => setIsUploadOpen(false)} title="닫기">
              <X size={16} />
            </button>
            <UploadPanel adminToken={adminToken} onUploaded={refresh} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function formatHandoutText(block, settings) {
  return `${settings?.customHandoutIcon || "★"} ${block.textContent || "이미지/핸드아웃 위치"}`;
}

function editableText(block) {
  const text = String(block.textContent || "");
  const speaker = String(block.speakerName || "").trim();
  if (!speaker || !text.startsWith(speaker)) return text;

  return text.slice(speaker.length).replace(/^\s*[:：>＞]?\s*/, "").trimStart();
}

function stripSpeakerPrefix(text, speakerName) {
  const textValue = String(text || "").trim();
  const speaker = String(speakerName || "").trim();
  if (!speaker || !textValue.startsWith(speaker)) return textValue;
  return textValue.slice(speaker.length).replace(/^\s*[:：>＞]?\s*/, "").trimStart();
}

function lockSpeakerMarkup(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll(".by, .speaker, .author, .username, .name, .message-sender, .byline").forEach((element) => {
    element.setAttribute("contenteditable", "false");
    element.classList.add("locked-speaker");
  });
  template.content.querySelectorAll("strong:first-child, b:first-child").forEach((element) => {
    element.setAttribute("contenteditable", "false");
    element.classList.add("locked-speaker");
  });
  return template.innerHTML;
}

function Block({ block, token, settings, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("idle");
  const editorRef = useRef(null);
  const cleanHtml = useMemo(() => lockSpeakerMarkup(DOMPurify.sanitize(block.rawHtml)), [block.rawHtml]);

  useEffect(() => {
    if (!isEditing || !editorRef.current) return;
    editorRef.current.focus();

    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing]);

  async function save(nextText) {
    const normalizedText = stripSpeakerPrefix(nextText, block.speakerName);
    if (!normalizedText || normalizedText === editableText(block)) {
      setIsEditing(false);
      return;
    }

    setStatus("saving");
    try {
      const updated = await api(`/api/share/${block.projectId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ textContent: normalizedText }),
      });
      onUpdated(updated);
      setIsEditing(false);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch (_err) {
      setStatus("error");
    }
  }

  function finishEditing(event) {
    save(event.currentTarget.innerText);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsEditing(false);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <article
      className={`log-block ${block.isEdited ? "edited" : ""} ${isEditing ? "editing" : ""}`}
      onDoubleClick={() => setIsEditing(true)}
      title={isEditing ? "수정 후 바깥을 클릭하면 저장됩니다." : "더블클릭해서 수정"}
    >
      <div className="block-body">
        {block.blockType === "handout" ? (
          <div
            ref={editorRef}
            className="handout-text editable-surface"
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
          >
            {formatHandoutText(block, settings)}
          </div>
        ) : (
          <div
            ref={editorRef}
            className="rendered-html editable-surface"
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        )}
      </div>
      <div className="block-status">
        {status === "saving" ? <Loader2 className="spin" size={14} /> : null}
        {status === "saved" ? <span className="saved-text">저장됨</span> : null}
        {status === "error" ? <span className="error-text">저장 실패</span> : null}
      </div>
    </article>
  );
}

function Editor({ projectId, token }) {
  const [blocks, setBlocks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  async function loadBlocks() {
    setState("loading");
    setError("");
    try {
      const data = await api(`/api/share/${projectId}/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBlocks(data.blocks);
      setSettings(data.settings);
      setState("ready");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  useEffect(() => {
    loadBlocks();
  }, []);

  function updateBlock(updated) {
    setBlocks((current) => current.map((block) => (block.id === updated.id ? updated : block)));
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div>
          <h1>로그 편집</h1>
          <p>{blocks.length.toLocaleString()} blocks</p>
        </div>
        <button className="icon-button" onClick={loadBlocks} title="새로고침">
          <RefreshCw size={18} />
        </button>
      </header>
      {state === "loading" ? (
        <div className="center-state">
          <Loader2 className="spin" size={24} />
        </div>
      ) : null}
      {state === "error" ? <div className="center-state error-text">{error}</div> : null}
      {state === "ready" ? (
        <section className="log-list">
          {blocks.map((block) => (
            <Block key={block.id} block={block} token={token} settings={settings} onUpdated={updateBlock} />
          ))}
        </section>
      ) : null}
    </main>
  );
}

function App() {
  const projectId = getProjectId();
  const [token, setToken] = useState(() => window.sessionStorage.getItem(`share:${projectId}`) || "");

  function handleToken(nextToken) {
    window.sessionStorage.setItem(`share:${projectId}`, nextToken);
    setToken(nextToken);
  }

  if (isIntakePath()) {
    return <PublicUploadPage />;
  }

  if (!isSharePath()) {
    return <AdminHome />;
  }

  if (!projectId) {
    return <main className="center-state">공유 링크가 올바르지 않습니다.</main>;
  }

  return token ? <Editor projectId={projectId} token={token} /> : <AuthPanel projectId={projectId} onToken={handleToken} />;
}

createRoot(document.getElementById("root")).render(<App />);
