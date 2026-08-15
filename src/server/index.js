import express from 'express';
import { router as authRouter, authMiddleware } from './routes/auth.js';
import { explainQuestion, generateQuiz } from './ai.js';
import { addPoints } from './gamify.js';
import { addMistake, getMistakes, getWeakness } from './mistakes.js';
import { db } from './db.js';

const app = express();
app.use(express.json());
app.use('/api', authRouter);

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
  const { userId } = req;
  const { subject, knowledgePoint, correct, difficulty, question, answer } = req.body;
  db.prepare('INSERT INTO quiz_records (user_id,subject,knowledge_point,correct,difficulty) VALUES (?,?,?,?,?)')
    .run(userId, subject, knowledgePoint, correct ? 1 : 0, difficulty || 2);
  if (correct) {
    res.json(addPoints(userId, 10));
  } else {
    addMistake(userId, { subject, knowledgePoint, question, answer });
    const u = db.prepare('SELECT points,level FROM users WHERE id=?').get(userId);
    res.json({ points: u.points, level: u.level });
  }
});

app.get('/api/progress', authMiddleware, async (req, res) => {
  const u = db.prepare('SELECT points,level,streak FROM users WHERE id=?').get(req.userId);
  const weakness = await getWeakness(req.userId);
  res.json({ ...u, weakness });
});

app.get('/api/mistakes', authMiddleware, (req, res) => res.json(getMistakes(req.userId)));

export { app };

// 仅当直接运行（node src/server/index.js）时启动监听；被测试 import 时不自动监听
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(process.env.PORT || 3001, () => console.log('server up'));
}
