import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/server/index.js';
import { db } from '../src/server/db.js';
import { getOutline, computeMastery, getMastery, mergeMastery } from '../src/server/knowledge.js';
import { QUIZBANK } from '../src/server/quizbank.js';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({
        host: '127.0.0.1', port, path, method,
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let buf = '';
        res.on('data', (c) => buf += c);
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }); });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  });
}

const SELF = 1; // 自用单用户固定 id

test('quizbank 知识点与大纲完全对齐（防止改大纲漏题）', () => {
  const { outline } = getOutline();
  const keys = new Set(Object.keys(QUIZBANK));
  let total = 0, missing = [];
  for (const s in outline) for (const c in outline[s]) for (const kp of outline[s][c]) {
    total++;
    if (!keys.has(kp)) missing.push(kp);
  }
  assert.equal(missing.length, 0, '缺失题库: ' + missing.join(', '));
  for (const k of keys) assert.ok(QUIZBANK[k].length >= 2, k + ' 题量不足');
});

test('quizbank 题含合法选项与答案', () => {
  for (const k in QUIZBANK) for (const q of QUIZBANK[k]) {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, k + ' 选项异常');
    assert.match(String(q.answer), /^[A-E]$/, k + ' 答案非法');
    assert.ok(q.explanation, k + ' 缺解析');
  }
});

test('quiz/answer 缺字段返回 400（空 q 防护）', async () => {
  const r = await request('POST', '/api/quiz/answer', { correct: false });
  assert.equal(r.status, 400, '缺 subject/knowledgePoint 应拒绝');
});

test('quiz 答错写入错题本且含 options/explanation', async () => {
  const sub = '科学', kp = '人体的新陈代谢(消化/呼吸/循环)';
  const next = await request('POST', '/api/quiz/next', { subject: sub, knowledgePoint: kp });
  assert.equal(next.status, 200);
  const ans = await request('POST', '/api/quiz/answer', {
    subject: sub, knowledgePoint: kp, correct: false, difficulty: 2,
    question: next.body.question, answer: next.body.answer,
    options: next.body.options, explanation: next.body.explanation
  });
  assert.equal(ans.status, 200);
  const m = db.prepare('SELECT * FROM mistakes WHERE user_id=? AND knowledge_point=?').get(SELF, kp);
  assert.ok(m, '应写入错题');
  assert.ok(m.options, '应存选项');
  assert.ok(m.explanation, '应存解析');
});

test('generateQuiz 难度参数优先选同难度题', async () => {
  const kp = '二次函数概念与图象';
  const want = 3;
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const r = await request('POST', '/api/quiz/next', { subject: '数学', knowledgePoint: kp, difficulty: want });
    seen.add(r.body.question);
  }
  const bank = QUIZBANK[kp];
  const sameDiff = bank.filter((q) => q.difficulty === want).map((q) => q.question);
  if (sameDiff.length) {
    for (const q of seen) assert.ok(sameDiff.includes(q), '应优先抽同难度题: ' + q);
  }
});

test('mergeMastery 以刷题为主，已总结未刷题点用复习掌握度填充', () => {
  const u = 99902;
  db.prepare('INSERT OR IGNORE INTO users(id,username,password) VALUES(?,?,?)').run(u, 'mm' + u, 'x');
  db.prepare('DELETE FROM quiz_records WHERE user_id=?').run(u);
  db.prepare('DELETE FROM knowledge_mastery WHERE user_id=?').run(u);
  db.prepare('INSERT INTO knowledge_mastery(user_id,subject,chapter,knowledge_point,mastery,reviews) VALUES(?,?,?,?,?,?)')
    .run(u, '语文', '九上·现代文', '学习缩写/改写', 30, 0);
  const merged = mergeMastery(u);
  assert.equal(merged['语文||学习缩写/改写'], 30, '已总结未刷题点应填充复习掌握度');
  for (let i = 0; i < 3; i++)
    db.prepare('INSERT INTO quiz_records(user_id,subject,knowledge_point,correct,difficulty) VALUES(?,?,?,?,?)')
      .run(u, '数学', '二次函数概念与图象', 1, 2);
  const merged2 = mergeMastery(u);
  assert.ok(merged2['数学||二次函数概念与图象'] >= 90, '刷题点应使用刷题掌握度');
});

test('GET /api/knowledge/tree 合并返回大纲+考法+掌握度', async () => {
  const r = await request('GET', '/api/knowledge/tree');
  assert.equal(r.status, 200);
  assert.ok(r.body.outline && r.body.examFocus && r.body.mastery, 'tree 应含 outline/examFocus/mastery');
});
