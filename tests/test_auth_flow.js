import test from 'node:test';
import assert from 'node:assert/strict';
import { register, login } from '../src/server/auth.js';

test('register then login returns token', () => {
  const u = 'alice' + Date.now();
  const r = register(u, 'pw123');
  assert.ok(r.token);
  const l = login(u, 'pw123');
  assert.ok(l.token);
  assert.equal(l.userId, r.userId);
});
