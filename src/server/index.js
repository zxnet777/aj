import express from 'express';
import { router as authRouter, authMiddleware } from './routes/auth.js';
import { explainQuestion, generateQuiz, usingMock } from './ai.js';
import { addPoints, getBadges } from './gamify.js';
import { addMistake, getMistakes, getWeakness } from './mistakes.js';
import { getOutline, computeMastery, getMastery, mergeMastery, summarize } from './knowledge.js';
import { db } from './db.js';

const app = express();
app.use(express.json());
app.use('/api', authRouter);

app.get('/api/meta', (req, res) => res.json({ mock: usingMock }));

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const r = await explainQuestion(req.body);
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quiz/next', authMiddleware, async (req, res) => {
  try { res.json(await generateQuiz(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quiz/answer', authMiddleware, async (req, res) => {
  try {
    const { userId } = req;
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

app.get('/api/progress', authMiddleware, async (req, res) => {
  const u = db.prepare('SELECT points,level,streak FROM users WHERE id=?').get(req.userId);
  const weakness = await getWeakness(req.userId);
  const badges = getBadges(req.userId);
  res.json({ ...u, weakness, badges });
});

app.get('/api/mistakes', authMiddleware, (req, res) => res.json(getMistakes(req.userId)));

app.get('/api/knowledge/outline', authMiddleware, (req, res) => {
  res.json({ ...getOutline(), mastery: mergeMastery(req.userId) });
});

app.get('/api/knowledge/mastery', authMiddleware, (req, res) => res.json(computeMastery(req.userId)));

// 合并接口：一次返回大纲+中考考法+统一掌握度，减少前端串行请求
app.get('/api/knowledge/tree', authMiddleware, (req, res) => {
  res.json({ ...getOutline(), mastery: mergeMastery(req.userId) });
});

app.post('/api/knowledge/summarize', authMiddleware, async (req, res) => {
  try {
    const { subject, chapter, knowledgePoint } = req.body;
    res.json(await summarize(req.userId, { subject, chapter, knowledgePoint }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { app };

// 仅当直接运行（node src/server/index.js）时启动监听；被测试 import 时不自动监听
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(process.env.PORT || 3001, () => console.log('server up'));
}
