import assert from 'node:assert/strict';
import test from 'node:test';

import { createItem, mergeUpdate, normalizeRemindDays, validateItem } from '../src/data/schema.js';

test('createItem uses UUID ids', () => {
  const item = createItem('esim', {
    name: 'Test eSIM',
    expireDate: '2026-12-31',
    cycle: 180,
  });

  assert.match(item.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('remindDays are normalized to unique supported values', () => {
  assert.deepEqual(normalizeRemindDays([1, '3', 3, 99, 0]), [3, 1, 0]);
  assert.deepEqual(normalizeRemindDays(7), [7]);
  assert.deepEqual(normalizeRemindDays(undefined), [3, 1, 0]);
});

test('subscription URL validation rejects unsafe protocols', () => {
  const err = validateItem('subscription', {
    name: 'Unsafe',
    expireDate: '2026-12-31',
    price: '10',
    billing: 'monthly',
    currency: 'USD',
    remindDays: [3],
    url: 'javascript:alert(1)',
  });

  assert.equal(err, '链接必须以 http:// 或 https:// 开头');
});

test('balance items receive predicted suspend dates', () => {
  const item = createItem('balance', {
    name: 'Main SIM',
    balance: 50,
    monthlyFee: 18,
    billingDay: 5,
    remindDays: [3, 1, 0],
  });

  assert.match(item.predictedSuspendDate, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
});

test('mergeUpdate recalculates balance suspend date', () => {
  const item = createItem('balance', {
    name: 'Main SIM',
    balance: 50,
    monthlyFee: 18,
    billingDay: 5,
    remindDays: [3, 1, 0],
  });
  const updated = mergeUpdate(item, { balance: -10 });

  assert.notEqual(updated.predictedSuspendDate, item.predictedSuspendDate);
  assert.match(updated.predictedSuspendDate, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
});
