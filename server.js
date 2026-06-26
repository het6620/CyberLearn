const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { pool, initDb } = require("./db");
const vulnDefs = require("./vulnerabilities");
const {
  hashPassword, verifyPassword,
  signToken, generateResetToken, resetTokenExpiry,
  requireAuth, requireAdmin,
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/* ── helpers ──────────────────────────────────────────────────── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getVulns() {
  const base = new Date(); base.setHours(0,0,0,0);
  return vulnDefs.map((v, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return { ...v, date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` };
  });
}

/* ── Auth endpoints ───────────────────────────────────────────── */

/** POST /api/auth/register — create a new account */
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "username, email and password are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username))
    return res.status(400).json({ error: "Username must be 3-32 alphanumeric/underscore chars" });
  try {
    const hash = await hashPassword(password);
    // First user ever becomes admin
    const countRes = await pool.query("SELECT COUNT(*) FROM users");
    const isFirst = parseInt(countRes.rows[0].count) === 0;
    const role = isFirst ? "admin" : "user";
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id, username, email, role`,
      [username.toLowerCase(), email.toLowerCase(), hash, role]
    );
    const user = rows[0];
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.cookie("cyberlearn_token", token, COOKIE_OPTS);
    res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, role: user.role }, token });
  } catch (e) {
    if (e.code === "23505") {
      const field = e.detail?.includes("email") ? "Email" : "Username";
      return res.status(409).json({ error: `${field} already taken` });
    }
    console.error(e); res.status(500).json({ error: "db error" });
  }
});

/** POST /api/auth/login */
app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body; // login = username or email
  if (!login || !password) return res.status(400).json({ error: "login and password required" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username=$1 OR email=$1",
      [login.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });
    const user = rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    await pool.query("UPDATE users SET last_login=now() WHERE id=$1", [user.id]);
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.cookie("cyberlearn_token", token, COOKIE_OPTS);
    res.json({ ok: true, user: { id: user.id, username: user.username, email: user.email, role: user.role }, token });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** POST /api/auth/logout */
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("cyberlearn_token");
  res.json({ ok: true });
});

/** GET /api/auth/me — verify current session */
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, created_at, last_login FROM users WHERE id=$1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** POST /api/auth/forgot-password — request a reset token */
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
    // Always respond OK to avoid user enumeration
    if (!rows.length) return res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    const user = rows[0];
    const token = generateResetToken();
    const expires = resetTokenExpiry();
    // Invalidate previous tokens
    await pool.query("UPDATE reset_tokens SET used=true WHERE user_id=$1 AND used=false", [user.id]);
    await pool.query(
      "INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)",
      [user.id, token, expires]
    );
    // In production, send email. For now, return token in response (dev mode).
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
    const devMode = process.env.NODE_ENV !== "production";
    res.json({
      ok: true,
      message: "If that email exists, a reset link has been sent.",
      ...(devMode && { dev_reset_url: resetUrl, dev_token: token }),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** POST /api/auth/reset-password — consume token and set new password */
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "token and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  try {
    const { rows } = await pool.query(
      `SELECT rt.*, u.username FROM reset_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token=$1 AND rt.used=false AND rt.expires_at > now()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: "Invalid or expired reset token" });
    const rt = rows[0];
    const hash = await hashPassword(password);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, rt.user_id]);
    await pool.query("UPDATE reset_tokens SET used=true WHERE id=$1", [rt.id]);
    res.json({ ok: true, message: "Password updated successfully. You can now log in." });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** POST /api/auth/change-password — for logged-in users */
