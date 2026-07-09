/**
 * Pure stats/sort helpers for sub-tracker frontend.
 * Kept DOM-free so they can be unit-tested in Node (see test/stats.test.mjs).
 *
 * Rules (per product decisions):
 * - Paused items are excluded from "即将到期" and cost aggregates
 *   (a paused subscription/balance no longer incurs cost or expiry pressure).
 * - Paused items sink to the bottom in any sort order.
 */

const DAY_MS = 86_400_000;

function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr, now = new Date()) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - startOfToday(now)) / DAY_MS);
  return diff;
}

/**
 * Count items that are "urgent" (expiring within 15 days), excluding paused.
 * @param {Array<object>} items
 * @param {Date} [now]
 * @returns {number}
 */
export function countUrgent(items, now = new Date()) {
  let count = 0;
  for (const i of items) {
    if (i.status === 'paused') continue;
    const dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
    const diff = daysUntil(dateStr, now);
    if (diff !== null && diff <= 15) count++;
  }
  return count;
}

/**
 * Sort items with paused sunk to the bottom, then by the chosen key.
 * Mutates and returns the array (same contract as Array.sort).
 * @param {Array<object>} items
 * @param {'expire'|'name'|'price'} sortBy
 * @param {Date} [now]
 * @returns {Array<object>}
 */
export function sortItemsByPaused(items, sortBy = 'expire', now = new Date()) {
  const today = startOfToday(now);
  items.sort((a, b) => {
    // paused sinks to bottom
    const ap = a.status === 'paused' ? 1 : 0;
    const bp = b.status === 'paused' ? 1 : 0;
    if (ap !== bp) return ap - bp;

    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'zh');
    if (sortBy === 'price') {
      const pa = a.type === 'balance' ? (a.monthlyFee || 0) : parseFloat(a.price) || 0;
      const pb = b.type === 'balance' ? (b.monthlyFee || 0) : parseFloat(b.price) || 0;
      return pb - pa; // high to low
    }
    // default: by expiry date, nearest first
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
