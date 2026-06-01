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
