import test from 'node:test';
import assert from 'node:assert/strict';
import { addMistake, getMistakes } from '../src/server/mistakes.js';
import { register } from '../src/server/auth.js';

test('addMistake then getMistakes', () => {
  const { userId } = register('m' + Date.now(), 'p');
  addMistake(userId, { subject: '数学', knowledgePoint: '二次函数', question: '求顶点', answer: '...' });
  assert.equal(getMistakes(userId).length, 1);
});
