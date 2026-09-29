const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { parse } = require('node:url');
const { proxyRequest } = require('next/dist/server/lib/router-utils/proxy-request');
const config = require('../next.config');

test('API proxy preserves Compare responses taking longer than 30 seconds', { timeout: 45000 }, async (t) => {
  const upstream = http.createServer((req, res) => {
    const timer = setTimeout(() => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ review: { sessionId: 'completed-review' } }));
    }, 31000);
    res.on('close', () => clearTimeout(timer));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const proxy = http.createServer((req, res) => {
    proxyRequest(req, res, parse(`http://127.0.0.1:${upstream.address().port}/compare`, true),
      undefined, undefined, config.experimental?.proxyTimeout).catch(() => {});
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    proxy.closeAllConnections();
    upstream.closeAllConnections();
    proxy.close();
    upstream.close();
  });
  const response = await fetch(`http://127.0.0.1:${proxy.address().port}/api/resume-builder/test/compare`, { method: 'POST' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { review: { sessionId: 'completed-review' } });
});
