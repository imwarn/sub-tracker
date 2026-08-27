import assert from 'node:assert/strict';
import test from 'node:test';

import { handleSettings } from '../src/handlers/settings.js';
import { getSettings, saveSettings } from '../src/data/store.js';
import { ISO_CURRENCIES, CURRENCY_SYMBOLS, DEFAULT_EXCHANGE_RATES } from '../src/data/constants.js';
import { createItem, validateItem } from '../src/data/schema.js';
import { getHTML } from '../src/ui/template.js';

class MockKV {
  constructor(store = {}) {
    this.store = new Map(Object.entries(store));
  }
  async get(key, options) {
    const val = this.store.get(key);
    if (val === undefined) return null;
    if (options && options.type === 'json') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }
  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
}

test('ISO_CURRENCIES covers major currencies with codes, names, symbols, and flags', () => {
  assert.ok(ISO_CURRENCIES.length >= 40);
  const codes = ISO_CURRENCIES.map(c => c.code);
  assert.ok(codes.includes('CNY'));
  assert.ok(codes.includes('USD'));
  assert.ok(codes.includes('TRY'));
  assert.ok(codes.includes('ARS'));
  assert.ok(codes.includes('NGN'));
  assert.ok(codes.includes('EGP'));
  assert.ok(codes.includes('BRL'));
  assert.ok(codes.includes('KZT'));

  assert.equal(CURRENCY_SYMBOLS['USD'], '$');
  assert.equal(CURRENCY_SYMBOLS['TRY'], '₺');
  assert.equal(CURRENCY_SYMBOLS['EUR'], '€');
});

test('schema validates ISO 4217 3-letter codes and normalizes to uppercase', () => {
  assert.equal(validateItem('subscription', {
    name: 'Netflix TR',
    expireDate: '2026-12-31',
    price: '99.99',
    billing: 'monthly',
    currency: 'TRY',
    remindDays: [3],
  }), null);

  assert.equal(validateItem('subscription', {
    name: 'Invalid Cur',
    expireDate: '2026-12-31',
    price: '10',
    currency: 'INVALID_CODE',
    remindDays: [3],
  }), '货币类型格式不正确 (须为 3 位 ISO 字母代码)');

  const item = createItem('subscription', {
    name: 'Spotify Argentina',
    expireDate: '2026-12-31',
    price: '500',
    currency: 'ars',
  });
  assert.equal(item.currency, 'ARS');
});

test('getSettings returns defaults when store is empty and merges custom settings', async () => {
  const db = new MockKV();
  const def = await getSettings(db);
  assert.equal(def.baseCurrency, 'CNY');
  assert.ok(def.categories.includes('AI 服务'));
  assert.ok(def.regions.some(r => r.code === 'US'));

  await saveSettings(db, {
    baseCurrency: 'USD',
    categories: ['影视', '办公'],
  });

  const merged = await getSettings(db);
  assert.equal(merged.baseCurrency, 'USD');
  assert.deepEqual(merged.categories, ['影视', '办公']);
});

test('handleSettings GET and PUT endpoints', async () => {
  const db = new MockKV();
  const env = { DB: db, ADMIN_PASSWORD: 'test' };

  // Generate a valid mock session
  const token = 'test-token-123';
  await db.put(`session_token_${token}`, 'ok');

  // GET
  const getReq = new Request('https://example.com/api/settings', {
    method: 'GET',
    headers: { Authorization: token },
  });
  const getRes = await handleSettings(getReq, env, '/api/settings');
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.equal(getData.baseCurrency, 'CNY');

  // PUT update settings
  const putReq = new Request('https://example.com/api/settings', {
    method: 'PUT',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      baseCurrency: 'HKD',
      exchangeRates: {
        USD: 7.80,
        CNY: 1.08,
      },
      categories: ['影音流媒体', 'AI 生产力', '海外保号卡'],
    }),
  });
  const putRes = await handleSettings(putReq, env, '/api/settings');
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.success, true);
  assert.equal(putData.baseCurrency, 'HKD');
  assert.equal(putData.exchangeRates.USD, 7.80);
  assert.deepEqual(putData.categories, ['影音流媒体', 'AI 生产力', '海外保号卡']);
});

test('HTML template includes settings modal and menu entry', () => {
  const html = getHTML();
  assert.match(html, /id="settings-overlay"/);
  assert.match(html, /id="settings-base-currency"/);
  assert.match(html, /id="sync-rates-btn"/);
  assert.match(html, /id="settings-category-tags"/);
  assert.match(html, /id="settings-region-tags"/);
  assert.match(html, /openSettings\(\)/);
});
