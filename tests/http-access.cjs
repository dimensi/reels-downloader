const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');

process.env.NODE_ENV = 'production';
process.env.TOKEN = 'test-access-token';
process.env.TELEGRAM_BOT_TOKEN = '123:test';
// Importing the app registers a bot; HTTP tests must not start Telegram polling.
require('telegraf').Telegraf.prototype.launch = async () => {};
const app = require('../dist/app').default;

async function withServer(remoteAddress, run) {
  const server = http.createServer((req, res) => {
    Object.defineProperty(req.socket, 'remoteAddress', { value: remoteAddress });
    app(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('anonymous requests are empty 404s before parsing, CORS and authentication errors', async () => {
  await withServer('203.0.113.10', async base => {
    for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS', 'PUT', 'DELETE']) {
      for (const path of ['/', '/health', '/api', '/api/download', '/unknown']) {
        for (const query of ['', '?token=wrong', '?token=a&token=b']) {
          const response = await fetch(base + path + query, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Forwarded-For': '127.0.0.1',
              Origin: 'https://example.com',
              'Access-Control-Request-Method': 'POST',
            },
            ...(!['GET', 'HEAD'].includes(method) ? { body: '{invalid json' } : {}),
          });
          assert.equal(response.status, 404, `${method} ${path}${query}`);
          assert.equal(await response.text(), '');
          assert.equal(response.headers.get('x-powered-by'), null);
          assert.equal(response.headers.get('access-control-allow-origin'), null);
        }
      }
    }
  });
});

test('valid token reaches download validation without sending a video', async () => {
  await withServer('203.0.113.10', async base => {
    const response = await fetch(base + '/api/download?token=test-access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'MISSING_REQUIRED_FIELDS');
    const missing = await fetch(base + '/unknown?token=test-access-token');
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), '');
  });
});

test('container loopback health checks remain available', async () => {
  for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    await withServer(address, async base => {
      const response = await fetch(base + '/health');
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, 'healthy');
      const api = await fetch(base + '/api/download', { method: 'POST' });
      assert.equal(api.status, 404);
    });
  }
});
