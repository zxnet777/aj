// 徽章定义（与后端 gamify.js 的 BADGE_DEFS 保持一致，用于前端展示；是否解锁以后端为准）
export const BADGES = [
  { at: 10, key: 'sprout', name: '初露头角', emoji: '🌱', type: 'knowledge' },
  { at: 50, key: 'half', name: '半壁江山', emoji: '🔥', type: 'knowledge' },
  { at: 100, key: 'master', name: '知识大师', emoji: '🏆', type: 'knowledge' },
  { at: 137, key: 'allstar', name: '全科点亮', emoji: '👑', type: 'knowledge' },
  { at: 7, key: 'week', name: '七日打卡', emoji: '📅', type: 'streak' },
  { at: 30, key: 'month', name: '月度坚持', emoji: '📆', type: 'streak' },
];
