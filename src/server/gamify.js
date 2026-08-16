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
    return { streak, rewarded: false, unlockedBadges: [] };
  }
  db.prepare('INSERT INTO checkins (user_id,day) VALUES (?,?)').run(userId, today);
  const before = db.prepare('SELECT streak FROM users WHERE id=?').get(userId).streak;
  const streak = before + 1;
  db.prepare('UPDATE users SET streak=? WHERE id=?').run(streak, userId);
  const unlockedBadges = checkStreakBadges(userId, streak); // 顺手解锁连续打卡徽章
  return { streak, rewarded: true, unlockedBadges };
}

// 知识点点亮里程碑（按已点亮知识点数解锁，给孩子阶段成就感）
export const BADGE_MILESTONES = [
  { at: 10, key: 'sprout', name: '初露头角', emoji: '🌱', desc: '点亮第 10 个知识点' },
  { at: 50, key: 'half', name: '半壁江山', emoji: '🔥', desc: '点亮过半（50 个）' },
  { at: 100, key: 'master', name: '知识大师', emoji: '🏆', desc: '点亮 100 个知识点' },
  { at: 137, key: 'allstar', name: '全科点亮', emoji: '👑', desc: '137 个知识点全点亮' },
];

// 连续打卡里程碑（按连续天数解锁，帮孩子养成每日来的习惯）
export const STREAK_BADGES = [
  { at: 7, key: 'week', name: '七日打卡', emoji: '📅', desc: '连续使用 7 天' },
  { at: 30, key: 'month', name: '月度坚持', emoji: '📆', desc: '连续使用 30 天' },
];

// 全部徽章定义（前端展示用，逐项含 type 便于分组）
export const BADGE_DEFS = [
  ...BADGE_MILESTONES.map((m) => ({ ...m, type: 'knowledge' })),
  ...STREAK_BADGES.map((m) => ({ ...m, type: 'streak' })),
];

export function getBadges(userId) {
  const rows = db.prepare('SELECT badge FROM badges WHERE user_id=?').all(userId);
  return rows.map((r) => r.badge);
}

function unlock(userId, def, owned, out) {
  if (!owned.has(def.key)) {
    db.prepare('INSERT OR IGNORE INTO badges (user_id,badge) VALUES (?,?)').run(userId, def.key);
    out.push(def);
  }
}

// 根据当前已点亮数解锁应得徽章，返回本次新解锁的里程碑数组（已得过的不再重复）
export function checkMilestoneBadges(userId, lit) {
  const owned = new Set(getBadges(userId));
  const unlocked = [];
  for (const m of BADGE_MILESTONES) if (lit >= m.at) unlock(userId, m, owned, unlocked);
  return unlocked;
}

// 根据连续天数解锁打卡徽章
export function checkStreakBadges(userId, streak) {
  const owned = new Set(getBadges(userId));
  const unlocked = [];
  for (const m of STREAK_BADGES) if (streak >= m.at) unlock(userId, m, owned, unlocked);
  return unlocked;
}
