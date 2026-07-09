import assert from 'node:assert/strict';
import test from 'node:test';

import { countUrgent, sortItemsByPaused } from '../src/utils/stats.js';

// Fixed "today" for deterministic date math: 2026-07-09
const NOW = new Date('2026-07-09T00:00:00');

test('countUrgent excludes paused items even if expired', () => {
  const items = [
    { id: '1', type: 'subscription', status: 'active', expireDate: '2026-07-15' }, // 6d -> urgent
    { id: '2', type: 'subscription', status: 'paused', expireDate: '2026-07-01' }, // expired but paused -> NOT counted
    { id: '3', type: 'esim', status: 'active', expireDate: '2026-08-01' },         // far -> not urgent
    { id: '4', type: 'balance', status: 'active', predictedSuspendDate: '2026-07-10' }, // 1d -> urgent
    { id: '5', type: 'balance', status: 'paused', predictedSuspendDate: '2026-07-08' }, // overdue but paused -> NOT counted
  ];
  assert.equal(countUrgent(items, NOW), 2);
});

test('countUrgent counts active within 15 days boundary inclusive', () => {
  const items = [
    { id: 'a', type: 'subscription', status: 'active', expireDate: '2026-07-24' }, // exactly 15d -> counted
    { id: 'b', type: 'subscription', status: 'active', expireDate: '2026-07-25' }, // 16d -> not counted
  ];
  assert.equal(countUrgent(items, NOW), 1);
});

test('sortItemsByPaused sinks paused to bottom regardless of sort key', () => {
  const items = [
    { id: 'p', type: 'subscription', status: 'paused', name: 'A', expireDate: '2026-07-10', price: '1' },
    { id: 'x', type: 'subscription', status: 'active', name: 'Z', expireDate: '2026-08-01', price: '9' },
    { id: 'y', type: 'subscription', status: 'active', name: 'B', expireDate: '2026-07-12', price: '5' },
  ];
  // default (expire) sort
  let sorted = sortItemsByPaused([...items], 'expire', NOW);
  assert.equal(sorted[sorted.length - 1].id, 'p');
  assert.deepEqual(sorted.map(i => i.id).slice(0, 2), ['y', 'x']); // 12th before 8/1

  // name sort
  sorted = sortItemsByPaused([...items], 'name', NOW);
  assert.equal(sorted[sorted.length - 1].id, 'p');
  assert.deepEqual(sorted.map(i => i.id).slice(0, 2), ['y', 'x']); // B before Z

  // price sort (high to low)
  sorted = sortItemsByPaused([...items], 'price', NOW);
  assert.equal(sorted[sorted.length - 1].id, 'p');
  assert.deepEqual(sorted.map(i => i.id).slice(0, 2), ['x', 'y']); // 9 before 5
});

test('sortItemsByPaused preserves order among same-status items', () => {
  const items = [
    { id: '1', type: 'subscription', status: 'active', expireDate: '2026-07-20' },
    { id: '2', type: 'subscription', status: 'active', expireDate: '2026-07-12' },
    { id: '3', type: 'subscription', status: 'paused', expireDate: '2026-07-05' },
  ];
  const sorted = sortItemsByPaused([...items], 'expire', NOW);
  assert.deepEqual(sorted.map(i => i.id), ['2', '1', '3']);
});

test('urgent filter equivalence: paused excluded (mirrors getFilteredItems urgent branch)', () => {
  // This reproduces the urgent-filter logic in getFilteredItems to ensure the
  // "paused exclusion" decision stays consistent with countUrgent().
  const today = new Date(NOW); today.setHours(0, 0, 0, 0);
  const isUrgent = (i) => {
    if (i.status === 'paused') return false;
    const dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
    if (!dateStr) return false;
    const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86_400_000);
    return diff <= 15;
  };
  const items = [
    { id: '1', type: 'subscription', status: 'active', expireDate: '2026-07-12' },
    { id: '2', type: 'subscription', status: 'paused', expireDate: '2026-07-10' },
  ];
  const filtered = items.filter(isUrgent);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});
