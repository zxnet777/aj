import test from 'node:test';
import assert from 'node:assert/strict';
import { addMistake, getMistakes } from '../src/server/mistakes.js';

test('addMistake then getMistakes', () => {
  const userId = 'test-user-' + Date.now();
  addMistake(userId, { subject: '数学', knowledgePoint: '二次函数', question: '求顶点', answer: '...' });
  assert.equal(getMistakes(userId).length, 1);
});
