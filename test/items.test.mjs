import assert from 'node:assert/strict';
import test from 'node:test';

import { handleItems } from '../src/handlers/items.js';
import { getAllItems, saveAllItems } from '../src/data/store.js';

function createMockKV() {
  const data = new Map();
  return {
    async get(key, options) {
      const value = data.get(key);
      if (options?.type === 'json') return value ? JSON.parse(value) : null;
      return value ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

function authRequest(path, body) {
  return new Request('https://example.com' + path, {
    method: 'POST',
    headers: {
      Authorization: 'test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function renewRequest(id, nowISO) {
  return new Request('https://example.com' + `/api/items/${id}/renew`, {
    method: 'POST',
    headers: {
      Authorization: 'test-token',
      'Content-Type': 'application/json',
      ...(nowISO ? { 'x-test-now': nowISO } : {}),
    },
  });
}

test('import preserves only UUID ids and deduplicates within the same batch', async () => {
  const db = createMockKV();
  const env = { DB: db };
  const existingId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const keepId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const dupId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  await db.put('session_token_test-token', 'valid');
  await saveAllItems(db, [
    { id: existingId, type: 'esim', name: 'Existing', expireDate: '2026-01-01' },
  ]);

  const response = await handleItems(
    authRequest('/api/items/import/json', {
      items: [
        { id: keepId, type: 'esim', name: 'Keep UUID', expireDate: '2026-12-31' },
        { id: "x');alert(1);//", type: 'esim', name: 'Unsafe ID', expireDate: '2026-12-31' },
        { id: dupId, type: 'esim', name: 'Duplicate One', expireDate: '2026-12-31' },
        { id: dupId, type: 'esim', name: 'Duplicate Two', expireDate: '2026-12-31' },
        { id: existingId, type: 'esim', name: 'Already Exists', expireDate: '2026-12-31' },
      ],
    }),
    env,
    '/api/items/import/json',
  );

  const result = await response.json();
  assert.equal(result.success, true);
  assert.equal(result.added, 3);
  assert.equal(result.skipped, 2);

  const items = await getAllItems(db);
  assert.equal(items.length, 4);
  assert.ok(items.some(item => item.name === 'Keep UUID' && item.id === keepId));
  assert.equal(items.filter(item => item.id === dupId).length, 1);

  const unsafe = items.find(item => item.name === 'Unsafe ID');
  assert.ok(unsafe);
  assert.notEqual(unsafe.id, "x');alert(1);//");
  assert.match(unsafe.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('renew counts from today when the item is already expired', async () => {
  const db = createMockKV();
  const env = { DB: db };
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  await db.put('session_token_test-token', 'valid');
  await saveAllItems(db, [
    { id, type: 'esim', name: 'Expired eSIM', cycle: 90, expireDate: '2026-07-01' },
  ]);

  // "today" = 2026-07-07 (item already expired)
  const response = await handleItems(renewRequest(id, '2026-07-07T12:00:00Z'), env, `/api/items/${id}/renew`);
  const result = await response.json();
  assert.equal(result.success, true);
  // 90 days from 2026-07-07 -> 2026-10-05
  assert.equal(result.newExpireDate, '2026-10-05');
});

test('renew rolls forward from existing expiry when renewed early', async () => {
  const db = createMockKV();
  const env = { DB: db };
  const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  await db.put('session_token_test-token', 'valid');
  await saveAllItems(db, [
    { id, type: 'esim', name: 'Early eSIM', cycle: 90, expireDate: '2026-12-01' },
  ]);

  // "today" = 2026-07-07, expiry still in the future -> roll forward
  const response = await handleItems(renewRequest(id, '2026-07-07T12:00:00Z'), env, `/api/items/${id}/renew`);
  const result = await response.json();
  assert.equal(result.success, true);
  // 90 days from 2026-12-01 -> 2027-03-01
  assert.equal(result.newExpireDate, '2027-03-01');
});

test('subscription renew uses billing period and counts from today when expired', async () => {
  const db = createMockKV();
  const env = { DB: db };
  const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  await db.put('session_token_test-token', 'valid');
  await saveAllItems(db, [
    { id, type: 'subscription', name: 'Monthly sub', billing: 'monthly', expireDate: '2026-06-01' },
  ]);

  // "today" = 2026-07-07, expired -> 30 days forward
  const response = await handleItems(renewRequest(id, '2026-07-07T12:00:00Z'), env, `/api/items/${id}/renew`);
  const result = await response.json();
  assert.equal(result.success, true);
  // 30 days from 2026-07-07 -> 2026-08-06
  assert.equal(result.newExpireDate, '2026-08-06');
});

test('renew rejects non-renewable types', async () => {
  const db = createMockKV();
  const env = { DB: db };
  const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  await db.put('session_token_test-token', 'valid');
  await saveAllItems(db, [
    { id, type: 'balance', name: 'Balance', balance: 100, expireDate: '2026-12-31' },
  ]);

  const response = await handleItems(renewRequest(id), env, `/api/items/${id}/renew`);
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.match(result.message, /仅 eSIM 和订阅/);
});
