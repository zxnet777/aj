import test from 'node:test';
import assert from 'node:assert/strict';
import { explainQuestion } from '../src/server/ai.js';

test('explainQuestion is callable', async () => {
  assert.equal(typeof explainQuestion, 'function');
});
