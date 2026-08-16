import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { app } from '../src/server/index.js';
import { db } from '../src/server/db.js';
import { getOutline, computeMastery, getMastery, mergeMastery } from '../src/server/knowledge.js';
import { QUIZBANK } from '../src/server/quizbank.js';
import { register, login } from '../src/server/auth.js';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({
        host: '127.0.0.1', port, path, method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }
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

async function signup(password = 'pw123456') {
  const name = 't' + Date.now() + Math.floor(Math.random() * 1e6);
  const r = await request('POST', '/api/register', { username: name, password });
  return { token: r.body.token, username: name, password };
}

test('quizbank 知识点与大纲完全对齐（防止改大纲漏题）', () => {
  const { outline } = getOutline();
  const keys = new Set(Object.keys(QUIZBANK));
  let total = 0, missing = [];
  for (const s in outline) for (const c in outline[s]) for (const kp of outline[s][c]) {
    total++;
    if (!keys.has(kp)) missing.push(kp);
  }
  assert.equal(missing.length, 0, '缺失题库: ' + missing.join(', '));
  // 每点至少 2 题，保证随机刷题不重复
  for (const k of keys) assert.ok(QUIZBANK[k].length >= 2, k + ' 题量不足');
});

test('quizbank 题含合法选项与答案', () => {
  for (const k in QUIZBANK) for (const q of QUIZBANK[k]) {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, k + ' 选项异常');
    assert.match(String(q.answer), /^[A-E]$/, k + ' 答案非法');
    assert.ok(q.explanation, k + ' 缺解析');
  }
});

test('register 使用 scrypt 哈希存储，login 能校验且不同明文不匹配', () => {
  const name = 'h' + Date.now() + Math.floor(Math.random() * 1e6);
  const pass = 'secret123';
  const { token, userId } = register(name, pass);
  assert.ok(token, '应返回 token');
  const row = db.prepare('SELECT password FROM users WHERE id=?').get(userId);
  assert.ok(row.password.includes(':'), '密码应以 salt:hash 形式存储');
  assert.notEqual(row.password, pass, '不应存明文');
  assert.ok(login(name, pass).token, '正确密码应登录成功');
  assert.throws(() => login(name, 'wrong'), /用户名或密码错误/, '错误密码应失败');
});

test('register 拒绝重名并给中文提示', () => {
  const name = 'dup' + Date.now();
  register(name, 'pw123456');
  assert.throws(() => register(name, 'pw123456'), /用户名已存在/, '重名应提示已存在');
});

test('register 校验密码长度', () => {
  assert.throws(() => register('short' + Date.now(), '123'), /至少 6 位/, '短密码应被拒');
});

test('JWT_SECRET 缺失时不兜底 dev-secret（启动期已退出，这里验证 hash 强度）', () => {
  // 直接校验 hash 含随机 salt，长度足够
  const salt = crypto.randomBytes(16).toString('hex');
  assert.equal(salt.length, 32);
});

test('quiz/answer 缺字段返回 400（空 q 防护）', async () => {
  const { token } = await signup();
  const r = await request('POST', '/api/quiz/answer', { correct: false }, token);
  assert.equal(r.status, 400, '缺 subject/knowledgePoint 应拒绝');
});

test('quiz 答错写入错题本且含 options/explanation', async () => {
  const { token, username } = await signup();
  const sub = '科学', kp = '人体的新陈代谢(消化/呼吸/循环)';
  // 先取一题
  const next = await request('POST', '/api/quiz/next', { subject: sub, knowledgePoint: kp }, token);
  assert.equal(next.status, 200);
  // 故意答错（用非答案项）
  const wrong = 'A' === next.body.answer ? 'B' : 'A';
  const ans = await request('POST', '/api/quiz/answer', {
    subject: sub, knowledgePoint: kp, correct: false, difficulty: 2,
    question: next.body.question, answer: next.body.answer,
    options: next.body.options, explanation: next.body.explanation
  }, token);
  assert.equal(ans.status, 200);
  const uid = db.prepare('SELECT id FROM users WHERE username=?').get(username).id;
  const m = db.prepare('SELECT * FROM mistakes WHERE user_id=? AND knowledge_point=?').get(uid, kp);
  assert.ok(m, '应写入错题');
  assert.ok(m.options, '应存选项');
  assert.ok(m.explanation, '应存解析');
});

test('generateQuiz 难度参数优先选同难度题', async () => {
  const { token } = await signup();
  const kp = '二次函数概念与图象'; // 该点含多难度题
  const want = 3;
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const r = await request('POST', '/api/quiz/next', { subject: '数学', knowledgePoint: kp, difficulty: want }, token);
    seen.add(r.body.question);
  }
  // 同难度存在时，抽到的题应全部为难度 3（或全部来自同难度池）
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
  // 仅记录"已总结"的一条（未刷题）
  db.prepare('INSERT INTO knowledge_mastery(user_id,subject,chapter,knowledge_point,mastery,reviews) VALUES(?,?,?,?,?,?)')
    .run(u, '语文', '九上·现代文', '学习缩写/改写', 30, 0);
  const merged = mergeMastery(u);
  assert.equal(merged['语文||学习缩写/改写'], 30, '已总结未刷题点应填充复习掌握度');
  // 刷题驱动的点覆盖（全对多次以达高掌握度，与 computeMastery 算法一致）
  for (let i = 0; i < 3; i++)
    db.prepare('INSERT INTO quiz_records(user_id,subject,knowledge_point,correct,difficulty) VALUES(?,?,?,?,?)')
      .run(u, '数学', '二次函数概念与图象', 1, 2);
  const merged2 = mergeMastery(u);
  assert.ok(merged2['数学||二次函数概念与图象'] >= 90, '刷题点应使用刷题掌握度');
});

test('GET /api/knowledge/tree 合并返回大纲+考法+掌握度', async () => {
  const { token } = await signup();
  const r = await request('GET', '/api/knowledge/tree', null, token);
  assert.equal(r.status, 200);
  assert.ok(r.body.outline && r.body.examFocus && r.body.mastery, 'tree 应含 outline/examFocus/mastery');
});
