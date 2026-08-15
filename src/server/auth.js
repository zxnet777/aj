import jwt from 'jsonwebtoken';
import { db } from './db.js';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
// MVP 用明文密码便于演示；生产必须改用 bcrypt 哈希
export function register(username, password) {
  const info = db.prepare('INSERT INTO users (username,password) VALUES (?,?)').run(username, password);
  return { token: jwt.sign({ id: Number(info.lastInsertRowid) }, SECRET), userId: Number(info.lastInsertRowid) };
}
export function login(username, password) {
  const row = db.prepare('SELECT id,password FROM users WHERE username=?').get(username);
  if (!row || row.password !== password) throw new Error('invalid credentials');
  return { token: jwt.sign({ id: row.id }, SECRET), userId: row.id };
}
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  try { req.userId = jwt.verify(h.replace('Bearer ', ''), SECRET).id; next(); }
  catch { res.status(401).json({ error: 'unauthorized' }); }
}
