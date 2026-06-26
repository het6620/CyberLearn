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

app.get("/api/lessons", async (req, res) => {
  try {
    const vulns = getVulns();
    const { rows } = await pool.query("SELECT * FROM progress");
    const progMap = {}; rows.forEach(r => progMap[r.lesson_index] = r);
    const data = vulns.map((v, i) => ({
      id: i, date: v.date, name: v.name, definition: v.definition,
      theory: v.theory, cve: v.cve, exploit: v.exploit, mitigation: v.mitigation,
      quiz: v.quiz, progress: progMap[i] || { learned: 0, quiz_done: 0, quiz_correct: 0 }
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

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initDb().then(() => app.listen(PORT, () => console.log(`🛡️  CyberLearn (PostgreSQL) on port ${PORT}`)))
  .catch(e => { console.error("DB init failed:", e); process.exit(1); });
