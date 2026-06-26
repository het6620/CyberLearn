/**
 * auth.js — JWT middleware + helpers for CyberLearn multi-user
 */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "cyberlearn-dev-secret-change-in-prod";
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MINUTES = 60;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function generateResetToken() {
  return crypto.randomBytes(48).toString("hex");
}

function resetTokenExpiry() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
  return d;
}

/** Express middleware — requires a valid JWT in Authorization header or cookie */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7)
    : req.cookies?.cyberlearn_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired token" });
  req.user = payload;
  next();
}

/** Admin-only guard — must be used after requireAuth */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

module.exports = {
  hashPassword, verifyPassword,
  signToken, verifyToken,
  generateResetToken, resetTokenExpiry,
  requireAuth, requireAdmin,
};
