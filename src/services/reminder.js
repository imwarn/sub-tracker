/**
 * Reminder service - checks item expiration and sends notifications
 *
 * Uses per-item remindDays array (e.g. [30, 15, 3, 1, 0])
 * 0 = today, 1 = 1 day before, etc.
 */

import { getAllItems } from '../data/store.js';
import { escapeTelegramHTML } from './telegram.js';
import { sendNotifications } from './notify.js';
import { todayMidnight, calcSuspendDate } from '../utils/date.js';
import { CURRENCY_SYMBOLS, DEFAULT_REMIND_DAYS } from '../data/constants.js';

function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }
function tg(s) { return escapeTelegramHTML(s); }

/**
 * Run the reminder check (called by Cron trigger)
 */
export async function checkReminders(env) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;

  const today = todayMidnight();
  const messages = [];

  for (const item of items) {
    if (item.status !== 'active') continue;

    // === Balance type: suspend-date based reminder ===
    if (item.type === 'balance') {
      if (item.monthlyFee <= 0) continue;
      const suspendDate = calcSuspendDate(item.balance, item.monthlyFee, item.billingDay);
      const expDate = new Date(suspendDate + 'T00:00:00Z');
      expDate.setUTCHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expDate - today) / 86_400_000);

      const remindDays = Array.isArray(item.remindDays) && item.remindDays.length > 0
        ? item.remindDays
        : DEFAULT_REMIND_DAYS;

      if (!remindDays.includes(diffDays)) continue;

      const monthsLeft = Math.floor(item.balance / item.monthlyFee);
      const remarkText = item.remark ? `\n📝 备注: ${tg(item.remark)}` : '';
      const currSym = CURRENCY_SYMBOLS[item.currency] || item.currency || '¥';

      let urgency;
      if (diffDays < 0) urgency = '❌';
      else if (diffDays === 0) urgency = '🚨';
      else if (diffDays <= 3) urgency = '⚠️';
      else urgency = '📢';

      const statusText = diffDays < 0
        ? `已停机 ${Math.abs(diffDays)} 天`
        : diffDays === 0
          ? '今天扣费！余额可能不足'
          : `预计 ${diffDays} 天后停机`;

      messages.push(
        `${urgency} 【话费停机提醒】\n` +
        `📱 名称: ${tg(item.name)}\n` +
        (item.number ? `📞 号码: ${tg(item.number)}\n` : '') +
        `💰 余额: ${currSym}${item.balance}\n` +
        `💸 月租: ${currSym}${item.monthlyFee}/月\n` +
        `📅 每月${item.billingDay}日扣费\n` +
        `⏳ ${statusText}\n` +
        `🔋 可撑 ${monthsLeft} 个月\n` +
        `📆 预计停机: ${suspendDate}${remarkText}\n` +
        (diffDays >= 0 ? `👉 请尽快充值！` : '')
      );
      continue;
    }

    // === eSIM / Subscription: expire-date based reminder ===
    if (!item.expireDate) continue;

    const expDate = new Date(item.expireDate + 'T00:00:00Z');
    expDate.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / 86_400_000);

    const remindDays = Array.isArray(item.remindDays) && item.remindDays.length > 0
      ? item.remindDays
      : DEFAULT_REMIND_DAYS;

    // Check if today matches any remind day
    if (!remindDays.includes(diffDays)) continue;

    const cycleText = item.cycle ? `${item.cycle}天` : '未设置';
    const remarkText = item.remark ? `\n📝 备注: ${tg(item.remark)}` : '';
    const typeLabel = item.type === 'esim' ? 'eSIM 保号' : '订阅续费';
    const typeEmoji = item.type === 'esim' ? '📱' : '📦';
    const priceText = item.price ? `\n💰 费用: ${currSym(item.currency)}${item.price}/${item.billing === 'yearly' ? '年' : item.billing === 'once' ? '次' : '月'}` : '';

    let urgency;
    if (diffDays < 0) urgency = '❌';
    else if (diffDays === 0) urgency = '🚨';
    else if (diffDays <= 3) urgency = '⚠️';
    else urgency = '📢';

    const statusText = diffDays < 0
      ? `已过期 ${Math.abs(diffDays)} 天`
      : diffDays === 0
        ? '今天到期！'
        : `剩余 ${diffDays} 天`;

    messages.push(
      `${urgency} 【${typeLabel}提醒】\n` +
      `${typeEmoji} 名称: ${tg(item.name)}\n` +
      (item.number ? `📞 号码: ${tg(item.number)}\n` : '') +
      priceText +
      `\n🔄 周期: ${cycleText}\n` +
      `📅 到期: ${item.expireDate}\n` +
      `⏳ ${statusText}${remarkText}\n` +
      (diffDays > 0 ? `👉 请尽快处理！` : '')
    );
  }

  if (messages.length > 0) {
    const text = messages.join('\n\n---\n\n');
    await sendNotifications(env, text, { title: 'Sub-Tracker 到期提醒' });
  }
}
