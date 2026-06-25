const express = require("express");
const path = require("path");
const { pool, initDb } = require("./db");
const vulns = require("./vulnerabilities");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/lessons", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM progress");
    const progMap = {}; rows.forEach(r => progMap[r.date] = r);
    const data = vulns.map((v, i) => ({
      id: i, date: v.date, name: v.name, definition: v.definition,
      theory: v.theory, cve: v.cve, exploit: v.exploit, mitigation: v.mitigation,
      quiz: v.quiz, progress: progMap[v.date] || { learned: 0, quiz_done: 0, quiz_correct: 0 }
    }));
    res.json(data);
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/learn", async (req, res) => {
  const { date, learned } = req.body;
  if (!vulns.find(v => v.date === date)) return res.status(400).json({ error: "bad date" });
  try {
    await pool.query(
      `INSERT INTO progress (date, learned, completed_at) VALUES ($1,$2,$3)
       ON CONFLICT (date) DO UPDATE SET learned=EXCLUDED.learned, completed_at=EXCLUDED.completed_at`,
      [date, learned ? 1 : 0, learned ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/quiz", async (req, res) => {
  const { date, selected } = req.body;
  const v = vulns.find(x => x.date === date);
  if (!v) return res.status(400).json({ error: "bad date" });
  const correct = selected === v.quiz.answer ? 1 : 0;
  try {
    await pool.query(
      `INSERT INTO progress (date, quiz_done, quiz_correct) VALUES ($1,1,$2)
       ON CONFLICT (date) DO UPDATE SET quiz_done=1, quiz_correct=EXCLUDED.quiz_correct`,
      [date, correct]);
    res.json({ ok: true, correct: !!correct, answer: v.quiz.answer });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("/api/scorecard", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM progress");
    const total = vulns.length;
    const learned = rows.filter(r => r.learned).length;
    const quizzes = rows.filter(r => r.quiz_done).length;
    const score = rows.reduce((s, r) => s + (r.quiz_correct || 0), 0);
    res.json({ total, learned, quizzes, score, percentage: Math.round((score/total)*100) });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initDb().then(() => app.listen(PORT, () => console.log(`🛡️  CyberLearn (PostgreSQL) on port ${PORT}`)))
  .catch(e => { console.error("DB init failed:", e); process.exit(1); });
