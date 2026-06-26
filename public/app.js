/* ═══════════════════════════════════════════════════════
   CyberLearn v3 — Multi-User Frontend
   ═══════════════════════════════════════════════════════ */

let CURRENT_USER = null;
let TOKEN = localStorage.getItem("cl_token") || null;

/* ── Auth helpers ──────────────────────────────────────── */
function authHeaders() {
  return TOKEN ? { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` }
               : { "Content-Type": "application/json" };
}

async function apiFetch(url, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(url, opts);
  if (res.status === 401) { doLogout(); return null; }
  return res;
}

function showAuthGate() {
  document.getElementById("authGate").style.display = "";
  document.getElementById("appShell").style.display = "none";
}

function showApp() {
  document.getElementById("authGate").style.display = "none";
  document.getElementById("appShell").style.display = "";
}

function setAuthError(id, msg) { document.getElementById(id).textContent = msg; }
function clearAuthError(id) { document.getElementById(id).textContent = ""; }

/* ── Auth tab switching ─────────────────────────────────── */
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel" + capitalize(tab.dataset.tab)).classList.add("active");
  };
});

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ── Register ───────────────────────────────────────────── */
document.getElementById("registerBtn").onclick = async () => {
  clearAuthError("registerErr");
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;
  if (!username || !email || !password) return setAuthError("registerErr", "All fields required.");
  if (password !== password2) return setAuthError("registerErr", "Passwords do not match.");
  const res = await fetch("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) return setAuthError("registerErr", data.error || "Registration failed.");
  TOKEN = data.token;
  localStorage.setItem("cl_token", TOKEN);
  CURRENT_USER = data.user;
  onAuthSuccess();
};

/* ── Login ──────────────────────────────────────────────── */
document.getElementById("loginBtn").onclick = async () => {
  clearAuthError("loginErr");
  const login = document.getElementById("loginLogin").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!login || !password) return setAuthError("loginErr", "Both fields required.");
  const res = await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json();
  if (!res.ok) return setAuthError("loginErr", data.error || "Login failed.");
  TOKEN = data.token;
  localStorage.setItem("cl_token", TOKEN);
  CURRENT_USER = data.user;
  onAuthSuccess();
};

// Enter key support on auth forms
["loginLogin","loginPassword"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("loginBtn").click(); });
});

/* ── Forgot password ────────────────────────────────────── */
document.getElementById("forgotBtn").onclick = async () => {
  clearAuthError("forgotErr");
  document.getElementById("forgotOk").textContent = "";
  const email = document.getElementById("forgotEmail").value.trim();
  if (!email) return setAuthError("forgotErr", "Email required.");
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  document.getElementById("forgotOk").textContent = data.message || "Check your email.";
  // Dev mode: show token and reveal step 2
  if (data.dev_token) {
    document.getElementById("resetToken").value = data.dev_token;
    document.getElementById("forgotStep1").style.display = "none";
    document.getElementById("forgotStep2").style.display = "";
    document.getElementById("forgotOk").textContent =
      "⚠️ DEV MODE: Token auto-filled. Enter your new password below.";
  }
};

document.getElementById("resetBtn").onclick = async () => {
  clearAuthError("resetErr");
  document.getElementById("resetOk").textContent = "";
  const token = document.getElementById("resetToken").value.trim();
  const password = document.getElementById("resetPassword").value;
  const password2 = document.getElementById("resetPassword2").value;
  if (!token || !password) return setAuthError("resetErr", "All fields required.");
  if (password !== password2) return setAuthError("resetErr", "Passwords do not match.");
  const res = await fetch("/api/auth/reset-password", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) return setAuthError("resetErr", data.error || "Reset failed.");
  document.getElementById("resetOk").textContent = "✅ " + data.message;
  setTimeout(() => {
    document.querySelector('[data-tab="login"]').click();
  }, 2000);
};

/* ── Logout ─────────────────────────────────────────────── */
function doLogout() {
  TOKEN = null; CURRENT_USER = null;
  localStorage.removeItem("cl_token");
  fetch("/api/auth/logout", { method: "POST" });
  showAuthGate();
}
document.getElementById("logoutBtn").onclick = doLogout;

/* ── Auth success → boot app ────────────────────────────── */
function onAuthSuccess() {
  showApp();
  updateUserChip();
  load();
}

function updateUserChip() {
  if (!CURRENT_USER) return;
  document.getElementById("userChipName").textContent = CURRENT_USER.username;
  const roleBadge = document.getElementById("userChipRole");
  roleBadge.textContent = CURRENT_USER.role === "admin" ? "admin" : "";
  roleBadge.style.display = CURRENT_USER.role === "admin" ? "" : "none";
  document.getElementById("userDropdownInfo").innerHTML =
    `<div class="dropdown-user"><strong>${CURRENT_USER.username}</strong><span>${CURRENT_USER.email}</span></div>`;
  document.getElementById("adminPanelBtn").style.display =
    CURRENT_USER.role === "admin" ? "" : "none";
}

/* ── User menu dropdown ─────────────────────────────────── */
const userChipBtn = document.getElementById("userChipBtn");
const userDropdown = document.getElementById("userDropdown");
userChipBtn.onclick = (e) => {
  e.stopPropagation();
  userDropdown.style.display = userDropdown.style.display === "none" ? "" : "none";
};
document.addEventListener("click", () => { userDropdown.style.display = "none"; });

/* ── Change password modal ──────────────────────────────── */
const cpModal = document.getElementById("cpModal");
document.getElementById("changePasswordBtn").onclick = () => {
  userDropdown.style.display = "none";
  document.getElementById("cpCurrent").value = "";
  document.getElementById("cpNew").value = "";
  document.getElementById("cpNew2").value = "";
  clearAuthError("cpErr");
  document.getElementById("cpOk").textContent = "";
  cpModal.classList.add("open");
};
document.getElementById("cpClose").onclick = () => cpModal.classList.remove("open");
cpModal.onclick = e => { if (e.target === cpModal) cpModal.classList.remove("open"); };

document.getElementById("cpSaveBtn").onclick = async () => {
  clearAuthError("cpErr");
  document.getElementById("cpOk").textContent = "";
  const current_password = document.getElementById("cpCurrent").value;
  const new_password = document.getElementById("cpNew").value;
  const new_password2 = document.getElementById("cpNew2").value;
  if (!current_password || !new_password) return setAuthError("cpErr", "All fields required.");
  if (new_password !== new_password2) return setAuthError("cpErr", "New passwords do not match.");
  const res = await apiFetch("/api/auth/change-password", {
    method: "POST", body: JSON.stringify({ current_password, new_password }),
  });
  if (!res) return;
  const data = await res.json();
  if (!res.ok) return setAuthError("cpErr", data.error || "Failed.");
  document.getElementById("cpOk").textContent = "✅ " + data.message;
  setTimeout(() => cpModal.classList.remove("open"), 1800);
};

/* ── Admin panel modal ──────────────────────────────────── */
const adminModal = document.getElementById("adminModal");
document.getElementById("adminPanelBtn").onclick = async () => {
  userDropdown.style.display = "none";
  adminModal.classList.add("open");
  await loadAdminUsers();
};
document.getElementById("adminClose").onclick = () => adminModal.classList.remove("open");
adminModal.onclick = e => { if (e.target === adminModal) adminModal.classList.remove("open"); };

document.getElementById("adminNewUserBtn").onclick = () => {
  const form = document.getElementById("adminNewUserForm");
  form.style.display = form.style.display === "none" ? "" : "none";
};
document.getElementById("anCancelBtn").onclick = () => {
  document.getElementById("adminNewUserForm").style.display = "none";
};

document.getElementById("anSaveBtn").onclick = async () => {
  clearAuthError("anErr");
  const username = document.getElementById("anUsername").value.trim();
  const email = document.getElementById("anEmail").value.trim();
  const password = document.getElementById("anPassword").value;
  if (!username || !email || !password) return setAuthError("anErr", "All fields required.");
  const res = await apiFetch("/api/admin/users", {
    method: "POST", body: JSON.stringify({ username, email, password }),
  });
  if (!res) return;
  const data = await res.json();
  if (!res.ok) return setAuthError("anErr", data.error || "Failed.");
  document.getElementById("adminNewUserForm").style.display = "none";
  document.getElementById("anUsername").value = "";
  document.getElementById("anEmail").value = "";
  document.getElementById("anPassword").value = "";
  await loadAdminUsers();
};

async function loadAdminUsers() {
  const res = await apiFetch("/api/admin/users");
  if (!res) return;
  const data = await res.json();
  const list = document.getElementById("adminUserList");
  list.innerHTML = data.users.map(u => `
    <div class="admin-user-row" data-id="${u.id}">
      <div class="admin-user-info">
        <strong>${escapeHtml(u.username)}</strong>
        <span>${escapeHtml(u.email)}</span>
        <span class="role-badge ${u.role}">${u.role}</span>
      </div>
      <div class="admin-user-actions">
        <button class="admin-action-btn" onclick="adminResetPw(${u.id}, '${escapeHtml(u.username)}')">🔑 Reset PW</button>
        ${u.id !== CURRENT_USER?.id ? `<button class="admin-action-btn danger" onclick="adminDeleteUser(${u.id}, '${escapeHtml(u.username)}')">✕ Delete</button>` : ""}
      </div>
    </div>
  `).join("");
}

window.adminResetPw = async (userId, username) => {
  const pw = prompt(`Set new password for "${username}" (min 8 chars):`);
  if (!pw) return;
  if (pw.length < 8) return alert("Password must be at least 8 characters.");
  const res = await apiFetch(`/api/admin/users/${userId}`, {
    method: "PATCH", body: JSON.stringify({ password: pw }),
  });
  const data = await res.json();
  alert(data.ok ? `✅ Password reset for ${username}` : data.error);
};

window.adminDeleteUser = async (userId, username) => {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
  const res = await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  const data = await res.json();
  if (data.ok) await loadAdminUsers();
  else alert(data.error);
};

/* ── Bootstrap: check existing token ───────────────────── */
async function checkExistingAuth() {
  if (!TOKEN) return showAuthGate();
  const res = await fetch("/api/auth/me", { headers: authHeaders() });
  if (!res.ok) { TOKEN = null; localStorage.removeItem("cl_token"); return showAuthGate(); }
  const data = await res.json();
  CURRENT_USER = data.user;
  onAuthSuccess();
}

/* ═══════════════════════════════════════════════════════
   App logic (unchanged from v2, fetch calls updated)
   ═══════════════════════════════════════════════════════ */

let TODAY = "";
let LESSONS = [];
let ANALYTICS = null;

const state = {
  search: "",
  category: null,
  severity: "",
  bookmarkedOnly: false,
  doneOnly: false,
  pendingOnly: false,
};

const grid = document.getElementById("lessonGrid");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const emptyState = document.getElementById("emptyState");

/* ── Theme toggle ───────────────────────────────────────── */
const themeBtn = document.getElementById("themeToggle");
const iconMoon = document.getElementById("iconMoon");
const iconSun = document.getElementById("iconSun");
function applyTheme(light) {
  document.body.classList.toggle("light", light);
  iconMoon.style.display = light ? "none" : "";
  iconSun.style.display = light ? "" : "none";
}
applyTheme(localStorage.theme === "light");
themeBtn.onclick = () => {
  const light = !document.body.classList.contains("light");
  applyTheme(light);
  localStorage.theme = light ? "light" : "dark";
};

/* ── Data loading ───────────────────────────────────────── */
async function load() {
  const t = await (await apiFetch("/api/today")).json();
  TODAY = t.today;
  const lr = await apiFetch("/api/lessons");
  LESSONS = await lr.json();
  buildCategoryFilters();
  render();
  await refreshAnalytics();
}

function fmt(d) { const [y, m, dd] = d.split("-"); return `${dd}-${m}-${y}`; }

function isUnlocked(index) {
  if (LESSONS[index].date <= TODAY) return true;
  if (index === 0) return true;
  return !!LESSONS[index - 1].progress.learned;
}

/* ── Filters ────────────────────────────────────────────── */
function buildCategoryFilters() {
  const cats = [...new Set(LESSONS.map(l => l.category))].sort();
  const wrap = document.getElementById("categoryFilters");
  wrap.innerHTML = `<button type="button" class="cat-chip" data-active="true" data-cat="">All categories</button>` +
    cats.map(c => `<button type="button" class="cat-chip" data-active="false" data-cat="${c}">${c}</button>`).join("");
  wrap.querySelectorAll(".cat-chip").forEach(btn => {
    btn.onclick = () => {
      state.category = btn.dataset.cat || null;
      wrap.querySelectorAll(".cat-chip").forEach(b => b.dataset.active = (b === btn).toString());
      render();
    };
  });
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value.trim().toLowerCase();
  render();
});

function toggleChip(btn, key) {
  state[key] = !state[key];
  btn.dataset.active = state[key].toString();
  render();
}
const bookmarkFilterBtn = document.getElementById("filterBookmarked");
bookmarkFilterBtn.onclick = () => toggleChip(bookmarkFilterBtn, "bookmarkedOnly");
const doneFilterBtn = document.getElementById("filterDone");
doneFilterBtn.onclick = () => {
  toggleChip(doneFilterBtn, "doneOnly");
  if (state.doneOnly) { state.pendingOnly = false; pendingFilterBtn.dataset.active = "false"; }
};
const pendingFilterBtn = document.getElementById("filterPending");
pendingFilterBtn.onclick = () => {
  toggleChip(pendingFilterBtn, "pendingOnly");
  if (state.pendingOnly) { state.doneOnly = false; doneFilterBtn.dataset.active = "false"; }
};
document.getElementById("severityFilter").addEventListener("change", (e) => {
  state.severity = e.target.value;
  render();
});

function matchesFilters(l, i) {
  if (state.search) {
    const cveText = Array.isArray(l.cve) ? l.cve.join(" ") : (l.cve || "");
    const hay = [l.name, l.category, l.definition, cveText].join(" ").toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  if (state.category && l.category !== state.category) return false;
  if (state.severity && l.severity !== state.severity) return false;
  if (state.bookmarkedOnly && !l.progress.bookmarked) return false;
  if (state.doneOnly && !l.progress.learned) return false;
  if (state.pendingOnly && l.progress.learned) return false;
  return true;
}

/* ── Render grid ────────────────────────────────────────── */
const SEV_COLOR = { Critical: "var(--sev-critical)", High: "var(--sev-high)", Medium: "var(--sev-medium)" };

function sevColor(s) { return SEV_COLOR[s] || "var(--muted)"; }
function sevRank(s) { return s === "Critical" ? 0 : s === "High" ? 1 : 2; }

function bookmarkIconSvg(on) {
  return on
    ? `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 3h12v18l-6-4-6 4V3Z" fill="currentColor" stroke="currentColor" stroke-width="1.4"/></svg>`
    : `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 3h12v18l-6-4-6 4V3Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
}

function render() {
  const visible = LESSONS.filter((l, i) => matchesFilters(l, i));
  emptyState.hidden = visible.length > 0;
  grid.innerHTML = visible.map((l, _) => {
    const i = LESSONS.indexOf(l);
    const unlocked = isUnlocked(i);
    const bm = l.progress.bookmarked;
    return `<div class="card ${l.progress.learned ? "learned" : ""} ${!unlocked ? "locked" : ""}" data-i="${i}">
      <div class="card-top">
        <span class="day-num">Day ${i + 1}</span>
        <span class="card-date">${fmt(l.date)}</span>
        <button class="bm-btn ${bm ? "on" : ""}" data-i="${i}" title="Bookmark" aria-label="Bookmark">
          ${bookmarkIconSvg(bm)}
        </button>
      </div>
      <h3 class="card-name">${l.name}</h3>
      <div class="card-meta">
        <span class="cat-tag">${l.category}</span>
        <span class="sev-dot" style="background:${sevColor(l.severity)}" title="${l.severity}"></span>
        <span class="sev-label" style="color:${sevColor(l.severity)}">${l.severity}</span>
      </div>
      <p class="card-def">${l.definition.slice(0, 120)}…</p>
      <div class="card-footer">
        ${l.progress.learned ? '<span class="badge done">✓ Learned</span>' : ""}
        ${l.progress.quiz_done ? `<span class="badge ${l.progress.quiz_correct ? "ok" : "fail"}">${l.progress.quiz_correct ? "✓ Quiz" : "✗ Quiz"}</span>` : ""}
        ${!unlocked ? '<span class="badge locked-badge">🔒 Locked</span>' : ""}
      </div>
    </div>`;
  }).join("");

  // Ring
  const learnedCount = LESSONS.filter(l => l.progress.learned).length;
  const pct = LESSONS.length ? Math.round((learnedCount / LESSONS.length) * 100) : 0;
  document.getElementById("ringPct").textContent = pct + "%";
  const C = 2 * Math.PI * 86;
  document.getElementById("ringFill").style.strokeDashoffset = C - (pct / 100) * C;

  // Card clicks
  grid.querySelectorAll(".card").forEach(card => {
    const i = +card.dataset.i;
    card.onclick = (e) => {
      if (e.target.closest(".bm-btn")) return;
      if (!isUnlocked(i)) return;
      openModal(i);
    };
    card.querySelector(".bm-btn").onclick = async (e) => {
      e.stopPropagation();
      const newVal = !LESSONS[i].progress.bookmarked;
      LESSONS[i].progress.bookmarked = newVal ? 1 : 0;
      await apiFetch("/api/bookmark", {
        method: "POST", body: JSON.stringify({ index: i, bookmarked: newVal }),
      });
      render();
    };
  });
}

/* ── Modal ──────────────────────────────────────────────── */
function openModal(i) {
  const l = LESSONS[i];
  const bm = l.progress.bookmarked;
  modalContent.innerHTML = `
    <button class="close-x" id="modalClose">✕</button>
    <div class="modal-head">
      <div>
        <p class="m-date">Day ${i + 1} · ${fmt(l.date)}</p>
        <h2>${l.name}</h2>
        <div class="modal-meta">
          <span class="cat-tag">${l.category}</span>
          <span class="sev-dot" style="background:${sevColor(l.severity)}"></span>
          <span style="color:${sevColor(l.severity)};font-size:.8rem;font-weight:600">${l.severity}</span>
        </div>
      </div>
      <button class="bm-btn modal-bm ${bm ? "on" : ""}" id="modalBookmarkBtn" title="Bookmark">
        ${bookmarkIconSvg(bm)}
      </button>
    </div>
    <div class="sec"><h3>Definition</h3><p>${l.definition}</p></div>
    <div class="sec"><h3>Theory & Mechanism</h3><p>${l.theory}</p></div>
    ${l.cve?.length ? `<div class="sec"><h3>Real-World CVEs</h3><p>${(Array.isArray(l.cve) ? l.cve : [l.cve]).map(c=>`<span class="cve-tag">${escapeHtml(c)}</span>`).join(" ")}</p></div>` : ""}
    <div class="sec"><h3>Exploitation</h3><pre>${escapeHtml(l.exploit)}</pre></div>
    <div class="sec"><h3>Mitigation</h3><p>${l.mitigation}</p></div>
    <div class="quiz-box">
      <h3>Knowledge Check</h3>
      <p style="font-size:.88rem;margin-bottom:10px">${l.quiz.question}</p>
      <div>${l.quiz.options.map((o,k)=>`<button class="opt" data-k="${k}">${o}</button>`).join("")}</div>
    </div>
    <div class="notes-box">
      <h3>Notes <span id="noteSavedTag">Saved</span></h3>
      <textarea id="noteTextarea" placeholder="Write your notes here…">${escapeHtml(l.note || "")}</textarea>
    </div>
    <div class="learn-row">
      <input type="checkbox" class="chk" id="learnChk" ${l.progress.learned ? "checked" : ""}/>
      <label for="learnChk">Mark as Learned</label>
    </div>`;

  modal.classList.add("open");
  document.getElementById("modalClose").onclick = closeModal;

  const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");
  modalBookmarkBtn.onclick = async () => {
    const newVal = !l.progress.bookmarked;
    l.progress.bookmarked = newVal ? 1 : 0;
    modalBookmarkBtn.dataset.on = newVal.toString();
    modalBookmarkBtn.innerHTML = bookmarkIconSvg(newVal);
    await apiFetch("/api/bookmark", {
      method: "POST", body: JSON.stringify({ index: i, bookmarked: newVal }),
    });
    render();
  };

  const quizDone = l.progress.quiz_done;
  modalContent.querySelectorAll(".opt").forEach(btn => {
    if (quizDone) btn.disabled = true;
    btn.onclick = async () => {
      const sel = +btn.dataset.k;
      const res = await apiFetch("/api/quiz", {
        method: "POST", body: JSON.stringify({ index: i, selected: sel }),
      });
      const r = await res.json();
      modalContent.querySelectorAll(".opt").forEach((b, k) => {
        b.disabled = true;
        if (k === r.answer) b.classList.add("correct");
        if (k === sel && !r.correct) b.classList.add("wrong");
      });
      l.progress.quiz_done = 1; l.progress.quiz_correct = r.correct ? 1 : 0;
      await refreshAnalytics();
    };
  });

  const noteArea = document.getElementById("noteTextarea");
  const savedTag = document.getElementById("noteSavedTag");
  let noteTimer = null;
  noteArea.addEventListener("input", () => {
    savedTag.classList.remove("show");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      const content = noteArea.value;
      await apiFetch("/api/notes", {
        method: "POST", body: JSON.stringify({ index: i, content }),
      });
      l.note = content;
      savedTag.classList.add("show");
      setTimeout(() => savedTag.classList.remove("show"), 1600);
    }, 600);
  });

  document.getElementById("learnChk").onchange = async (e) => {
    await apiFetch("/api/learn", {
      method: "POST", body: JSON.stringify({ index: i, learned: e.target.checked }),
    });
    l.progress.learned = e.target.checked ? 1 : 0;
    render();
    await refreshAnalytics();
  };
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function closeModal() { modal.classList.remove("open"); }
modal.onclick = e => { if (e.target === modal) closeModal(); };
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); cpModal.classList.remove("open"); adminModal.classList.remove("open"); } });

/* ── Analytics ──────────────────────────────────────────── */
async function refreshAnalytics() {
  const [scoreRes, analyticsRes] = await Promise.all([
    apiFetch("/api/scorecard"),
    apiFetch("/api/analytics"),
  ]);
  if (!scoreRes || !analyticsRes) return;
  const [score, analytics] = await Promise.all([scoreRes.json(), analyticsRes.json()]);
  ANALYTICS = analytics;

  document.getElementById("scoreStats").innerHTML = `
    <div class="stat"><div class="num">${score.learned}/${score.total}</div><div class="lbl">Vulns Learned</div></div>
    <div class="stat"><div class="num">${score.quizzes}/${score.total}</div><div class="lbl">Quizzes Taken</div></div>
    <div class="stat"><div class="num">${score.score}/${score.total}</div><div class="lbl">Correct Answers</div></div>
    <div class="stat"><div class="num">${score.percentage}%</div><div class="lbl">Mastery Score</div></div>`;

  document.getElementById("categoryBars").innerHTML = analytics.categories.map(c => `
    <div class="bar-row">
      <div class="bar-row-top"><span class="name">${c.category}</span><span class="pct">${c.learned}/${c.total}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${c.masteryPct}%; background:var(--accent)"></div></div>
    </div>`).join("");

  document.getElementById("severityBars").innerHTML = analytics.severities
    .sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
    .map(s => `
      <div class="bar-row">
        <div class="bar-row-top"><span class="name">${s.severity}</span><span class="pct">${s.learned}/${s.total}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${s.masteryPct}%; background:${sevColor(s.severity)}"></div></div>
      </div>`).join("");

  const weakList = document.getElementById("weakAreasList");
  if (!analytics.weakAreas.length) {
    weakList.innerHTML = `<p class="weak-empty">No standout weak areas yet — keep going.</p>`;
  } else {
    weakList.innerHTML = analytics.weakAreas.map(w => `
      <div class="weak-item">
        <div><div class="name">${w.category}</div><div class="meta">${w.learned}/${w.total} lessons learned</div></div>
        <span class="pct">${w.masteryPct}%</span>
      </div>`).join("");
  }

  document.getElementById("streakNum").textContent = analytics.streak;
}

/* ── Init ───────────────────────────────────────────────── */
checkExistingAuth();