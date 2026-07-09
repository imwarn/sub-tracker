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

// Boundary: on the billing day itself, auto-deduct has ALREADY run and stored a
// POST-deduction balance, so the next deduction is next month. Using `d <= bd`
// here would wrongly compute "suspend today" (one month early). Regression guard.
test('billing-day boundary uses post-deduction balance (next month base)', () => {
  const now = new Date('2026-07-10T12:00:00Z'); // exactly the billing day (bd=10)
  // balance 57.9 = 172.9 - 115 already deducted on 07-10; should suspend 2026-08-10
  assert.equal(calcSuspendDate(57.9, 115, 10, now), '2026-08-10');
});

// Day after billing day: still next month base, consistent with boundary.
test('day after billing day uses next month base', () => {
  const now = new Date('2026-07-11T12:00:00Z');
  assert.equal(calcSuspendDate(57.9, 115, 10, now), '2026-08-10');
});

// Day before billing day: next deduction is this month (pre-deduction balance).
test('day before billing day uses current month base', () => {
  const now = new Date('2026-07-09T12:00:00Z');
  assert.equal(calcSuspendDate(172.9, 115, 10, now), '2026-08-10');
});
