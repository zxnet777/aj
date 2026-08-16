import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../src/server/index.js';

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
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: buf }); });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  });
}

test('GET /api/progress (self-use, no login) -> 200', async () => {
  const res = await request('GET', '/api/progress');
  assert.equal(res.status, 200);
  const body = JSON.parse(res.body);
  assert.ok('points' in body && 'level' in body);
});

test('GET /api/mistakes (self-use, no login) -> 200', async () => {
  const res = await request('GET', '/api/mistakes');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(JSON.parse(res.body)));
});
