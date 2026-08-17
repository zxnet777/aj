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
  CREATE TABLE IF NOT EXISTS knowledge_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    chapter TEXT,
    knowledge_point TEXT,
    mastery INTEGER DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject, chapter, knowledge_point)
  );
  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    badge TEXT,
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge)
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    knowledge_point TEXT,
    question TEXT,
    answer TEXT,
    options TEXT,
    explanation TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question)
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
// 兼容已存在的旧库：补充缺失列（新库 CREATE 已含，跳过错误）
try { db.exec('ALTER TABLE knowledge_mastery ADD COLUMN reviews INTEGER DEFAULT 0'); } catch {}
// 错题表补充选项与解析，便于错题本回显复习
try { db.exec('ALTER TABLE mistakes ADD COLUMN options TEXT'); } catch {}
try { db.exec('ALTER TABLE mistakes ADD COLUMN explanation TEXT'); } catch {}

// 自用单用户模式：确保存在一个固定的"我"(id=1)，免去登录。
// 首次启动若库中无用户则插入，后续复用，保证进度/错题/积分落在同一账号。
export function ensureUser() {
  const SELF_ID = 1;
  const exists = db.prepare('SELECT 1 FROM users WHERE id=?').get(SELF_ID);
  if (!exists) {
    db.prepare('INSERT INTO users (id,username,password) VALUES (?,?,?)')
      .run(SELF_ID, 'self', 'self');
  }
  return SELF_ID;
}
