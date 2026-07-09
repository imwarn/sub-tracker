/**
 * Pure stats/sort helpers for sub-tracker frontend.
 *
 * Two consumers, same source (no drift):
 *  - Node tests import the real functions below.
 *  - The browser script (getClientScript() returns a template string that runs
 *    in browser scope and cannot access ES module imports) gets the function
 *    source via `func.toString()` interpolated into the string (see
 *    client-script.js). We must NOT use new Function()/eval here — Cloudflare
 *    Workers forbids runtime code generation (error 10021).
 *
 * IMPORTANT: each function must be fully SELF-CONTAINED — no references to
 * module-level constants/helpers. func.toString() captures only the function
 * body, so any external reference (e.g. DAY_MS) would be undefined once the
 * source is injected into the browser script.
 *
 * Rules (per product decisions):
 * - Paused items are excluded from "即将到期" and cost aggregates.
 * - Paused items sink to the bottom in any sort order.
 */

export function countUrgent(items, now = new Date()) {
  const DAY_MS = 86400000;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  let count = 0;
  for (const i of items) {
    if (i.status === 'paused') continue;
    const dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
    if (!dateStr) continue;
    const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - base) / DAY_MS);
    if (diff <= 15) count++;
  }
  return count;
}

export function sortItemsByPaused(items, sortBy = 'expire', now = new Date()) {
  const DAY_MS = 86400000;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  const diffOf = (dateStr) =>
    dateStr ? Math.ceil((new Date(dateStr + 'T00:00:00') - base) / DAY_MS) : 9999;
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
      ? (a.predictedSuspendDate ? diffOf(a.predictedSuspendDate) : 9999)
      : (a.expireDate ? diffOf(a.expireDate) : 9999);
    const db = b.type === 'balance'
      ? (b.predictedSuspendDate ? diffOf(b.predictedSuspendDate) : 9999)
      : (b.expireDate ? diffOf(b.expireDate) : 9999);
    return da - db;
  });
  return items;
}
