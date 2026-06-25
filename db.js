const { Pool } = require("pg");
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" || /render\.com/.test(connectionString || "")
    ? { rejectUnauthorized: false } : false,
});
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS progress (
      date TEXT PRIMARY KEY,
      learned INTEGER DEFAULT 0,
      quiz_done INTEGER DEFAULT 0,
      quiz_correct INTEGER DEFAULT 0,
      completed_at TIMESTAMPTZ
    );`);
  console.log("✅ PostgreSQL table ready");
}
module.exports = { pool, initDb };
