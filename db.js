const { Pool } = require("pg");
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" || /render\.com/.test(connectionString || "")
    ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  // ── v1 ──────────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      lesson_index INTEGER PRIMARY KEY,
      learned      INTEGER DEFAULT 0,
      quiz_done    INTEGER DEFAULT 0,
      quiz_correct INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ
    );`);

  await pool.query(`
    ALTER TABLE progress
      ADD COLUMN IF NOT EXISTS bookmarked INTEGER DEFAULT 0;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      lesson_index INTEGER PRIMARY KEY,
      content      TEXT DEFAULT '',
      updated_at   TIMESTAMPTZ DEFAULT now()
    );`);

  // ── v3: multi-user ───────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(64) UNIQUE NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          VARCHAR(16) DEFAULT 'user',
      created_at    TIMESTAMPTZ DEFAULT now(),
      last_login    TIMESTAMPTZ
    );`);

  // Per-user progress (replaces the global progress table for new users)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_index INTEGER NOT NULL,
      learned      INTEGER DEFAULT 0,
      quiz_done    INTEGER DEFAULT 0,
      quiz_correct INTEGER DEFAULT 0,
      bookmarked   INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ,
      PRIMARY KEY (user_id, lesson_index)
    );`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notes (
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_index INTEGER NOT NULL,
      content      TEXT DEFAULT '',
      updated_at   TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, lesson_index)
    );`);

  // Password reset tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(128) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );`);

  console.log("✅ PostgreSQL schema ready (v3 — multi-user)");
}

module.exports = { pool, initDb };
