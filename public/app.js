let TODAY = "";
let LESSONS = [];
let ANALYTICS = null;

const state = {
  search: "",
  category: null,      // null = all
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
  const t = await (await fetch("/api/today")).json();
  TODAY = t.today;
  LESSONS = await (await fetch("/api/lessons")).json();
  buildCategoryFilters();
  render();
  await refreshAnalytics();
}

function fmt(d) { const [y, m, dd] = d.split("-"); return `${dd}-${m}-${y}`; }

/**
 * A lesson is unlocked if ANY of these is true:
 *  1. Its scheduled date <= today (already due or past)
 *  2. The previous lesson has been marked as learned (early-access chain)
 */
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
  if (state.category && l.category !== state.category) return false;
  if (state.severity && l.severity !== state.severity) return false;
  if (state.bookmarkedOnly && !l.progress.bookmarked) return false;
  if (state.doneOnly && !l.progress.learned) return false;
  if (state.pendingOnly && l.progress.learned) return false;
  if (state.search) {
    const haystack = `${l.name} ${l.definition} ${l.cve} ${l.category}`.toLowerCase();
    if (!haystack.includes(state.search)) return false;
  }
  return true;
}

/* ── Rendering ──────────────────────────────────────────── */
function bookmarkIconSvg(on) {
  return `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M6 3h12v18l-6-4-6 4V3Z" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6"/></svg>`;
}

