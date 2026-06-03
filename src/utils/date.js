/**
 * Date utilities (timezone-aware, default UTC+8)
 */

const TZ_OFFSET = 8; // UTC+8 (China Standard Time)

/**
 * Get today's date string in YYYY-MM-DD format (UTC+8)
 */
export function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() + TZ_OFFSET * 3600_000);
  return local.toISOString().split('T')[0];
}

/**
 * Get today as a Date object at midnight UTC+8
 */
export function todayMidnight() {
  const now = new Date();
  const local = new Date(now.getTime() + TZ_OFFSET * 3600_000);
  local.setUTCHours(0, 0, 0, 0);
  return local;
}

/**
 * Calculate days remaining until expiry
 * @param {string} expireDate - "YYYY-MM-DD"
 * @returns {number} positive = days left, 0 = today, negative = overdue
 */
export function daysUntil(expireDate) {
  const today = todayMidnight();
  const exp = new Date(expireDate + 'T00:00:00Z');
  return Math.ceil((exp - today) / 86_400_000);
}

/**
 * Add days to a date string
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number} days
 * @returns {string} new "YYYY-MM-DD"
 */
export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '未设置';
  const d = new Date(dateStr + 'T00:00:00Z');
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${m}月${day}日`;
}

/**
 * Get human-readable status text
 */
export function getStatusText(days) {
  if (days < 0) return `已过期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `剩余 ${days} 天`;
}

/**
 * Calculate predicted suspend date for balance-type items
 *
 * Logic: balance covers N monthly fee deductions.
 *   N = Math.floor(balance / monthlyFee)
 *   If N <= 0: predicted suspend = next billing day (balance insufficient)
 *   Else: predicted suspend = next billing day + N months
 *
 * Edge cases:
 *   - balance = 0 or balance < monthlyFee → N = 0 → returns next billing day
 *     (correct: the upcoming deduction will drain the balance)
 *   - If today is past this month's billing day, the "next billing day" shifts
 *     to next month. This means N=0 returns next month's billing day, which is
 *     correct because this month's deduction already happened.
 *   - billingDay > days-in-month → clamped to last day of that month
 *
 * @param {number} balance - current balance
 * @param {number} monthlyFee - monthly fee
 * @param {number} billingDay - day of month (1-28)
 * @param {Date} [now] - override current time (for testing)
 * @returns {string} predicted suspend date "YYYY-MM-DD"
 */
export function calcSuspendDate(balance, monthlyFee, billingDay, now = new Date()) {
  const tzNow = new Date(now.getTime() + TZ_OFFSET * 3600_000);
  const y = tzNow.getUTCFullYear();
  const m = tzNow.getUTCMonth(); // 0-indexed
  const d = tzNow.getUTCDate();

  // Get this month's billing day (handle months with fewer days)
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const thisMonthBD = Math.min(billingDay, daysInMonth);

  // How many months the balance can cover
  const N = monthlyFee > 0 ? Math.max(0, Math.floor(balance / monthlyFee)) : 0;

  // Base month for calculation
  let baseYear, baseMonth;
  if (d <= thisMonthBD) {
    // Before or on billing day: next deduction is this month
    baseYear = y;
    baseMonth = m;
  } else {
    // After billing day: next deduction is next month
    baseYear = m === 11 ? y + 1 : y;
    baseMonth = (m + 1) % 12;
  }

  // Predicted suspend = base billing day + N months
  let suspMonth = baseMonth + N;
  let suspYear = baseYear + Math.floor(suspMonth / 12);
  suspMonth = suspMonth % 12;
  const daysInSuspMonth = new Date(suspYear, suspMonth + 1, 0).getDate();
  const suspDay = Math.min(billingDay, daysInSuspMonth);

  const mm = String(suspMonth + 1).padStart(2, '0');
  const dd = String(suspDay).padStart(2, '0');
  return `${suspYear}-${mm}-${dd}`;
}
