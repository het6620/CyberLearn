const express = require("express");
const path = require("path");
const { pool, initDb } = require("./db");
const vulnDefs = require("./vulnerabilities");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/** Return today's date as YYYY-MM-DD in the server's local timezone */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Assign dates dynamically: Day 1 = today, Day 2 = today+1, …
 * The vulnerability content stays static; only the date label is computed at runtime.
 */
function getVulns() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return vulnDefs.map((v, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return { ...v, date: dateStr };
  });
}

/** Expose today's date to the frontend so it never needs to hardcode it */
app.get("/api/today", (req, res) => {
  res.json({ today: todayStr() });
});

// ── v1 endpoints (unchanged behavior) ──────────────────────────────

app.get("/api/lessons", async (req, res) => {
  try {
    const vulns = getVulns();
    const { rows } = await pool.query("SELECT * FROM progress");
    const progMap = {}; rows.forEach(r => progMap[r.lesson_index] = r);
    const { rows: noteRows } = await pool.query("SELECT * FROM notes");
    const noteMap = {}; noteRows.forEach(r => noteMap[r.lesson_index] = r.content);
    const data = vulns.map((v, i) => ({
      id: i, date: v.date, name: v.name, category: v.category, severity: v.severity,
      definition: v.definition, theory: v.theory, cve: v.cve, exploit: v.exploit,
      mitigation: v.mitigation, quiz: v.quiz,
      note: noteMap[i] || "",
      progress: progMap[i]
        ? { ...progMap[i], bookmarked: progMap[i].bookmarked || 0 }
        : { learned: 0, quiz_done: 0, quiz_correct: 0, bookmarked: 0 }
    }));
    res.json(data);
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/learn", async (req, res) => {
  const { index, learned } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO progress (lesson_index, learned, completed_at) VALUES ($1,$2,$3)
       ON CONFLICT (lesson_index) DO UPDATE SET learned=EXCLUDED.learned, completed_at=EXCLUDED.completed_at`,
      [index, learned ? 1 : 0, learned ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/quiz", async (req, res) => {
  const { index, selected } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  const v = vulns[index];
  const correct = selected === v.quiz.answer ? 1 : 0;
  try {
    await pool.query(
      `INSERT INTO progress (lesson_index, quiz_done, quiz_correct) VALUES ($1,1,$2)
       ON CONFLICT (lesson_index) DO UPDATE SET quiz_done=1, quiz_correct=EXCLUDED.quiz_correct`,
      [index, correct]);
    res.json({ ok: true, correct: !!correct, answer: v.quiz.answer });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("/api/scorecard", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM progress");
    const total = vulnDefs.length;
    const learned = rows.filter(r => r.learned).length;
    const quizzes = rows.filter(r => r.quiz_done).length;
    const score = rows.reduce((s, r) => s + (r.quiz_correct || 0), 0);
    res.json({ total, learned, quizzes, score, percentage: Math.round((score/total)*100) });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

// ── v2 endpoints ────────────────────────────────────────────────────

/** Toggle/set the bookmark flag for a lesson. */
app.post("/api/bookmark", async (req, res) => {
  const { index, bookmarked } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO progress (lesson_index, bookmarked) VALUES ($1,$2)
       ON CONFLICT (lesson_index) DO UPDATE SET bookmarked=EXCLUDED.bookmarked`,
      [index, bookmarked ? 1 : 0]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** Save (upsert) a free-text note for a lesson. Empty content clears it but keeps the row. */
app.post("/api/notes", async (req, res) => {
  const { index, content } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO notes (lesson_index, content, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (lesson_index) DO UPDATE SET content=EXCLUDED.content, updated_at=now()`,
      [index, content || ""]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/**
 * Analytics: category-level mastery breakdown + current streak.
 * Streak = consecutive most-recent days (by completed_at date) with at
 * least one lesson marked learned, counting back from today.
 */
app.get("/api/analytics", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM progress");
    const progMap = {}; rows.forEach(r => progMap[r.lesson_index] = r);

    // Category breakdown
    const byCategory = {};
    vulnDefs.forEach((v, i) => {
      const cat = v.category || "Uncategorized";
      if (!byCategory[cat]) byCategory[cat] = { total: 0, learned: 0, quizCorrect: 0, quizDone: 0 };
      byCategory[cat].total++;
      const p = progMap[i];
      if (p && p.learned) byCategory[cat].learned++;
      if (p && p.quiz_done) byCategory[cat].quizDone++;
      if (p && p.quiz_correct) byCategory[cat].quizCorrect++;
    });
    const categories = Object.entries(byCategory).map(([category, c]) => ({
      category,
      total: c.total,
      learned: c.learned,
      masteryPct: Math.round((c.learned / c.total) * 100),
      quizAccuracyPct: c.quizDone ? Math.round((c.quizCorrect / c.quizDone) * 100) : null,
    })).sort((a, b) => b.total - a.total);

    // Severity breakdown (how much of each severity tier is cleared)
    const bySeverity = {};
    vulnDefs.forEach((v, i) => {
      const sev = v.severity || "Unknown";
      if (!bySeverity[sev]) bySeverity[sev] = { total: 0, learned: 0 };
      bySeverity[sev].total++;
      if (progMap[i] && progMap[i].learned) bySeverity[sev].learned++;
    });
    const severities = Object.entries(bySeverity).map(([severity, s]) => ({
      severity, total: s.total, learned: s.learned,
      masteryPct: Math.round((s.learned / s.total) * 100),
    }));

    // Streak: count back consecutive calendar days with >=1 completion
    const completedDates = new Set(
      rows.filter(r => r.learned && r.completed_at)
        .map(r => new Date(r.completed_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (completedDates.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    // Weak areas: categories below 50% mastery with at least one attempt
    const weakAreas = categories.filter(c => c.masteryPct < 50 && c.learned > 0)
      .concat(categories.filter(c => c.masteryPct === 0))
      .filter((c, i, arr) => arr.findIndex(x => x.category === c.category) === i)
      .sort((a, b) => a.masteryPct - b.masteryPct)
      .slice(0, 3);

    res.json({ categories, severities, streak, weakAreas });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initDb().then(() => app.listen(PORT, () => console.log(`🛡️  CyberLearn v2 (PostgreSQL) on port ${PORT}`)))
  .catch(e => { console.error("DB init failed:", e); process.exit(1); });
