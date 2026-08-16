import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/server/index.js';
import { db } from '../src/server/db.js';
import { computeMastery, getOutline, setMastery } from '../src/server/knowledge.js';

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

// 注册一个测试用户拿到 token
async function signup() {
  const name = 'kuser' + Date.now() + Math.floor(Math.random() * 1e6);
  const r = await request('POST', '/api/register', { username: name, password: 'pw123456' });
  return { token: r.body.token, userId: db.prepare('SELECT id FROM users WHERE username=?').get(name).id };
}

test('outline 覆盖浙江初三全科且结构为三级', () => {
  const o = getOutline().outline;
  // 浙教版数学：九上二次函数
  assert.ok(o.数学 && o.数学['九上·二次函数'].includes('二次函数概念与图象'));
  // 浙教版科学（合并物化生地）
  assert.ok(o.科学 && o.科学['九上·物理'].includes('电功与电功率'));
  assert.ok(o.科学['九上·化学'].includes('酸与碱'));
  // 历史与社会（合并历史+地理）
  assert.ok(o['历史与社会'] && o['历史与社会']['九上·中国与世界']);
  // 部编语文 / 道法 + 人教版英语
  assert.ok(o.语文 && o.英语 && o['道德与法治']);
  // 旧的分科结构应已不存在
  assert.ok(!o.物理 && !o.化学 && !o.历史 && !o.地理 && !o.生物);
});

test('computeMastery 全对提升、答错降低', () => {
  const u = 99901;
  db.prepare('INSERT OR IGNORE INTO users(id,username,password) VALUES(?,?,?)').run(u, 'km' + u, 'x');
  db.prepare('DELETE FROM quiz_records WHERE user_id=?').run(u);
  for (let i = 0; i < 3; i++)
    db.prepare('INSERT INTO quiz_records(user_id,subject,knowledge_point,correct,difficulty) VALUES(?,?,?,?,?)')
      .run(u, '数学', '二次函数', 1, 2);
  const m = computeMastery(u)['数学||二次函数'];
  assert.ok(m >= 90, '全对应接近满分，实际 ' + m);
  db.prepare('INSERT INTO quiz_records(user_id,subject,knowledge_point,correct,difficulty) VALUES(?,?,?,?,?)')
    .run(u, '数学', '二次函数', 0, 2);
  const m2 = computeMastery(u)['数学||二次函数'];
  assert.ok(m2 < m, '答错后掌握度应下降');
});

test('summarize 返回本地预置总结卡（演示模式，不依赖 DeepSeek）', async () => {
  const { token } = await signup();
  const r = await request('POST', '/api/knowledge/summarize',
    { subject: '数学', chapter: '九上·二次函数', knowledgePoint: '二次函数概念与图象' }, token);
  assert.equal(r.status, 200);
  // 本地卡有真实内容
  assert.ok(/y=ax/.test(r.body.concept), '应包含二次函数定义');
  assert.ok(Array.isArray(r.body.easyMistakes) && r.body.easyMistakes.length, '应有易错点');
  assert.ok(r.body.trick && r.body.example, '应有口诀与例题');
  // 中考考法回退到预置 EXAM_FOCUS
  assert.ok(Array.isArray(r.body.examFocus) && r.body.examFocus.length, '应有中考考法');
  assert.equal(r.body.source, 'local', '演示模式应标记为本地卡');
  assert.ok(r.body.mastery >= 10, '总结后掌握度应点亮');
});

test('summarize 未知知识点走通用兜底', async () => {
  const { token } = await signup();
  const r = await request('POST', '/api/knowledge/summarize',
    { subject: '语文', chapter: '九上·写作', knowledgePoint: '学习缩写/改写' }, token);
  assert.equal(r.status, 200);
  assert.ok(r.body.concept, '兜底也应返回结构完整的卡片');
});

test('GET /api/knowledge/outline 需要登录', async () => {
  const res = await request('GET', '/api/knowledge/outline');
  assert.equal(res.status, 401);
});

test('generateQuiz 按知识点出对口湖州中考风格题（演示模式）', async () => {
  const { token } = await signup();
  const r = await request('POST', '/api/quiz/next',
    { subject: '科学', knowledgePoint: '人体的新陈代谢(消化/呼吸/循环)' }, token);
  assert.equal(r.status, 200);
  // 回显知识点，证明不是统一演示题
  assert.equal(r.body.knowledgePoint, '人体的新陈代谢(消化/呼吸/循环)');
  assert.ok(r.body.question, '应有真实题干');
  assert.ok(Array.isArray(r.body.options) && r.body.options.length >= 2, '应有选项');
  assert.ok(r.body.answer, '应有答案');
});
