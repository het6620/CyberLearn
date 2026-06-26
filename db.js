const { Pool } = require("pg");
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" || /render\.com/.test(connectionString || "")
    ? { rejectUnauthorized: false } : false,
});

/**
 * All migrations here are additive and idempotent:
 *  - CREATE TABLE IF NOT EXISTS never touches an existing table's data.
 *  - ALTER TABLE ... ADD COLUMN IF NOT EXISTS is safe to re-run and never
 *    drops or renames anything, so existing progress rows are preserved
 *    exactly as-is across the v1 -> v2 upgrade.
 */
async function initDb() {
  // Original v1 table — unchanged shape, still the source of truth for
  // learned/quiz state keyed by lesson_index.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      lesson_index INTEGER PRIMARY KEY,
      learned      INTEGER DEFAULT 0,
      quiz_done    INTEGER DEFAULT 0,
      quiz_correct INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ
    );`);

  // v2: bookmark flag lives alongside progress rather than a separate
  // table, since it's a 1:1 per-lesson attribute just like `learned`.
  await pool.query(`
    ALTER TABLE progress
      ADD COLUMN IF NOT EXISTS bookmarked INTEGER DEFAULT 0;`);

  // v2: free-text notes per lesson. Kept as its own table (not a column)
  // since note content is larger/optional and this keeps `progress` lean.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      lesson_index INTEGER PRIMARY KEY,
      content      TEXT DEFAULT '',
      updated_at   TIMESTAMPTZ DEFAULT now()
    );`);

  console.log("✅ PostgreSQL schema ready (v2)");
}

module.exports = { pool, initDb };
