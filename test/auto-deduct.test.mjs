import assert from 'node:assert/strict';
import test from 'node:test';
import { autoDeduct } from '../src/services/auto-deduct.js';
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

test('autoDeduct deducts monthly fee on billing day and skips when already deducted today', async () => {
  const db = createMockKV();
  const env = { DB: db };

  const id1 = '11111111-1111-4111-8111-111111111111';
  const id2 = '22222222-2222-4222-8222-222222222222';
  await saveAllItems(db, [
    {
      id: id1,
      type: 'balance',
      name: 'China Mobile',
      balance: 100,
      monthlyFee: 18,
      billingDay: 5,
      status: 'active',
    },
    {
      id: id2,
      type: 'balance',
      name: 'China Unicom',
      balance: 50,
      monthlyFee: 10,
      billingDay: 10,
      status: 'active',
    },
  ]);

  const now = new Date('2026-08-05T08:00:00Z');
  await autoDeduct(env, now);

  const items = await getAllItems(db);
  const cm = items.find(i => i.id === id1);
  const cu = items.find(i => i.id === id2);

  assert.equal(cm.balance, 82);
  assert.equal(cm.lastDeductDate, '2026-08-05');
  assert.equal(cu.balance, 50);

  const history = await getHistory(db);
  assert.equal(history.length, 1);
  assert.equal(history[0].action, 'deduct');
  assert.equal(history[0].details.fee, 18);
  assert.equal(history[0].details.newBalance, 82);

  await autoDeduct(env, now);
  const itemsSecondRun = await getAllItems(db);
  assert.equal(itemsSecondRun.find(i => i.id === id1).balance, 82);
  const historySecondRun = await getHistory(db);
  assert.equal(historySecondRun.length, 1);
});
