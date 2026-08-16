import express from 'express';
import { explainQuestion, generateQuiz, usingMock } from './ai.js';
import { addPoints, getBadges } from './gamify.js';
import { addMistake, getMistakes, getWeakness } from './mistakes.js';
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
  const weakness = await getWeakness(SELF_ID);
  const badges = getBadges(SELF_ID);
  res.json({ ...u, weakness, badges });
});

app.get('/api/mistakes', (req, res) => res.json(getMistakes(SELF_ID)));

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
