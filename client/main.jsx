import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import DOMPurify from "dompurify";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import "./styles.css";

function getProjectId() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)/);
  return match ? match[1] : "";
}

function isSharePath() {
  return /^\/share\/[^/]+/.test(window.location.pathname);
}

function isIntakePath() {
  return /^\/intake\/[^/]+\/?$/.test(window.location.pathname);
}

function getIntakeToken() {
  const match = window.location.pathname.match(/^\/intake\/([^/]+)\/?$/);
  return match ? match[1] : "";
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

function PublicUploadPage({ intakeToken }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState("roll20");
  const [customHandoutIcon, setCustomHandoutIcon] = useState("★");
  const [file, setFile] = useState(null);
  const [html, setHtml] = useState("");
  const [result, setResult] = useState(null);
  const [linkState, setLinkState] = useState("checking");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api(`/api/intake/${intakeToken}`)
      .then((data) => setLinkState(data.used ? "used" : "ready"))
      .catch((err) => {
        setError(err.message);
        setLinkState("invalid");
      });
  }, [intakeToken]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (notes) formData.set("notes", notes);
      formData.set("title", title);
      formData.set("sourceType", sourceType);
      formData.set("customHandoutIcon", customHandoutIcon || "★");
      if (file) formData.set("htmlFile", file);
      if (!file && html) formData.set("html", html);

      const response = await fetch(`/api/intake/${intakeToken}/projects`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "업로드에 실패했습니다.");

      setResult(body);
      setLinkState("used");
      setTitle("");
      setNotes("");
      setCustomHandoutIcon("★");
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
        {linkState === "checking" ? <p className="muted-text">업로드 링크 확인 중</p> : null}
        {linkState === "invalid" ? <p className="error-text">{error || "유효하지 않은 업로드 링크입니다."}</p> : null}
        {linkState === "used" && !result ? <p className="error-text">이미 사용된 업로드 링크입니다.</p> : null}
        {linkState === "ready" ? (
          <>
        <label htmlFor="requestTitle">프로젝트명</label>
        <input id="requestTitle" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="닉네임 - 시나리오 제목" required />
        <label htmlFor="requestSourceType">로그 종류</label>
        <select id="requestSourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
          <option value="roll20">Roll20</option>
          <option value="cocofolia">코코포리아</option>
          <option value="auto">자동 감지</option>
        </select>
        <label htmlFor="requestHandoutIcon">이미지 아이콘</label>
        <input
          id="requestHandoutIcon"
          className="short-input"
          value={customHandoutIcon}
          onChange={(event) => setCustomHandoutIcon(event.target.value)}
          maxLength={8}
          placeholder="★"
        />
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
          </>
        ) : null}
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
  const [sourceType, setSourceType] = useState("roll20");
  const [customHandoutIcon, setCustomHandoutIcon] = useState("★");
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
      formData.set("sourceType", sourceType);
      formData.set("customHandoutIcon", customHandoutIcon || "★");
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
      onUploaded(body);
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
      <label htmlFor="sourceType">로그 종류</label>
      <select id="sourceType" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
        <option value="roll20">Roll20</option>
        <option value="cocofolia">코코포리아</option>
        <option value="auto">자동 감지</option>
      </select>
      <label htmlFor="customHandoutIcon">이미지 아이콘</label>
      <input
        id="customHandoutIcon"
        className="short-input"
        value={customHandoutIcon}
        onChange={(event) => setCustomHandoutIcon(event.target.value)}
        maxLength={8}
        placeholder="★"
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

function ProjectList({ adminToken, refreshKey, onDeleted, onUpload, knownPasswords, onPasswordKnown }) {
  const [projects, setProjects] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [uploadLink, setUploadLink] = useState("");

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

  async function resetSharePassword(projectId) {
    const password = window.prompt("새 공유 비밀번호를 입력하세요. 최소 6자입니다.");
    if (!password) return;
    await api(`/api/projects/${projectId}/share-link/password`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ password }),
    });
    onPasswordKnown(projectId, password);
    setVisiblePasswords((current) => ({ ...current, [projectId]: true }));
    window.setTimeout(() => {
      setVisiblePasswords((current) => ({ ...current, [projectId]: false }));
    }, 2200);
    window.alert("공유 비밀번호가 변경되었습니다.");
  }

  async function renameProject(project) {
    const title = window.prompt("새 프로젝트명을 입력하세요.", project.title);
    if (!title || title.trim() === project.title) return;

    const updated = await api(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title }),
    });

    setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, ...updated } : item)));
  }

  function showPasswordBriefly(projectId) {
    if (!knownPasswords[projectId]) return;
    setVisiblePasswords((current) => ({ ...current, [projectId]: true }));
    window.setTimeout(() => {
      setVisiblePasswords((current) => ({ ...current, [projectId]: false }));
    }, 2200);
  }

  async function createUploadLink() {
    const data = await api("/api/projects/upload-links", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const absoluteUrl = window.location.origin + data.path;
    setUploadLink(absoluteUrl);
    await copyText(absoluteUrl);
    window.alert("1회용 업로드 링크를 생성해서 복사했습니다.");
  }

  async function openEditor(projectId) {
    const data = await api(`/api/projects/${projectId}/share-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    window.sessionStorage.setItem(`share:${projectId}`, data.token);
    window.location.href = data.path;
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
        <div className="panel-header-actions">
          <button className="ghost-button compact-button" onClick={load} title="새로고침">
            <RefreshCw size={14} />
            새로고침
          </button>
          <button className="ghost-button compact-button" onClick={createUploadLink}>
            업로드 링크 생성
          </button>
          <button className="primary-button compact-button" onClick={onUpload}>
            <Upload size={15} />
            업로드
          </button>
        </div>
      </header>
      {uploadLink ? (
        <div className="upload-link-notice">
          <span>1회용 업로드 링크</span>
          <code>{uploadLink}</code>
          <button type="button" className="ghost-button compact-button" onClick={() => copyText(uploadLink)}>
            <Copy size={14} />
            복사
          </button>
        </div>
      ) : null}
      <div className="project-list">
        {state === "loading" ? <div className="project-list-state">불러오는 중</div> : null}
        {state === "error" ? <div className="project-list-state error-text">{error}</div> : null}
        {state === "ready" && projects.length === 0 ? <div className="project-list-state">아직 프로젝트가 없습니다.</div> : null}
        {state === "ready"
          ? projects.map((project) => (
            <article className="project-item" key={project.id}>
              <div className="project-summary">
                <div className="project-title-row">
                  <h3>{project.title}</h3>
                  <button type="button" className="bare-icon-button" onClick={() => renameProject(project)} title="프로젝트명 수정">
                    <Pencil size={13} />
                  </button>
                </div>
                <p>최종 저장 {formatDateTime(project.updatedAt)}</p>
                <p>이미지 아이콘 {project.correctionSettings?.customHandoutIcon || "★"}</p>
                <div className="project-password-line">
                  <span>비밀번호</span>
                  <code>{visiblePasswords[project.id] && knownPasswords[project.id] ? knownPasswords[project.id] : "******"}</code>
                  <button
                    type="button"
                    className="tiny-icon-button"
                    onClick={() => showPasswordBriefly(project.id)}
                    disabled={!knownPasswords[project.id]}
                    title={knownPasswords[project.id] ? "비밀번호 잠깐 보기" : "현재 브라우저에 저장된 비밀번호가 없습니다"}
                  >
                    <Eye size={13} />
                  </button>
                  <button type="button" className="inline-text-button" onClick={() => resetSharePassword(project.id)}>
                    비밀번호 변경
                  </button>
                </div>
              </div>
              <div className="project-actions">
                <button className="ghost-button text-only-button" onClick={() => openEditor(project.id)}>
                  수정
                </button>
                <button className="ghost-button text-only-button" onClick={() => openPreview(project.id)}>
                  미리보기
                </button>
                <button className="ghost-button text-only-button" onClick={() => copyText(window.location.origin + project.sharePath)}>
                  링크복사
                </button>
                <button className="icon-button" onClick={() => downloadTxt(project.id)} title="TXT 다운로드">
                  <Download size={17} />
                </button>
                <button className="icon-button danger" onClick={() => deleteProject(project.id)} title="삭제">
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
            ))
          : null}
      </div>
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

function countTextCharacters(blocks) {
  return blocks.reduce((sum, block) => sum + Array.from(String(block.textContent || "")).length, 0);
}

function AdminHome() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [knownPasswords, setKnownPasswords] = useState({});
  const [setupState, setSetupState] = useState("checking");
  const [adminToken, setAdminToken] = useState(() => window.localStorage.getItem("adminToken") || "");
  const [admin, setAdmin] = useState(() => {
    const raw = window.localStorage.getItem("admin");
    return raw ? JSON.parse(raw) : null;
  });
  const refresh = () => setRefreshKey((value) => value + 1);
  const rememberPassword = (projectId, password) => {
    setKnownPasswords((current) => ({ ...current, [projectId]: password }));
  };
  const handleUploaded = (result) => {
    if (result?.projectId && result?.share?.password) {
      rememberPassword(result.projectId, result.share.password);
    }
    refresh();
  };

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
          <span>{admin?.email}</span>
          <button className="ghost-button" onClick={logout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>
      <div className="admin-grid single">
        <ProjectList
          adminToken={adminToken}
          refreshKey={refreshKey}
          onDeleted={refresh}
          onUpload={() => setIsUploadOpen(true)}
          knownPasswords={knownPasswords}
          onPasswordKnown={rememberPassword}
        />
      </div>
      {isUploadOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsUploadOpen(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" onClick={() => setIsUploadOpen(false)} title="닫기">
              <X size={16} />
            </button>
            <UploadPanel adminToken={adminToken} onUploaded={handleUploaded} />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function formatHandoutText(block, settings) {
  const label = String(block.textContent || "이미지/핸드아웃").trim();
  return `${settings?.customHandoutIcon || "★"} 이미지/핸드아웃 [${label}]`;
}

function handoutInlineStyle(block) {
  const source = String(block?.rawHtml || "");
  const match = source.match(/class\s*=\s*["'][^"']*\bhandout-marker\b[^"']*["'][^>]*\sstyle\s*=\s*["']([^"']*)["']/i);
  if (!match) return undefined;

  return match[1].split(";").reduce((style, declaration) => {
    const [rawProperty, ...rawValue] = declaration.split(":");
    const property = rawProperty?.trim().toLowerCase();
    const value = rawValue.join(":").replace(/\s*!important\b/gi, "").trim();
    if (!property || !value) return style;
    if (property === "font-family") style.fontFamily = value;
    if (property === "font-style") style.fontStyle = value;
    if (property === "font-weight") style.fontWeight = value;
    if (property === "color") style.color = value;
    if (property === "line-height") style.lineHeight = value;
    if (property === "text-align") style.textAlign = value;
    return style;
  }, {});
}

const EXPLICIT_SPEAKER_MARKUP_PATTERN =
  /class\s*=\s*["'][^"']*\b(by|speaker|author|username|name|message-sender|byline)\b/i;

function blockSpeakerName(block) {
  const speaker = String(block?.speakerName || "").trim();
  if (!speaker) return "";
  return EXPLICIT_SPEAKER_MARKUP_PATTERN.test(String(block?.rawHtml || "")) ? speaker : "";
}

function editableText(block) {
  const text = String(block.textContent || "");
  const speaker = blockSpeakerName(block);
  if (!speaker || !text.startsWith(speaker)) return text;

  return text.slice(speaker.length).replace(/^\s*[:：>＞]?\s*/, "").trimStart();
}

function stripSpeakerPrefix(text, speakerName) {
  const textValue = String(text || "").trim();
  const speaker = String(speakerName || "").trim();
  if (!speaker || !textValue.startsWith(speaker)) return textValue;
  return textValue.slice(speaker.length).replace(/^\s*[:：>＞]?\s*/, "").trimStart();
}

function prepareEditableMarkup(html, editingTextNodeIndex = null, continuationSpeakerName = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  const lockedSelectors = ".by, .speaker, .author, .username, .name, .message-sender, .byline";
  template.content.querySelectorAll(lockedSelectors).forEach((element) => {
    element.setAttribute("contenteditable", "false");
    element.classList.add("locked-speaker");
  });
  template.content.querySelectorAll(".message.general").forEach((message) => {
    const speaker = message.querySelector(".by, .speaker, .author, .username, .name, .message-sender, .byline");
    if (message.querySelector(":scope > .message-line")) return;

    const line = document.createElement("span");
    line.className = "message-line";
    const content = document.createElement("span");
    content.className = "message-text";

    if (speaker && speaker.parentElement === message) {
      message.insertBefore(line, speaker);
      line.appendChild(speaker);
    } else if (continuationSpeakerName) {
      const placeholder = document.createElement("span");
      placeholder.className = "by locked-speaker continuation-speaker synthetic-speaker";
      placeholder.setAttribute("contenteditable", "false");
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.textContent = `${continuationSpeakerName}:`;
      message.insertBefore(line, message.firstChild);
      line.appendChild(placeholder);
    } else {
      return;
    }

    let node = line.nextSibling;
    while (node) {
      const next = node.nextSibling;
      content.appendChild(node);
      node = next;
    }
    line.appendChild(content);
    message.classList.add("message-with-speaker");
  });
  template.content.querySelectorAll("img").forEach((element) => {
    element.setAttribute("referrerpolicy", "no-referrer");
  });
  template.content.querySelectorAll(".message.desc").forEach((element) => {
    if (
      element.querySelector(
        '[align="center"], center, strong, b, [style*="text-align: center"], [style*="text-align:center"]'
      )
    ) {
      element.classList.add("desc-align-center");
      element.style.textAlign = "center";
    }
    element.querySelectorAll(".content > a, .content > span, .content > b, .content > strong, .content > em, .content > i, :scope > a, :scope > span, :scope > b, :scope > strong, :scope > em, :scope > i").forEach((part) => {
      const style = String(part.getAttribute("style") || "").toLowerCase();
      if (style.includes("position: absolute") || /width:\s*\d{3,}/.test(style)) {
        part.classList.add("desc-position-fix");
      }
    });
  });
  let textNodeIndex = 0;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (String(node.data || "").trim()) textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || parent.closest(".synthetic-speaker")) return;

    const index = textNodeIndex;
    textNodeIndex += 1;

    if (parent.closest(lockedSelectors)) return;

    const marker = document.createElement("span");
    marker.className = "editable-part";
    marker.dataset.textNodeIndex = String(index);
    marker.setAttribute("contenteditable", editingTextNodeIndex === index ? "true" : "false");
    if (editingTextNodeIndex === index) marker.classList.add("editing-part");
    marker.textContent = node.data;
    node.replaceWith(marker);
  });

  return template.innerHTML;
}

function AddBlockForm({ onSubmit, onCancel }) {
  const [blockType, setBlockType] = useState("dialogue");
  const [speakerName, setSpeakerName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [state, setState] = useState("idle");

  async function submit(event) {
    event.preventDefault();
    setState("saving");
    try {
      await onSubmit({
        blockType,
        speakerName: blockType === "dialogue" ? speakerName : null,
        textContent,
      });
      setState("idle");
    } catch (_error) {
      setState("error");
    }
  }

  return (
    <form className="add-block-form" onSubmit={submit}>
      <div className="segmented-control">
        <button type="button" className={blockType === "dialogue" ? "active" : ""} onClick={() => setBlockType("dialogue")}>
          대사
        </button>
        <button type="button" className={blockType === "narration" ? "active" : ""} onClick={() => setBlockType("narration")}>
          지문
        </button>
      </div>
      {blockType === "dialogue" ? (
        <input value={speakerName} onChange={(event) => setSpeakerName(event.target.value)} placeholder="화자명" required />
      ) : null}
      <textarea value={textContent} onChange={(event) => setTextContent(event.target.value)} placeholder="추가할 텍스트" required />
      <div className="form-actions">
        <button type="submit" disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
          추가
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          취소
        </button>
        {state === "error" ? <span className="error-text">저장 실패</span> : null}
      </div>
    </form>
  );
}

function issueReplacement(issue, replacements) {
  return replacements[issue.id] ?? issue.candidates[0] ?? issue.original;
}

function issueToChange(issue, replacement) {
  return {
    blockId: issue.blockId,
    start: issue.start,
    end: issue.end,
    original: issue.original,
    replacement,
  };
}

function issueToChanges(issue, replacement) {
  return (issue.occurrences?.length ? issue.occurrences : [issue]).map((occurrence) => issueToChange(occurrence, replacement));
}

function SpellCheckDialog({ issues, failures, blocks, isApplying, onApply, onClose, onSuggest }) {
  const [replacements, setReplacements] = useState({});
  const [resolvedIds, setResolvedIds] = useState({});
  const [suggestionsById, setSuggestionsById] = useState({});
  const [suggestingId, setSuggestingId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const blockMap = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const enrichedIssues = useMemo(
    () =>
      issues.map((issue) => ({
        ...issue,
        candidates: suggestionsById[issue.id] || issue.candidates || [],
      })),
    [issues, suggestionsById]
  );
  const visibleIssues = enrichedIssues.filter((issue) => !resolvedIds[issue.id]);
  const activeIssue = visibleIssues[currentIndex] || visibleIssues[0] || null;

  useEffect(() => {
    const nextReplacements = {};
    issues.forEach((issue) => {
      nextReplacements[issue.id] = issue.candidates[0] || "";
    });
    setReplacements(nextReplacements);
    setResolvedIds({});
    setSuggestionsById({});
    setCurrentIndex(0);
  }, [issues]);

  useEffect(() => {
    if (currentIndex >= visibleIssues.length) {
      setCurrentIndex(Math.max(visibleIssues.length - 1, 0));
    }
  }, [currentIndex, visibleIssues.length]);

  function resolveIssues(nextIssues) {
    setResolvedIds((current) => {
      const next = { ...current };
      nextIssues.forEach((issue) => {
        next[issue.id] = true;
      });
      return next;
    });
  }

  function skipCurrent() {
    if (!activeIssue) return;
    resolveIssues([activeIssue]);
  }

  async function applyCurrent() {
    if (!activeIssue) return;
    const replacement = issueReplacement(activeIssue, replacements);
    if (replacement === activeIssue.original) return;
    await onApply(issueToChanges(activeIssue, replacement), { closeOnDone: false });
    resolveIssues([activeIssue]);
  }

  async function applyAllSame() {
    if (!activeIssue) return;
    const replacement = issueReplacement(activeIssue, replacements);
    if (replacement === activeIssue.original) return;
    const sameIssues = visibleIssues.filter(
      (issue) => issue.original === activeIssue.original && issueReplacement(issue, replacements) === replacement
    );
    await onApply(
      sameIssues.flatMap((issue) => issueToChanges(issue, replacement)),
      { closeOnDone: false }
    );
    resolveIssues(sameIssues);
  }

  async function requestSuggestion() {
    if (!activeIssue || !onSuggest) return;
    setSuggestingId(activeIssue.id);
    try {
      const candidates = await onSuggest(activeIssue.original);
      setSuggestionsById((current) => ({ ...current, [activeIssue.id]: candidates }));
      setReplacements((current) => ({ ...current, [activeIssue.id]: candidates[0] || activeIssue.original }));
    } finally {
      setSuggestingId("");
    }
  }

  const activeBlock = activeIssue ? blockMap.get(activeIssue.blockId) : null;
  const activeReplacement = activeIssue ? issueReplacement(activeIssue, replacements) : "";
  const activeCandidates = activeIssue?.candidates || [];
  const activeOccurrenceCount = activeIssue?.occurrenceCount || activeIssue?.occurrences?.length || (activeIssue ? 1 : 0);
  const sameCount = activeIssue
    ? visibleIssues.filter((issue) => issue.original === activeIssue.original && issueReplacement(issue, replacements) === activeReplacement)
        .length
    : 0;

  return (
    <div className="modal-backdrop">
      <section className="modal-panel spellcheck-panel">
        <button type="button" className="icon-button modal-close" onClick={onClose} title="닫기">
          <X size={16} />
        </button>
        <header>
          <h2>맞춤법 검사</h2>
          <p>
            {issues.length.toLocaleString()}개 후보 그룹 · {Math.min(currentIndex + 1, visibleIssues.length).toLocaleString()} /{" "}
            {visibleIssues.length.toLocaleString()}
          </p>
        </header>
        {failures.length > 0 ? <p className="error-text">{failures.length.toLocaleString()}개 구간은 검사하지 못했습니다.</p> : null}
        {activeIssue ? (
          <article className="spellcheck-card">
            <div className="spellcheck-row">
              <span>기존</span>
              <strong>{activeIssue.original}</strong>
            </div>
            <label className="spellcheck-row">
              <span>바꿈</span>
              {activeCandidates.length > 0 ? (
                <select
                  value={activeReplacement}
                  onChange={(event) => setReplacements((current) => ({ ...current, [activeIssue.id]: event.target.value }))}
                >
                  {activeCandidates.map((candidate) => (
                    <option value={candidate} key={candidate}>
                      {candidate || "(삭제)"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={activeReplacement}
                  onChange={(event) => setReplacements((current) => ({ ...current, [activeIssue.id]: event.target.value }))}
                />
              )}
            </label>
            <button type="button" className="secondary spellcheck-suggest-button" onClick={requestSuggestion} disabled={suggestingId === activeIssue.id}>
              {suggestingId === activeIssue.id ? <Loader2 className="spin" size={14} /> : null}
              제안 받기
            </button>
            {activeIssue.help ? (
              <div className="spellcheck-help">
                <span>사유</span>
                <p>{activeIssue.help}</p>
              </div>
            ) : null}
            {activeBlock ? <p className="spellcheck-context">{activeBlock.textContent}</p> : null}
            {activeOccurrenceCount > 1 ? <p className="muted-text">이 표현은 총 {activeOccurrenceCount.toLocaleString()}곳에서 발견되었습니다.</p> : null}
            {sameCount > 1 ? <p className="muted-text">같은 원문 그룹 {sameCount.toLocaleString()}개</p> : null}
          </article>
        ) : (
          <div className="spellcheck-empty">검사를 모두 확인했습니다.</div>
        )}
        <footer className="spellcheck-footer">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="secondary" onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))} disabled={currentIndex === 0}>
            이전
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setCurrentIndex((value) => Math.min(value + 1, visibleIssues.length - 1))}
            disabled={!activeIssue || currentIndex >= visibleIssues.length - 1}
          >
            다음
          </button>
          <button type="button" className="secondary" onClick={skipCurrent} disabled={!activeIssue || isApplying}>
            건너뛰기
          </button>
          <button
            type="button"
            className="secondary"
            onClick={applyAllSame}
            disabled={!activeIssue || isApplying || sameCount < 2 || activeReplacement === activeIssue.original}
          >
            모두 바꾸기
          </button>
          <button type="button" className="primary-button" onClick={applyCurrent} disabled={!activeIssue || isApplying || activeReplacement === activeIssue.original}>
            {isApplying ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            바꾸기
          </button>
        </footer>
      </section>
    </div>
  );
}

function FindReplaceDialog({ blocks, isApplying, onApply, onClose }) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const searchableBlocks = useMemo(() => blocks.filter((block) => block.blockType !== "handout"), [blocks]);
  const matches = useMemo(() => {
    if (!findText) return [];
    return searchableBlocks.flatMap((block) => {
      const text = String(block.textContent || "");
      const found = [];
      let index = text.indexOf(findText);
      while (index >= 0) {
        found.push({ block, start: index, end: index + findText.length });
        index = text.indexOf(findText, index + Math.max(findText.length, 1));
      }
      return found;
    });
  }, [findText, searchableBlocks]);
  const matchedBlockCount = useMemo(() => new Set(matches.map((match) => match.block.id)).size, [matches]);
  const sampleMatches = matches.slice(0, 3);
  const canReplaceAll = findText.length > 0 && matches.length > 0 && findText !== replaceText && !isApplying;

  function matchToChange(match) {
    return {
      blockId: match.block.id,
      start: match.start,
      end: match.end,
      original: findText,
      replacement: replaceText,
    };
  }

  async function replaceAll() {
    if (!canReplaceAll) return;
    await onApply(matches.map(matchToChange), { closeOnDone: false });
    onClose();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-panel find-replace-panel">
        <button type="button" className="icon-button modal-close" onClick={onClose} title="닫기">
          <X size={16} />
        </button>
        <header>
          <h2>전체 찾기/바꾸기</h2>
          <p>로그 전체에서 찾은 단어를 한 번에 바꿉니다.</p>
        </header>
        <label>
          찾기
          <input value={findText} onChange={(event) => setFindText(event.target.value)} autoFocus />
        </label>
        <label>
          바꾸기
          <input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} />
        </label>
        <div className="replace-summary">
          <strong>{matches.length.toLocaleString()}개</strong>
          <span>{matchedBlockCount.toLocaleString()}개 블록에서 발견</span>
        </div>
        {findText && findText === replaceText ? <p className="error-text">찾을 단어와 바꿀 단어가 같습니다.</p> : null}
        {sampleMatches.length > 0 ? (
          <div className="replace-preview-list">
            {sampleMatches.map((match) => (
              <p className="spellcheck-context" key={`${match.block.id}-${match.start}`}>
                {match.block.textContent}
              </p>
            ))}
          </div>
        ) : findText ? (
          <div className="spellcheck-empty">일치하는 단어가 없습니다.</div>
        ) : null}
        <footer className="spellcheck-footer">
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="primary-button" onClick={replaceAll} disabled={!canReplaceAll}>
            {isApplying ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            전체 바꾸기
          </button>
        </footer>
      </section>
    </div>
  );
}

function Block({
  block,
  token,
  settings,
  onUpdated,
  onAddAfter,
  onDeleted,
  onReverted,
  isSelected = false,
  actionsVisible = false,
  onSelected,
  onHoverStart,
  onHoverEnd,
  continuationSpeakerName = "",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTextNodeIndex, setEditingTextNodeIndex] = useState(null);
  const [status, setStatus] = useState("idle");
  const editorRef = useRef(null);
  const cleanHtml = useMemo(
    () => prepareEditableMarkup(DOMPurify.sanitize(block.rawHtml), editingTextNodeIndex, continuationSpeakerName),
    [block.rawHtml, editingTextNodeIndex, continuationSpeakerName]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const hideBrokenImage = (image) => {
      const avatar = image.closest(".avatar, .character-avatar");
      if (avatar) avatar.style.display = "none";
      else image.style.display = "none";
    };

    editorRef.current.querySelectorAll("img").forEach((image) => {
      image.referrerPolicy = "no-referrer";

      if (!image.getAttribute("src") || (image.complete && image.naturalWidth === 0)) {
        hideBrokenImage(image);
        return;
      }

      image.addEventListener("error", () => hideBrokenImage(image), { once: true });
    });
  }, [cleanHtml]);

  useEffect(() => {
    if (!isEditing || !editorRef.current) return;
    const target =
      editingTextNodeIndex == null ? editorRef.current : editorRef.current.querySelector(`[data-text-node-index="${editingTextNodeIndex}"]`);
    if (!target) return;

    target.focus();

    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, [isEditing, editingTextNodeIndex, cleanHtml]);

  async function save(nextText, textNodeIndex = null) {
    const normalizedText = stripSpeakerPrefix(nextText, blockSpeakerName(block));
    if (!normalizedText || (textNodeIndex == null && normalizedText === editableText(block))) {
      setIsEditing(false);
      setEditingTextNodeIndex(null);
      return;
    }

    setStatus("saving");
    try {
      const updated = await api(`/api/share/${block.projectId}/blocks/${block.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ textContent: normalizedText, ...(textNodeIndex == null ? {} : { textNodeIndex }) }),
      });
      onUpdated(updated);
      setIsEditing(false);
      setEditingTextNodeIndex(null);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch (_err) {
      setStatus("error");
    }
  }

  function finishEditing(event) {
    const target = editingTextNodeIndex == null ? event.currentTarget : event.target.closest?.(".editable-part") || event.currentTarget;
    save(target.innerText, editingTextNodeIndex);
  }

  async function revertBlock() {
    setStatus("saving");
    try {
      const updated = await api(`/api/share/${block.projectId}/blocks/${block.id}/revert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      onReverted(updated);
      setIsEditing(false);
      setEditingTextNodeIndex(null);
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch (_err) {
      setStatus("error");
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsEditing(false);
      setEditingTextNodeIndex(null);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  function startEditing(event) {
    const editablePart = event.target.closest?.(".editable-part");
    if (editablePart && editorRef.current?.contains(editablePart)) {
      event.preventDefault();
      event.stopPropagation();
      setEditingTextNodeIndex(Number(editablePart.dataset.textNodeIndex));
      setIsEditing(true);
      return;
    }

    if (block.blockType === "handout") {
      setEditingTextNodeIndex(null);
      setIsEditing(true);
    }
  }

  function startPrimaryEditing(event) {
    event.preventDefault();
    event.stopPropagation();
    const firstEditablePart = editorRef.current?.querySelector(".editable-part");
    if (firstEditablePart) {
      setEditingTextNodeIndex(Number(firstEditablePart.dataset.textNodeIndex));
    } else {
      setEditingTextNodeIndex(null);
    }
    setIsEditing(true);
  }

  return (
    <article
      className={`log-block ${block.isEdited ? "edited" : ""} ${isEditing ? "editing" : ""} ${isSelected ? "selected" : ""} ${
        actionsVisible ? "actions-visible" : ""
      } ${
        continuationSpeakerName ? "continuation" : ""
      }`}
      onClick={() => onSelected(block.id)}
      onMouseEnter={() => onHoverStart(block.id)}
      onMouseLeave={() => onHoverEnd(block.id)}
      onDoubleClick={startEditing}
      title={isEditing ? "수정 후 바깥을 클릭하면 저장됩니다." : "더블클릭해서 수정"}
    >
      <div className="block-quick-actions">
        <button
          type="button"
          className="icon-button"
          onClick={startPrimaryEditing}
          title="수정"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={(event) => {
            event.stopPropagation();
            onAddAfter(block.id);
          }}
          title="아래에 블록 추가"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={(event) => {
            event.stopPropagation();
            onDeleted(block.id);
          }}
          title="삭제"
        >
          <Trash2 size={14} />
        </button>
        {block.isEdited ? (
          <button
            type="button"
            className="icon-button"
            onClick={(event) => {
              event.stopPropagation();
              revertBlock();
            }}
            title="수정 전으로 되돌리기"
          >
            <RotateCcw size={13} />
          </button>
        ) : null}
      </div>
      <div className="block-body">
        {block.blockType === "handout" ? (
          <div
            ref={editorRef}
            className="handout-text editable-surface"
            style={handoutInlineStyle(block)}
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
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);
  const [adminToken] = useState(() => window.localStorage.getItem("adminToken") || "");
  const [addAfterBlockId, setAddAfterBlockId] = useState(undefined);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [hoveredBlockId, setHoveredBlockId] = useState("");
  const [trashBlocks, setTrashBlocks] = useState([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [spellCheck, setSpellCheck] = useState({
    status: "idle",
    total: 0,
    completed: 0,
    results: [],
    failures: [],
    error: "",
  });
  const [spellDialogOpen, setSpellDialogOpen] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [spellApplying, setSpellApplying] = useState(false);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  async function loadBlocks() {
    setState("loading");
    setError("");
    try {
      const data = await api(`/api/share/${projectId}/blocks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(data.project || null);
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

  function updateBlocks(updatedBlocks) {
    const updatedMap = new Map(updatedBlocks.map((block) => [block.id, block]));
    setBlocks((current) => current.map((block) => updatedMap.get(block.id) || block));
  }

  function sortBlocks(nextBlocks) {
    return [...nextBlocks].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async function createBlock(afterBlockId, input) {
    const created = await api(`/api/share/${projectId}/blocks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ afterBlockId, ...input }),
    });
    setBlocks((current) => sortBlocks([...current, created]));
    setAddAfterBlockId(undefined);
  }

  async function deleteBlock(blockId) {
    await api(`/api/share/${projectId}/blocks/${blockId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBlocks((current) => current.filter((block) => block.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId("");
    if (hoveredBlockId === blockId) setHoveredBlockId("");
    if (trashOpen) loadTrash();
  }

  function selectBlock(blockId) {
    setSelectedBlockId(blockId);
    setHoveredBlockId("");
  }

  function hoverBlock(blockId) {
    if (selectedBlockId) return;
    setHoveredBlockId(blockId);
  }

  function unhoverBlock(blockId) {
    if (hoveredBlockId === blockId) setHoveredBlockId("");
  }

  async function loadTrash() {
    const data = await api(`/api/share/${projectId}/trash`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTrashBlocks(data.blocks);
  }

  async function toggleTrash() {
    if (!trashOpen) await loadTrash();
    setTrashOpen((current) => !current);
  }

  async function restoreBlock(blockId) {
    const restored = await api(`/api/share/${projectId}/blocks/${blockId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setTrashBlocks((current) => current.filter((block) => block.id !== blockId));
    setBlocks((current) => sortBlocks([...current, restored]));
  }

  async function startSpellCheck() {
    if (!adminToken) return;
    setSpellCheck({
      status: "running",
      total: 0,
      completed: 0,
      results: [],
      failures: [],
      error: "",
    });

    try {
      const started = await api(`/api/projects/${projectId}/spellcheck/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      let finished = false;
      let lastStatus = null;
      while (!finished) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const status = await api(`/api/projects/${projectId}/spellcheck/status/${started.jobId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        lastStatus = status;
        setSpellCheck({ ...status, error: "" });
        finished = status.status === "done";
      }

      if (lastStatus?.results?.length) {
        setSpellDialogOpen(true);
      } else if (lastStatus?.failures?.length) {
        const failureMessage = lastStatus.failures[0]?.message;
        setSpellCheck({
          ...lastStatus,
          status: "error",
          error: failureMessage
            ? `맞춤법 검사기에 연결하지 못했습니다: ${failureMessage}`
            : "맞춤법 검사기에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
        });
      } else {
        setSpellDialogOpen(false);
      }
    } catch (err) {
      setSpellCheck((current) => ({ ...current, status: "error", error: err.message }));
    }
  }

  async function applySpellCheckChanges(changes, options = {}) {
    if (!adminToken || changes.length === 0) return;
    const { closeOnDone = true } = options;
    setSpellApplying(true);
    try {
      const result = await api(`/api/projects/${projectId}/spellcheck/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ changes }),
      });
      updateBlocks(result.updatedBlocks || []);
      if (closeOnDone) {
        setSpellDialogOpen(false);
        setFindReplaceOpen(false);
        setSpellCheck({
          status: "idle",
          total: 0,
          completed: 0,
          results: [],
          failures: [],
          error: "",
        });
      }
      if (result.skipped?.length) {
        window.alert(`${result.skipped.length.toLocaleString()}개 항목은 본문이 바뀌어 건너뛰었습니다.`);
      }
      return result;
    } catch (err) {
      setSpellCheck((current) => ({ ...current, error: err.message }));
      throw err;
    } finally {
      setSpellApplying(false);
    }
  }

  async function fetchSpellSuggestions(word) {
    if (!adminToken) return [];
    const result = await api(`/api/projects/${projectId}/spellcheck/suggest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ word }),
    });
    return result.candidates || [];
  }

  function isContinuationBlock(block, previousBlock) {
    if (!previousBlock) return false;
    const speaker = blockSpeakerName(block);
    const previousSpeaker = blockSpeakerName(previousBlock);
    if (speaker && speaker === previousSpeaker) return true;
    return (
      !speaker &&
      Boolean(previousSpeaker) &&
      block.blockType === "narration" &&
      /class=["'][^"']*\bmessage\b[^"']*\bgeneral\b/i.test(block.rawHtml || "") &&
      !/\bdesc\b/i.test(block.rawHtml || "")
    );
  }

  function lastSpeakerBefore(index) {
    for (let i = index - 1; i >= 0; i -= 1) {
      const previous = blocks[i];
      const speaker = blockSpeakerName(previous);
      if (speaker) return speaker;
      if (previous?.blockType === "handout" || /\bdesc\b/i.test(previous?.rawHtml || "")) return null;
    }
    return null;
  }

  function isContinuationAt(block, index) {
    const previousBlock = blocks[index - 1];
    if (isContinuationBlock(block, previousBlock)) return true;
    return (
      !blockSpeakerName(block) &&
      Boolean(lastSpeakerBefore(index)) &&
      block.blockType === "narration" &&
      /class=["'][^"']*\bmessage\b[^"']*\bgeneral\b/i.test(block.rawHtml || "") &&
      !/\bdesc\b/i.test(block.rawHtml || "")
    );
  }

  function continuationSpeakerAt(block, index) {
    if (blockSpeakerName(block)) return "";
    return isContinuationAt(block, index) ? lastSpeakerBefore(index) || "" : "";
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div>
          <h1>{project?.title || "로그 편집"}</h1>
          <p>
            {blocks.length.toLocaleString()} blocks · {countTextCharacters(blocks).toLocaleString()}자
          </p>
        </div>
        <div className="topbar-actions">
          {adminToken ? (
            <button type="button" className="secondary" onClick={() => setFindReplaceOpen(true)}>
              찾기/바꾸기
            </button>
          ) : null}
          {adminToken ? (
            <button type="button" className="secondary" onClick={startSpellCheck} disabled={spellCheck.status === "running"}>
              {spellCheck.status === "running" ? <Loader2 className="spin" size={14} /> : <Check size={14} />}
              맞춤법 검사
            </button>
          ) : null}
          <button className="icon-button" onClick={loadBlocks} title="새로고침">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>
      {state === "loading" ? (
        <div className="center-state">
          <Loader2 className="spin" size={24} />
        </div>
      ) : null}
      {state === "error" ? <div className="center-state error-text">{error}</div> : null}
      {state === "ready" ? (
        <section className={`log-list ${selectedBlockId ? "has-selected-block" : ""}`}>
          <div className="editor-actions-row">
            <button type="button" onClick={() => setAddAfterBlockId(null)}>
              <Plus size={14} />
              맨 앞에 추가
            </button>
            <button type="button" className="secondary" onClick={toggleTrash}>
              <Trash2 size={14} />
              휴지통
            </button>
          </div>
          {spellCheck.status === "running" ? (
            <div className="spellcheck-progress">
              검사 중 {spellCheck.total ? `${spellCheck.completed.toLocaleString()} / ${spellCheck.total.toLocaleString()}` : "준비 중"}
            </div>
          ) : null}
          {spellCheck.status === "done" && spellCheck.results.length === 0 ? (
            <div className="spellcheck-progress">맞춤법 검사 후보가 없습니다.</div>
          ) : null}
          {spellCheck.status === "error" ? <div className="spellcheck-progress error-text">{spellCheck.error}</div> : null}
          {findReplaceOpen ? (
            <FindReplaceDialog
              blocks={blocks}
              isApplying={spellApplying}
              onApply={applySpellCheckChanges}
              onClose={() => setFindReplaceOpen(false)}
            />
          ) : null}
          {spellDialogOpen ? (
            <SpellCheckDialog
              issues={spellCheck.results}
              failures={spellCheck.failures}
              blocks={blocks}
              isApplying={spellApplying}
              onApply={applySpellCheckChanges}
              onSuggest={fetchSpellSuggestions}
              onClose={() => setSpellDialogOpen(false)}
            />
          ) : null}
          {trashOpen ? (
            <aside className="trash-panel">
              <h2>휴지통</h2>
              {trashBlocks.length === 0 ? <p>삭제된 블록이 없습니다.</p> : null}
              {trashBlocks.map((block) => (
                <div className="trash-item" key={block.id}>
                  <span>{block.textContent}</span>
                  <button type="button" onClick={() => restoreBlock(block.id)}>
                    <RotateCcw size={14} />
                    복구
                  </button>
                </div>
              ))}
            </aside>
          ) : null}
          {addAfterBlockId === null ? (
            <AddBlockForm onSubmit={(input) => createBlock(null, input)} onCancel={() => setAddAfterBlockId(undefined)} />
          ) : null}
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              <Block
                block={block}
                token={token}
                settings={settings}
                onUpdated={updateBlock}
                onAddAfter={setAddAfterBlockId}
                onDeleted={deleteBlock}
                onReverted={updateBlock}
                isSelected={selectedBlockId === block.id}
                actionsVisible={selectedBlockId ? selectedBlockId === block.id : hoveredBlockId === block.id}
                onSelected={selectBlock}
                onHoverStart={hoverBlock}
                onHoverEnd={unhoverBlock}
                continuationSpeakerName={continuationSpeakerAt(block, index)}
              />
              {addAfterBlockId === block.id ? (
                <AddBlockForm onSubmit={(input) => createBlock(block.id, input)} onCancel={() => setAddAfterBlockId(undefined)} />
              ) : null}
            </React.Fragment>
          ))}
        </section>
      ) : null}
    </main>
  );
}

function App() {
  const projectId = getProjectId();
  const intakeToken = getIntakeToken();
  const [token, setToken] = useState(() => window.sessionStorage.getItem(`share:${projectId}`) || "");

  function handleToken(nextToken) {
    window.sessionStorage.setItem(`share:${projectId}`, nextToken);
    setToken(nextToken);
  }

  if (isIntakePath()) {
    return <PublicUploadPage intakeToken={intakeToken} />;
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
