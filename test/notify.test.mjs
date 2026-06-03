import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAuthNotificationChannel,
  getConfiguredNotificationChannels,
  sendNotifications,
} from '../src/services/notify.js';

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

test('detects configured notification channels from env', async () => {
  const channels = await getConfiguredNotificationChannels({
    TG_BOT_TOKEN: 'token',
    TG_CHAT_ID: 'chat',
    BARK_KEY: 'bark-key',
    WECOM_WEBHOOK_URL: 'https://example.com/wecom',
    WEBHOOK_URL: 'https://example.com/generic',
  });

  assert.deepEqual(channels, ['telegram', 'bark', 'wecom', 'webhook']);
});

test('sendNotifications posts to all configured channels', async () => {
  const fetchMock = mockFetch();
  try {
    const results = await sendNotifications({
      TG_BOT_TOKEN: 'token',
      TG_CHAT_ID: 'chat',
      BARK_URL: 'https://example.com/bark',
      WECOM_WEBHOOK_URL: 'https://example.com/wecom',
      WEBHOOK_URL: 'https://example.com/generic',
    }, '<b>到期提醒</b>\n号码 &amp; 订阅', { title: '测试标题' });

    assert.deepEqual(results.map(r => r.channel), ['telegram', 'bark', 'wecom', 'webhook']);
    assert.equal(fetchMock.calls.length, 4);
    assert.equal(fetchMock.calls[1].payload.body, '到期提醒\n号码 & 订阅');
    assert.equal(fetchMock.calls[2].payload.text.content, '测试标题\n\n到期提醒\n号码 & 订阅');
    assert.equal(fetchMock.calls[3].payload.title, '测试标题');
  } finally {
    fetchMock.restore();
  }
});

test('sendNotifications honors DEFAULT_NOTIFY_CHANNEL', async () => {
  const fetchMock = mockFetch();
  try {
    const results = await sendNotifications({
      DEFAULT_NOTIFY_CHANNEL: 'bark',
      TG_BOT_TOKEN: 'token',
      TG_CHAT_ID: 'chat',
      BARK_URL: 'https://example.com/bark',
      WECOM_WEBHOOK_URL: 'https://example.com/wecom',
    }, '<b>默认通道</b>', { title: '测试标题' });

    assert.deepEqual(results.map(r => r.channel), ['bark']);
    assert.equal(fetchMock.calls.length, 1);
    assert.equal(fetchMock.calls[0].url, 'https://example.com/bark');
  } finally {
    fetchMock.restore();
  }
});

test('sendNotifications reports an explicitly selected unconfigured channel', async () => {
  const results = await sendNotifications({
    TG_BOT_TOKEN: 'token',
    TG_CHAT_ID: 'chat',
  }, '测试', { channel: 'bark' });

  assert.deepEqual(results, [{ channel: 'bark', ok: false, message: '通知渠道未配置' }]);
});

test('resolves auth notification channel from auth override, default, or configured channels', async () => {
  assert.equal(await getAuthNotificationChannel({
    AUTH_NOTIFY_CHANNEL: 'wecom',
    WECOM_WEBHOOK_URL: 'https://example.com/wecom',
  }), 'wecom');

  assert.equal(await getAuthNotificationChannel({
    DEFAULT_NOTIFY_CHANNEL: 'bark',
    BARK_KEY: 'bark-key',
  }), 'bark');

  assert.equal(await getAuthNotificationChannel({
    TG_BOT_TOKEN: 'token',
    TG_CHAT_ID: 'chat',
    BARK_KEY: 'bark-key',
  }), 'telegram');

  assert.equal(await getAuthNotificationChannel({
    BARK_KEY: 'bark-key',
  }), 'bark');
});
