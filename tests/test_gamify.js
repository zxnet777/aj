import test from 'node:test';
import assert from 'node:assert/strict';
import { addPoints, checkIn } from '../src/server/gamify.js';
import { register } from '../src/server/auth.js';

test('addPoints raises level at 100', () => {
  const { userId } = register('g' + Date.now(), 'p');
  const r = addPoints(userId, 100);
  assert.equal(r.level, 2);
});

test('checkIn increments streak', () => {
  const { userId } = register('c' + Date.now(), 'p');
  const r = checkIn(userId);
  assert.equal(r.streak, 1);
});