function render() {
  grid.innerHTML = "";
  let visibleCount = 0;

  LESSONS.forEach((l, i) => {
    if (!matchesFilters(l, i)) return;
    visibleCount++;

    const locked = !isUnlocked(i);
    const done = l.progress.learned;
    const bookmarked = !!l.progress.bookmarked;
    const card = document.createElement("div");
    card.className = `card ${done ? "done" : ""} ${locked ? "locked" : ""}`;
    card.style.setProperty("--sev-color", sevColor(l.severity));

    const earlyBadge = (!locked && l.date > TODAY)
      ? `<span class="badge ok">Early Access</span>` : "";

    card.innerHTML = `
      <div class="card-top">
        <span class="card-day">DAY ${i + 1}</span>
        <button type="button" class="bookmark-btn" data-on="${bookmarked}" title="${bookmarked ? "Remove bookmark" : "Bookmark"}">${bookmarkIconSvg(bookmarked)}</button>
      </div>
      <div class="card-date">${fmt(l.date)}</div>
      <div class="card-title">${l.name}</div>
      <div class="card-def">${l.definition}</div>
      <div class="card-foot">
        <span class="badge sev-${l.severity}">${l.severity}</span>
        <span class="badge cat">${l.category}</span>
        <span class="badge ${done ? "ok" : ""}">${done ? "✓ Learned" : "○ Pending"}</span>
        ${l.progress.quiz_done ? `<span class="badge ${l.progress.quiz_correct ? "ok" : "warn"}">Quiz ${l.progress.quiz_correct ? "✓" : "✗"}</span>` : ""}
        ${earlyBadge}
        ${locked ? `<span class="badge warn">Locked</span>` : ""}
      </div>`;

    const bookmarkBtn = card.querySelector(".bookmark-btn");
    bookmarkBtn.onclick = async (e) => {
      e.stopPropagation();
      const newVal = !l.progress.bookmarked;
      l.progress.bookmarked = newVal ? 1 : 0;
      bookmarkBtn.dataset.on = newVal.toString();
      bookmarkBtn.innerHTML = bookmarkIconSvg(newVal);
      await fetch("/api/bookmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, bookmarked: newVal }) });
      if (state.bookmarkedOnly && !newVal) render();
    };

    if (!locked) card.onclick = () => openLesson(i);
    else card.onclick = () => {
      const hint = i > 0 ? `\n\nComplete Day ${i} first to unlock this early!` : "";
      alert(`Locked — unlocks on ${fmt(l.date)}${hint}`);
    };
    grid.appendChild(card);
  });

  emptyState.hidden = visibleCount > 0;

  const learned = LESSONS.filter(l => l.progress.learned).length;
  const pct = Math.round((learned / LESSONS.length) * 100);
  document.getElementById("ringPct").textContent = `${pct}%`;
  const circumference = 540;
  document.getElementById("ringFill").style.strokeDashoffset = circumference - (circumference * pct / 100);
}

function sevColor(sev) {
  if (sev === "Critical") return "var(--critical)";
  if (sev === "High") return "var(--warning)";
  return "var(--info)";
}

/* ── Lesson modal ───────────────────────────────────────── */
function openLesson(i) {
  const l = LESSONS[i];
  const isEarlyAccess = l.date > TODAY;
  const earlyBanner = isEarlyAccess
    ? `<span class="badge ok">Early Access — unlocked by completing the previous day</span>` : "";
  const bookmarked = !!l.progress.bookmarked;

  modalContent.innerHTML = `
    <button type="button" class="close-x" onclick="closeModal()">×</button>
    <div class="modal-head">
      <h2>${l.name}</h2>
      <button type="button" class="bookmark-btn" id="modalBookmarkBtn" data-on="${bookmarked}" title="Bookmark" style="margin-top:4px">${bookmarkIconSvg(bookmarked)}</button>
    </div>
    <div class="modal-meta">
      <span class="badge sev-${l.severity}">${l.severity}</span>
      <span class="badge cat">${l.category}</span>
      <span class="m-date">DAY ${i + 1} · ${fmt(l.date)}</span>
      ${earlyBanner}
    </div>
    <div class="sec"><h3>Definition</h3><p>${l.definition}</p></div>
    <div class="sec"><h3>Theory</h3><p>${l.theory}</p></div>
    <div class="sec"><h3>Example CVE</h3><span class="cve-tag">${l.cve}</span></div>
    <div class="sec"><h3>How to Exploit (Lab Use Only)</h3><pre>${l.exploit}</pre></div>
    <div class="sec"><h3>Mitigation</h3><p>${l.mitigation}</p></div>
    <div class="quiz-box">
      <h3>Daily Quiz</h3>
      <p style="margin-bottom:10px; font-size:.86rem">${l.quiz.question}</p>
      ${l.progress.quiz_done ? `<p class="quiz-result ${l.progress.quiz_correct ? "correct" : "wrong"}">${l.progress.quiz_correct ? "✓ Answered correctly" : "✗ Answered incorrectly — correct answer highlighted below"}</p>` : ""}
      <div id="opts">${l.quiz.options.map((o, k) => `<button type="button" class="opt${l.progress.quiz_done && k === l.quiz.answer ? " correct" : ""}" data-k="${k}">${String.fromCharCode(65 + k)}. ${o}</button>`).join("")}</div>
    </div>
    <div class="notes-box">
      <h3>My Notes <span id="noteSavedTag">Saved</span></h3>
      <textarea id="noteTextarea" placeholder="Jot down a memory hook, a payload variant, or a gotcha you want to remember…">${escapeHtml(l.note || "")}</textarea>
    </div>
    <div class="learn-row">
      <input type="checkbox" class="chk" id="learnChk" ${l.progress.learned ? "checked" : ""}>
      <label for="learnChk">I have learned this vulnerability today</label>
    </div>`;

  modal.classList.add("open");

  // Bookmark toggle inside modal
  const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");
  modalBookmarkBtn.onclick = async () => {
    const newVal = !l.progress.bookmarked;
    l.progress.bookmarked = newVal ? 1 : 0;
    modalBookmarkBtn.dataset.on = newVal.toString();
    modalBookmarkBtn.innerHTML = bookmarkIconSvg(newVal);
    await fetch("/api/bookmark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, bookmarked: newVal }) });
    render();
  };

  // Quiz
  const quizDone = l.progress.quiz_done;
  modalContent.querySelectorAll(".opt").forEach(btn => {
    if (quizDone) btn.disabled = true;
    btn.onclick = async () => {
      const sel = +btn.dataset.k;
      const r = await (await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, selected: sel }) })).json();
      modalContent.querySelectorAll(".opt").forEach((b, k) => { b.disabled = true; if (k === r.answer) b.classList.add("correct"); if (k === sel && !r.correct) b.classList.add("wrong"); });
      l.progress.quiz_done = 1; l.progress.quiz_correct = r.correct ? 1 : 0;
      await refreshAnalytics();
    };
  });

  // Notes — debounced autosave
  const noteArea = document.getElementById("noteTextarea");
  const savedTag = document.getElementById("noteSavedTag");
  let noteTimer = null;
  noteArea.addEventListener("input", () => {
    savedTag.classList.remove("show");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      const content = noteArea.value;
      await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, content }) });
      l.note = content;
      savedTag.classList.add("show");
      setTimeout(() => savedTag.classList.remove("show"), 1600);
    }, 600);
  });

  // Learned checkbox
  document.getElementById("learnChk").onchange = async (e) => {
    await fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index: i, learned: e.target.checked }) });
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
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

/* ── Analytics panel ────────────────────────────────────── */
async function refreshAnalytics() {
  const [score, analytics] = await Promise.all([
    (await fetch("/api/scorecard")).json(),
    (await fetch("/api/analytics")).json(),
  ]);
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
    weakList.innerHTML = `<p class="weak-empty">No standout weak areas yet — keep going and this will surface categories that need review.</p>`;
  } else {
    weakList.innerHTML = analytics.weakAreas.map(w => `
      <div class="weak-item">
        <div><div class="name">${w.category}</div><div class="meta">${w.learned}/${w.total} lessons learned</div></div>
        <span class="pct">${w.masteryPct}%</span>
      </div>`).join("");
  }

  document.getElementById("streakNum").textContent = analytics.streak;
}

function sevRank(s) { return s === "Critical" ? 0 : s === "High" ? 1 : 2; }

load();
