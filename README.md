# CyberLearn — Vulnerability Dojo (v2.0)

30-day advanced web exploitation track (24 Jun → 24 Jul 2026). 31 vulnerability
classes with theory, real CVEs, exploitation walkthroughs, mitigation guidance,
and a daily quiz — backed by PostgreSQL, single binary deploy.

## What's new in v2.0

This is a UI and feature upgrade on top of the existing v1 foundation. The
data model, routing, and all v1 endpoints are unchanged and fully backward
compatible — existing `progress` rows survive the upgrade untouched.

- **Redesigned UI** — moved from a matrix-rain hacker terminal look to a
  disciplined "SOC console" visual language: severity-coded lesson cards,
  a mastery ring with a radar-sweep accent, and an analytics dashboard.
- **Category + severity metadata** — every lesson is now tagged with an
  OWASP-style category (Injection, Auth & Session, Access Control, API
  Security, Supply Chain, Memory Safety, …) and a qualitative severity
  (Critical / High / Medium). See `scripts/enrich.js` for how this was
  generated from the original lesson set.
- **Search & filters** — full-text search across name/definition/CVE, plus
  category chips, severity dropdown, and bookmarked/learned/pending toggles.
- **Bookmarks** — star any lesson for later review, independent of progress.
- **Per-lesson notes** — a free-text scratchpad on each lesson, autosaved.
- **Analytics dashboard** — category mastery bars, severity coverage,
  current streak, and a "focus areas" panel that surfaces your weakest
  categories.

## Architecture

```
server.js          Express app, all API routes
db.js              PostgreSQL pool + idempotent schema migrations
vulnerabilities.js Static lesson content (31 entries) incl. category/severity
public/
  index.html       Single-page shell
  style.css        Design tokens + component styles ("SOC console" system)
  app.js           Frontend logic: filters, search, modal, analytics
scripts/
  enrich.js        One-time script that added category/severity fields
                    to vulnerabilities.js (kept for provenance/auditability)
```

No build step, no framework — same deployment model as v1.

## Database schema (v2)

`progress` keeps its original five columns and gains one:

```sql
CREATE TABLE progress (
  lesson_index INTEGER PRIMARY KEY,
  learned      INTEGER DEFAULT 0,
  quiz_done    INTEGER DEFAULT 0,
  quiz_correct INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  bookmarked   INTEGER DEFAULT 0   -- v2
);

CREATE TABLE notes (                -- v2, new table
  lesson_index INTEGER PRIMARY KEY,
  content      TEXT DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

Migrations in `db.js` use `CREATE TABLE IF NOT EXISTS` and
`ADD COLUMN IF NOT EXISTS`, so deploying v2 against an existing v1 database
is safe and non-destructive — no manual migration step required.

## API

All v1 endpoints are unchanged:

| Method | Path             | Notes                                  |
|--------|------------------|-----------------------------------------|
| GET    | `/api/today`     | Server's current date                  |
| GET    | `/api/lessons`   | All 31 lessons + progress (now incl. `category`, `severity`, `note`, `progress.bookmarked`) |
| POST   | `/api/learn`     | `{ index, learned }`                   |
| POST   | `/api/quiz`      | `{ index, selected }`                  |
| GET    | `/api/scorecard` | Aggregate totals                       |

New in v2:

| Method | Path             | Body                       | Notes                                  |
|--------|------------------|----------------------------|------------------------------------------|
| POST   | `/api/bookmark`  | `{ index, bookmarked }`    | Toggle bookmark flag                   |
| POST   | `/api/notes`     | `{ index, content }`       | Upsert free-text note                  |
| GET    | `/api/analytics` | —                          | Category mastery, severity coverage, streak, weak areas |

## Local development

```bash
cp .env.example .env   # set DATABASE_URL
npm install
npm start
```

## Deploy on Render

Push to GitHub → New → Blueprint → select repo. `render.yaml` provisions the
Postgres instance and web service automatically.
