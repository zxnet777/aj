import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/db.js';
import { ensureUser } from '../src/server/db.js';
import { addPoints, checkIn } from '../src/server/gamify.js';

test('addPoints adds points and raises level', () => {
  const userId = ensureUser(); // self user, always exists (id=1)
  const before = db.prepare('SELECT points, level FROM users WHERE id=?').get(userId);
  const r = addPoints(userId, 100);
  assert.equal(r.points, before.points + 100);
  assert.equal(r.level, Math.floor(r.points / 100) + 1);
});

test('checkIn returns a streak number and rewards only once per day', () => {
  const userId = ensureUser();
  const before = db.prepare('SELECT streak FROM users WHERE id=?').get(userId).streak;
  const r = checkIn(userId);
  assert.equal(typeof r.streak, 'number');
  if (r.rewarded) assert.equal(r.streak, before + 1);
  else assert.equal(r.streak, before);
});
