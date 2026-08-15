import { db } from './db.js';

export function addPoints(userId, delta) {
  const u = db.prepare('UPDATE users SET points = points + ? WHERE id=? RETURNING points').get(delta, userId);
  const level = Math.floor(u.points / 100) + 1;
  db.prepare('UPDATE users SET level=? WHERE id=?').run(level, userId);
  return { points: u.points, level };
}

export function checkIn(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const exists = db.prepare('SELECT 1 FROM checkins WHERE user_id=? AND day=?').get(userId, today);
  if (exists) {
    const streak = db.prepare('SELECT streak FROM users WHERE id=?').get(userId).streak;
    return { streak, rewarded: false };
  }
  db.prepare('INSERT INTO checkins (user_id,day) VALUES (?,?)').run(userId, today);
  const before = db.prepare('SELECT streak FROM users WHERE id=?').get(userId).streak;
  const streak = before + 1;
  db.prepare('UPDATE users SET streak=? WHERE id=?').run(streak, userId);
  return { streak, rewarded: true };
}

export function earnBadge(userId, badge) {
  // MVP: 徽章为占位实现，后续可扩展 badge 表
  return true;
}
