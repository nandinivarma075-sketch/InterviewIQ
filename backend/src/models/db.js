/**
 * db.js — SQLite database via sql.js (pure WASM — no C++ build tools needed)
 *
 * sql.js keeps the DB in memory and flushes to disk via fs after every write.
 * This gives us persistent SQLite without the native compilation requirement.
 *
 * Tables:
 *   users        — registered accounts
 *   sessions     — interview sessions
 *   observations — camera analysis snapshots
 *   activity     — one qualifying row per user per calendar-day (for streaks)
 */

'use strict';

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
require('dotenv').config();

const DB_PATH = path.resolve(process.env.DB_PATH || './data/interviewiq.db');
const dir     = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// ── Singleton promise ─────────────────────────────────────────────────────────
let _db     = null;
let _saving = false;

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  // Enable foreign keys
  _db.run('PRAGMA foreign_keys = ON;');

  // ── Schema ────────────────────────────────────────────────────────────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id                    TEXT    PRIMARY KEY,
      user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role                  TEXT,
      difficulty            TEXT,
      interview_type        TEXT    DEFAULT 'mixed',
      questions_total       INTEGER DEFAULT 4,
      status                TEXT    NOT NULL DEFAULT 'in_progress',
      started_at            INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      ended_at              INTEGER,
      duration_sec          INTEGER,
      questions_asked       INTEGER DEFAULT 0,
      questions_answered    INTEGER DEFAULT 0,
      transcript            TEXT,
      score_overall         INTEGER,
      score_technical       INTEGER,
      score_problem_solving INTEGER,
      score_communication   INTEGER,
      score_adaptability    INTEGER,
      ai_summary            TEXT,
      created_at            INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_status  ON sessions(status);

    CREATE TABLE IF NOT EXISTS observations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      ts            INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      gaze          TEXT,
      posture       TEXT,
      gesture       TEXT,
      face_detected INTEGER DEFAULT 0,
      pose_detected INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_obs_session ON observations(session_id);
    CREATE INDEX IF NOT EXISTS idx_obs_ts      ON observations(ts);

    CREATE TABLE IF NOT EXISTS activity (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      event_date TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      UNIQUE(user_id, event_date)
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity(event_date);

    CREATE TABLE IF NOT EXISTS question_answers (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id          TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      question_index      INTEGER NOT NULL,           -- 0-based position in question list
      question_id         TEXT,                       -- e.g. 'q-001'
      question_text       TEXT,
      question_type       TEXT,                       -- 'technical', 'behavioral', 'problem-solving'
      question_difficulty TEXT,

      -- State machine
      state               TEXT    NOT NULL DEFAULT 'NOT_STARTED',
      -- Valid states: NOT_STARTED | PRESENTED | ANSWERING | ANSWERED |
      --               PARTIALLY_ANSWERED | SKIPPED | TIMED_OUT |
      --               INTERRUPTED | NOT_ATTEMPTED | EVALUATED | EVALUATION_FAILED

      -- Timing
      presented_at        INTEGER,                    -- epoch sec when question shown
      answer_started_at   INTEGER,                    -- epoch sec when candidate started speaking
      answer_ended_at     INTEGER,                    -- epoch sec when answer was submitted
      answer_duration_sec INTEGER,

      -- Transcript & content
      transcript_verbatim TEXT,                       -- raw speech recognition output
      transcript_readable TEXT,                       -- punctuated/formatted version
      word_count          INTEGER DEFAULT 0,
      transcript_status   TEXT    DEFAULT 'NONE',
      -- NONE | AVAILABLE | PROCESSING | FAILED | EMPTY | SILENT

      -- Rubric scores (0-100 each)
      score_technical     INTEGER,
      score_relevance     INTEGER,
      score_reasoning     INTEGER,
      score_communication INTEGER,
      score_examples      INTEGER,
      score_question      INTEGER,                    -- weighted total for this question

      -- AI analysis
      ai_feedback         TEXT,                       -- JSON blob: { summary, strengths, weaknesses, missing, improved_answer }
      evaluation_status   TEXT    DEFAULT 'PENDING',
      -- PENDING | EVALUATED | EVALUATION_FAILED | SKIPPED_UNANSWERED

      rubric_version      TEXT    DEFAULT 'v1',
      created_at          INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at          INTEGER NOT NULL DEFAULT (strftime('%s','now')),

      UNIQUE(session_id, question_index)
    );

    CREATE INDEX IF NOT EXISTS idx_qa_session   ON question_answers(session_id);
    CREATE INDEX IF NOT EXISTS idx_qa_state     ON question_answers(state);
    CREATE INDEX IF NOT EXISTS idx_qa_eval      ON question_answers(evaluation_status);
  `);


  persist(); // initial save

  // ── Safe migrations for existing databases ────────────────────────────────
  // These ALTER TABLE statements add columns that may not exist in older DBs.
  // sql.js will throw if the column already exists; we catch and ignore.
  const migrations = [
    `ALTER TABLE sessions ADD COLUMN interview_type TEXT DEFAULT 'mixed'`,
    `ALTER TABLE sessions ADD COLUMN questions_total INTEGER DEFAULT 4`,
    `ALTER TABLE sessions ADD COLUMN questions_answered INTEGER DEFAULT 0`,
    `ALTER TABLE question_answers ADD COLUMN follow_up_question TEXT`,
    `ALTER TABLE question_answers ADD COLUMN follow_up_answer TEXT`,
    `ALTER TABLE question_answers ADD COLUMN follow_up_bonus INTEGER DEFAULT 0`,
    `ALTER TABLE question_answers ADD COLUMN code_solution TEXT`,
    `ALTER TABLE question_answers ADD COLUMN code_results TEXT`,
    `ALTER TABLE sessions ADD COLUMN resume_data TEXT`,
    `ALTER TABLE users ADD COLUMN resume_data TEXT`,
  ];
  for (const m of migrations) {
    try { _db.run(m); } catch (_) { /* column already exists — ok */ }
  }

  return _db;
}

/** Flush in-memory DB to disk asynchronously (debounced) */
let _flushTimer = null;
function persist() {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    if (!_db || _saving) return;
    _saving = true;
    try {
      const data = _db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('[db] persist error:', e.message);
    } finally {
      _saving = false;
    }
  }, 200);
}

// ── Synchronous-style wrapper ─────────────────────────────────────────────────
// sql.js is synchronous after initialisation. We expose a thin wrapper that
// looks similar to better-sqlite3 for the routes.

class DbWrapper {
  constructor(db) { this._db = db; }

  /** Run a statement (INSERT / UPDATE / DELETE / CREATE) */
  run(sql, ...params) {
    this._db.run(sql, params.length ? this._flatParams(params) : undefined);
    persist();
    // Return lastInsertRowid
    const row = this._db.exec('SELECT last_insert_rowid() as lid');
    return { lastInsertRowid: row[0]?.values[0]?.[0] ?? null };
  }

  /** Return first matching row as object, or undefined */
  get(sql, ...params) {
    const res = this._db.exec(sql, params.length ? this._flatParams(params) : undefined);
    if (!res.length || !res[0].values.length) return undefined;
    return this._toObject(res[0].columns, res[0].values[0]);
  }

  /** Return all matching rows as array of objects */
  all(sql, ...params) {
    const res = this._db.exec(sql, params.length ? this._flatParams(params) : undefined);
    if (!res.length) return [];
    return res[0].values.map((row) => this._toObject(res[0].columns, row));
  }

  /** Execute a statement with no results (DDL etc.) */
  exec(sql) { this._db.run(sql); persist(); }

  /** Wrap multiple run calls in a logical group (sql.js has no real transactions needed here) */
  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN');
      try {
        fn(...args);
        this._db.run('COMMIT');
        persist();
      } catch (e) {
        this._db.run('ROLLBACK');
        throw e;
      }
    };
  }

  _flatParams(params) {
    // sql.js expects a flat array or object
    return params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  }

  _toObject(columns, values) {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = values[i]; });
    return obj;
  }
}

// ── Module export ─────────────────────────────────────────────────────────────
// We expose a proxy that lazily initialises the DB on first access.
// Routes call: db.run(), db.get(), db.all(), db.transaction()

let _wrapper = null;

async function initDb() {
  const raw = await getDb();
  _wrapper = new DbWrapper(raw);
  return _wrapper;
}

// Synchronous getter — throws if called before initDb()
function db() {
  if (!_wrapper) throw new Error('Database not initialised. Await initDb() first.');
  return _wrapper;
}

module.exports = { initDb, db };