app.post("/api/auth/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: "current_password and new_password required" });
  if (new_password.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    const ok = await verifyPassword(current_password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    const hash = await hashPassword(new_password);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
    res.json({ ok: true, message: "Password changed successfully." });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/* ── Admin: user management ───────────────────────────────────── */

/** GET /api/admin/users — list all users */
app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at ASC"
    );
    res.json({ users: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** POST /api/admin/users — admin creates a user directly */
app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "username, email and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (!["user","admin"].includes(role || "user")) return res.status(400).json({ error: "role must be user or admin" });
  try {
    const hash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id, username, email, role, created_at`,
      [username.toLowerCase(), email.toLowerCase(), hash, role || "user"]
    );
    res.status(201).json({ ok: true, user: rows[0] });
  } catch (e) {
    if (e.code === "23505") {
      const field = e.detail?.includes("email") ? "Email" : "Username";
      return res.status(409).json({ error: `${field} already taken` });
    }
    console.error(e); res.status(500).json({ error: "db error" });
  }
});

/** PATCH /api/admin/users/:id — update role or reset password */
app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role, password } = req.body;
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });
  try {
    if (role) {
      if (!["user","admin"].includes(role)) return res.status(400).json({ error: "role must be user or admin" });
      await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, userId]);
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const hash = await hashPassword(password);
      await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, userId]);
    }
    const { rows } = await pool.query("SELECT id, username, email, role FROM users WHERE id=$1", [userId]);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user: rows[0] });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/** DELETE /api/admin/users/:id */
app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (userId === req.user.id) return res.status(400).json({ error: "Cannot delete your own account" });
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    if (!rowCount) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

/* ── Per-user lesson endpoints ────────────────────────────────── */

app.get("/api/today", (req, res) => res.json({ today: todayStr() }));

app.get("/api/lessons", requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const vulns = getVulns();
    const { rows } = await pool.query("SELECT * FROM user_progress WHERE user_id=$1", [uid]);
    const progMap = {}; rows.forEach(r => progMap[r.lesson_index] = r);
    const { rows: noteRows } = await pool.query("SELECT * FROM user_notes WHERE user_id=$1", [uid]);
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

app.post("/api/learn", requireAuth, async (req, res) => {
  const uid = req.user.id;
  const { index, learned } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, lesson_index, learned, completed_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, lesson_index) DO UPDATE
       SET learned=EXCLUDED.learned, completed_at=EXCLUDED.completed_at`,
      [uid, index, learned ? 1 : 0, learned ? new Date().toISOString() : null]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/quiz", requireAuth, async (req, res) => {
  const uid = req.user.id;
  const { index, selected } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  const v = vulns[index];
  const correct = selected === v.quiz.answer ? 1 : 0;
  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, lesson_index, quiz_done, quiz_correct)
       VALUES ($1,$2,1,$3)
       ON CONFLICT (user_id, lesson_index) DO UPDATE
       SET quiz_done=1, quiz_correct=EXCLUDED.quiz_correct`,
      [uid, index, correct]);
    res.json({ ok: true, correct: !!correct, answer: v.quiz.answer });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("/api/scorecard", requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const { rows } = await pool.query("SELECT * FROM user_progress WHERE user_id=$1", [uid]);
    const total = vulnDefs.length;
    const learned = rows.filter(r => r.learned).length;
    const quizzes = rows.filter(r => r.quiz_done).length;
    const score = rows.reduce((s, r) => s + (r.quiz_correct || 0), 0);
    res.json({ total, learned, quizzes, score, percentage: Math.round((score/total)*100) });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/bookmark", requireAuth, async (req, res) => {
  const uid = req.user.id;
  const { index, bookmarked } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, lesson_index, bookmarked)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, lesson_index) DO UPDATE SET bookmarked=EXCLUDED.bookmarked`,
      [uid, index, bookmarked ? 1 : 0]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.post("/api/notes", requireAuth, async (req, res) => {
  const uid = req.user.id;
  const { index, content } = req.body;
  const vulns = getVulns();
  if (index === undefined || index < 0 || index >= vulns.length)
    return res.status(400).json({ error: "bad index" });
  try {
    await pool.query(
      `INSERT INTO user_notes (user_id, lesson_index, content, updated_at)
       VALUES ($1,$2,$3,now())
       ON CONFLICT (user_id, lesson_index) DO UPDATE
       SET content=EXCLUDED.content, updated_at=now()`,
      [uid, index, content || ""]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

app.get("/api/analytics", requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const { rows } = await pool.query("SELECT * FROM user_progress WHERE user_id=$1", [uid]);
    const progMap = {}; rows.forEach(r => progMap[r.lesson_index] = r);

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
      category, total: c.total, learned: c.learned,
      masteryPct: Math.round((c.learned / c.total) * 100),
      quizAccuracyPct: c.quizDone ? Math.round((c.quizCorrect / c.quizDone) * 100) : null,
    })).sort((a, b) => b.total - a.total);

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

    const completedDates = new Set(
      rows.filter(r => r.learned && r.completed_at)
        .map(r => new Date(r.completed_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date(); cursor.setHours(0,0,0,0);
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (completedDates.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    const weakAreas = categories.filter(c => c.masteryPct < 50 && c.learned > 0)
      .concat(categories.filter(c => c.masteryPct === 0))
      .filter((c, i, arr) => arr.findIndex(x => x.category === c.category) === i)
      .sort((a, b) => a.masteryPct - b.masteryPct).slice(0, 3);

    res.json({ categories, severities, streak, weakAreas });
  } catch (e) { console.error(e); res.status(500).json({ error: "db error" }); }
});

// SPA catch-all
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initDb()
  .then(() => app.listen(PORT, () => console.log(`🛡️  CyberLearn v3 (multi-user) on port ${PORT}`)))
  .catch(e => { console.error("DB init failed:", e); process.exit(1); });
