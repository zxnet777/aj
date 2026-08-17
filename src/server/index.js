import express from 'express';
import { explainQuestion, generateQuiz, usingMock } from './ai.js';
import { addPoints, getBadges } from './gamify.js';
import { addMistake, getMistakes, getWeakness, resetUser, toggleFavorite, getFavorites, removeMistake } from './mistakes.js';
import { getOutline, computeMastery, getMastery, mergeMastery, summarize } from './knowledge.js';
import { db, ensureUser } from './db.js';

const SELF_ID = ensureUser(); // 自用单用户：固定一个"我"的账号，无需登录

const app = express();
app.use(express.json());
// 静态托管构建后的前端（npm run build 产物），iPad 直接访问同源地址即可
app.use(express.static('dist'));

app.get('/api/meta', (req, res) => res.json({ mock: usingMock }));

app.post('/api/chat', async (req, res) => {
  try {
    const r = await explainQuestion(req.body);
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quiz/next', async (req, res) => {
  try { res.json(await generateQuiz(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quiz/answer', async (req, res) => {
  try {
    const userId = SELF_ID;
    const { subject, knowledgePoint, correct, difficulty, question, answer, options, explanation } = req.body;
    if (!subject || !knowledgePoint) return res.status(400).json({ error: '缺少 subject 或 knowledgePoint' });
    db.prepare('INSERT INTO quiz_records (user_id,subject,knowledge_point,correct,difficulty) VALUES (?,?,?,?,?)')
      .run(userId, subject, knowledgePoint, correct ? 1 : 0, difficulty || 2);
    if (correct) {
      res.json(addPoints(userId, 10));
    } else {
      addMistake(userId, { subject, knowledgePoint, question, answer, options, explanation });
      const u = db.prepare('SELECT points,level FROM users WHERE id=?').get(userId);
      res.json({ points: u.points, level: u.level });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/progress', async (req, res) => {
  const u = db.prepare('SELECT points,level,streak FROM users WHERE id=?').get(SELF_ID);
  const weakness = await getWeakness(SELF_ID); // {redLight:[kp], greenLight:[kp]}
  const badges = getBadges(SELF_ID);
  // 累计答对 & 各考点正确率（供首页显示薄弱比例）
  const recs = db.prepare('SELECT knowledge_point, correct FROM quiz_records WHERE user_id=?').all(SELF_ID);
  let totalCorrect = 0;
  const rateMap = {};
  for (const r of recs) { if (r.correct) totalCorrect++; const k = r.knowledge_point; if (!rateMap[k]) rateMap[k] = { t: 0, c: 0 }; rateMap[k].t++; if (r.correct) rateMap[k].c++; }
  // 首页薄弱/已掌握与知识地图统一口径：以 computeMastery 为准（<60 红、>=60 绿）
  const weaknessList = Object.entries(mastery).filter(([, v]) => v < 60).map(([kp]) => ({ knowledgePoint: kp, correctRate: rateMap[kp] ? rateMap[kp].c / rateMap[kp].t : 0 }));
  const masteredList = Object.entries(mastery).filter(([, v]) => v >= 60).map(([kp]) => ({ knowledgePoint: kp }));
  // 已掌握考点数 = 点亮（mastery>=60）的数量
  const mastery = computeMastery(SELF_ID);
  const litCount = Object.values(mastery).filter((v) => v >= 60).length;
  // 近 7 天打卡标记（checkins.day 存打卡日期 TEXT，如 2026-08-15）
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const checkinRows = db.prepare('SELECT day FROM checkins WHERE user_id=?').all(SELF_ID).map((x) => x.day);
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); days.push(checkinRows.includes(key)); }
  res.json({
    points: u.points, level: u.level, streak: u.streak || 0, total: litCount, totalCorrect,
    last7: days, badges,
    stats: { weakness: weaknessList, mastered: masteredList },
  });
});

app.get('/api/mistakes', (req, res) => res.json(getMistakes(SELF_ID)));
app.post('/api/favorites', (req, res) => {
  try {
    const r = toggleFavorite(SELF_ID, {
      subject: req.body.subject, knowledgePoint: req.body.knowledgePoint, question: req.body.question,
      answer: req.body.answer, options: req.body.options, explanation: req.body.explanation,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/favorites', (req, res) => res.json(getFavorites(SELF_ID)));
// 错题重练答对后移出错题本（按 用户+科目+考点 清除）
app.post('/api/mistakes/remove', (req, res) => {
  try { res.json(removeMistake(SELF_ID, { subject: req.body.subject, knowledgePoint: req.body.knowledgePoint })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// 重置：清空当前用户全部使用数据，回到初始阶段（保留账号）
app.post('/api/reset', (req, res) => {
  try {
    resetUser(SELF_ID);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/knowledge/outline', (req, res) => {
  res.json({ ...getOutline(), mastery: mergeMastery(SELF_ID) });
});

app.get('/api/knowledge/mastery', (req, res) => res.json(computeMastery(SELF_ID)));

// 合并接口：一次返回大纲+中考考法+统一掌握度，减少前端串行请求
app.get('/api/knowledge/tree', (req, res) => {
  res.json({ ...getOutline(), mastery: mergeMastery(SELF_ID) });
});

app.post('/api/knowledge/summarize', async (req, res) => {
  try {
    const { subject, chapter, knowledgePoint } = req.body;
    res.json(await summarize(SELF_ID, { subject, chapter, knowledgePoint }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { app };

// 仅当直接运行（node src/server/index.js）时启动监听；被测试 import 时不自动监听
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import net from 'node:net';
if (resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const PORT = Number(process.env.PORT) || 3001;
  // 仅供本机访问：监听 127.0.0.1，比 0.0.0.0 更安全
  const probe = net.createServer();
  probe.once('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[启动失败] 端口 ${PORT} 已被占用。请先停止旧服务（双击 stop.bat 或结束 node 进程）再启动。`);
      process.exit(1);
    }
    throw e;
  });
  probe.once('listening', () => {
    probe.close(() => {
      app.listen(PORT, '127.0.0.1', () => console.log('server up on http://127.0.0.1:' + PORT));
    });
  });
  probe.listen(PORT, '127.0.0.1');
}
