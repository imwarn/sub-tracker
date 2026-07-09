/**
 * Pure stats/sort helpers for sub-tracker frontend.
 *
 * Served two ways to avoid code drift:
 *  - `STATS_SRC`: the raw source string, injected into the browser script
 *    (getClientScript() returns a template string that runs in browser scope
 *    and cannot access ES module imports, so the source is interpolated in).
 *  - `countUrgent` / `sortItemsByPaused`: real functions, imported by Node tests.
 * Both are derived from the SAME `SRC` string below.
 *
 * Rules (per product decisions):
 * - Paused items are excluded from "即将到期" and cost aggregates
 *   (a paused subscription/balance no longer incurs cost or expiry pressure).
 * - Paused items sink to the bottom in any sort order.
 */

const DAY_MS = 86_400_000;

const SRC = `
function daysUntil(dateStr, now) {
  if (!dateStr) return null;
  const d = new Date(now); d.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr + 'T00:00:00') - d) / ${DAY_MS});
}

function countUrgent(items, now) {
  now = now || new Date();
  let count = 0;
  for (const i of items) {
    if (i.status === 'paused') continue;
    const dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
    const diff = daysUntil(dateStr, now);
    if (diff !== null && diff <= 15) count++;
  }
  return count;
}

function sortItemsByPaused(items, sortBy, now) {
  sortBy = sortBy || 'expire';
  now = now || new Date();
  items.sort(function (a, b) {
    const ap = a.status === 'paused' ? 1 : 0;
    const bp = b.status === 'paused' ? 1 : 0;
    if (ap !== bp) return ap - bp;
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'zh');
    if (sortBy === 'price') {
      const pa = a.type === 'balance' ? (a.monthlyFee || 0) : parseFloat(a.price) || 0;
      const pb = b.type === 'balance' ? (b.monthlyFee || 0) : parseFloat(b.price) || 0;
      return pb - pa;
    }
    const da = a.type === 'balance'
      ? (a.predictedSuspendDate ? (daysUntil(a.predictedSuspendDate, now) ?? 9999) : 9999)
      : (a.expireDate ? (daysUntil(a.expireDate, now) ?? 9999) : 9999);
    const db = b.type === 'balance'
      ? (b.predictedSuspendDate ? (daysUntil(b.predictedSuspendDate, now) ?? 9999) : 9999)
      : (b.expireDate ? (daysUntil(b.expireDate, now) ?? 9999) : 9999);
    return da - db;
  });
  return items;
}
`;

export const STATS_SRC = SRC;

// Derive real functions for Node tests from the same source (no drift).
const factory = new Function(SRC + '\nreturn { countUrgent: countUrgent, sortItemsByPaused: sortItemsByPaused };');
const derived = factory();
export const countUrgent = derived.countUrgent;
export const sortItemsByPaused = derived.sortItemsByPaused;
