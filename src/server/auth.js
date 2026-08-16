import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

// JWT 密钥强制从环境变量读取；缺失时启动即报错，杜绝 dev-secret 兜底泄露风险
if (!process.env.JWT_SECRET) {
  console.error('[auth] 缺少环境变量 JWT_SECRET，拒绝以默认密钥启动。请设置 JWT_SECRET 后再运行。');
  process.exit(1);
}
const SECRET = process.env.JWT_SECRET;

const KEYLEN = 64;
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
  const [salt, derived] = String(stored).split(':');
  if (!salt || !derived) return false;
  const check = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  // 定长比较，避免计时侧信道
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(derived));
}

export function register(username, password) {
  if (!username || !password) throw new Error('用户名和密码不能为空');
  if (String(password).length < 6) throw new Error('密码至少 6 位');
  try {
    const info = db
      .prepare('INSERT INTO users (username,password) VALUES (?,?)')
      .run(username, hashPassword(password));
    return { token: jwt.sign({ id: Number(info.lastInsertRowid) }, SECRET), userId: Number(info.lastInsertRowid) };
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new Error('用户名已存在');
    throw e;
  }
}
export function login(username, password) {
  const row = db.prepare('SELECT id,password FROM users WHERE username=?').get(username);
  // 兼容升级前遗留的明文密码：旧数据无 salt 前缀，强制重注册以保证安全
  if (!row || !String(row.password).includes(':')) throw new Error('账号需重新注册（密码已升级加密）');
  if (!row || !verifyPassword(password, row.password)) throw new Error('用户名或密码错误');
  return { token: jwt.sign({ id: row.id }, SECRET), userId: row.id };
}
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  try { req.userId = jwt.verify(h.replace('Bearer ', ''), SECRET).id; next(); }
  catch { res.status(401).json({ error: 'unauthorized' }); }
}
