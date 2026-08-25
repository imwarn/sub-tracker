import assert from 'node:assert/strict';
import test from 'node:test';
import { autoRenewSubscriptions } from '../src/services/auto-renew.js';
import { saveAllItems, getAllItems, getHistory } from '../src/data/store.js';

function createMockKV() {
  const data = new Map();
  return {
    data,
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

test('autoRenewSubscriptions advances expired autoRenew subscriptions by 1 billing cycle', async () => {
  const db = createMockKV();
  const env = { DB: db };

  const subId = '11111111-1111-4111-8111-111111111111';
  await saveAllItems(db, [
    {
      id: subId,
      type: 'subscription',
      name: 'Netflix',
      autoRenew: true,
      billing: 'monthly',
      expireDate: '2026-08-01',
      status: 'active',
      price: '15.99',
      currency: 'USD',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'subscription',
      name: 'ChatGPT Manual',
      autoRenew: false,
      billing: 'monthly',
      expireDate: '2026-08-01',
      status: 'active',
    },
  ]);

  // "Today" is 2026-08-05 (past 2026-08-01)
  await autoRenewSubscriptions(env, new Date('2026-08-05T00:00:00Z'));

  const items = await getAllItems(db);
  const netflix = items.find(i => i.id === subId);
  const chatgpt = items.find(i => i.id === '22222222-2222-4222-8222-222222222222');

  // Netflix should roll forward from 2026-08-01 -> 2026-09-01
  assert.equal(netflix.expireDate, '2026-09-01');
  // Manual ChatGPT should NOT change
  assert.equal(chatgpt.expireDate, '2026-08-01');

  // Verify history entry
  const history = await getHistory(db);
  assert.equal(history.length, 1);
  assert.equal(history[0].action, 'renew');
  assert.equal(history[0].details.auto, true);
  assert.equal(history[0].details.newExpireDate, '2026-09-01');
});
