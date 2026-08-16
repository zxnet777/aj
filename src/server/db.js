import { DatabaseSync } from 'node:sqlite';
const IS_TEST = process.env.NODE_ENV === 'test' || (process.argv[1] && process.argv[1].includes('node:test'));
const DB_FILE = IS_TEST ? ':memory:' : 'app.db';
export const db = new DatabaseSync(DB_FILE);
if (DB_FILE !== ':memory:') db.exec('PRAGMA journal_mode=WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    knowledge_point TEXT,
    question TEXT,
    answer TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS quiz_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    knowledge_point TEXT,
    correct INTEGER,
    difficulty INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    day TEXT
  );
`);
