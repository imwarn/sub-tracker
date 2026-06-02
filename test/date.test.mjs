import assert from 'node:assert/strict';
import test from 'node:test';

import { calcSuspendDate } from '../src/utils/date.js';

test('negative balance does not produce a past suspend date', () => {
  const now = new Date('2026-06-02T00:00:00Z');
  assert.equal(calcSuspendDate(-50, 18, 5, now), '2026-06-05');
});

test('balance before billing day uses current month as base', () => {
  const now = new Date('2026-06-02T00:00:00Z');
  assert.equal(calcSuspendDate(50, 18, 5, now), '2026-08-05');
});

test('balance after billing day uses next month as base', () => {
  const now = new Date('2026-06-06T00:00:00Z');
  assert.equal(calcSuspendDate(18, 18, 5, now), '2026-08-05');
});

test('zero monthly fee falls back to the next billing day', () => {
  const now = new Date('2026-06-06T00:00:00Z');
  assert.equal(calcSuspendDate(100, 0, 5, now), '2026-07-05');
});
