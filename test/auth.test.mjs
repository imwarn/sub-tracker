import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAuth } from '../src/handlers/auth.js';

function createMockKV() {
  const data = new Map();
  return {
    data,
    async get(key) {
      return data.get(key) ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

function mockFetch() {
  const calls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), payload: JSON.parse(options.body) });
    return new Response('{}', { status: 200 });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = previous;
    },
  };
}

test('send auth OTP through Bark when it is the default notification channel', async () => {
  const db = createMockKV();
  const fetchMock = mockFetch();

  try {
    const response = await handleAuth(
      new Request('https://example.com/api/auth/send', { method: 'POST' }),
      {
        DB: db,
        DEFAULT_NOTIFY_CHANNEL: 'bark',
        BARK_URL: 'https://example.com/bark',
      },
      '/api/auth/send'
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, channel: 'bark' });
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(fetchMock.calls[0].url, 'https://example.com/bark');

    const code = db.data.get('admin_auth_code');
    assert.match(code, /^\d{6}$/);
    assert.equal(db.data.get('admin_auth_attempts'), '0');
    assert.equal(db.data.get('admin_auth_send_cooldown'), '1');
    assert.equal(fetchMock.calls[0].payload.title, 'Sub-Tracker 安全验证');
    assert.ok(fetchMock.calls[0].payload.body.includes(code));
  } finally {
    fetchMock.restore();
  }
});
