/**
 * Auto-deduct monthly fee for balance-type items on their billing day.
 *
 * Called by the daily Cron trigger alongside checkReminders.
 */

import { getAllItems, updateItem, addHistory } from '../data/store.js';
import { calcSuspendDate, todayString } from '../utils/date.js';
import { sendNotifications } from './notify.js';
import { escapeTelegramHTML } from './telegram.js';
import { CURRENCY_SYMBOLS } from '../data/constants.js';

function tg(s) { return escapeTelegramHTML(s); }
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }

/**
 * Run auto-deduction for balance items whose billingDay matches today.
 */
export async function autoDeduct(env) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;

  const today = todayString(); // "YYYY-MM-DD"
  const todayDay = parseInt(today.split('-')[2], 10); // day of month

  for (const item of items) {
    if (item.type !== 'balance') continue;
    if (item.status !== 'active') continue;
    if (!item.monthlyFee || item.monthlyFee <= 0) continue;
    if (!item.billingDay) continue;

    // Check if today is the billing day
    if (todayDay !== item.billingDay) continue;

    // Dedup: skip if already deducted today
    if (item.lastDeductDate === today) continue;

    const fee = item.monthlyFee;
    const oldBalance = item.balance;
    const newBalance = Math.round((oldBalance - fee) * 100) / 100;

    if (newBalance < 0) {
      // Balance insufficient - send alert but still deduct (will go negative)
      const sym = currSym(item.currency);
      const msg = [
        `🚨 <b>【Sub-Tracker 余额不足】</b>`,
        '',
        `📱 名称: ${tg(item.name)}`,
        item.number ? `📞 号码: ${tg(item.number)}` : '',
        `💰 扣费前余额: ${sym}${oldBalance}`,
        `💸 本月月租: ${sym}${fee}`,
        `⚠️ 扣费后余额: ${sym}${newBalance}`,
        `📅 每月${item.billingDay}日扣费`,
        item.remark ? `📝 备注: ${tg(item.remark)}` : '',
        '',
        '请尽快充值，避免停机！',
      ].filter(Boolean).join('\n');
      await sendNotifications(env, msg);
    }

    // Deduct
    const newSuspendDate = calcSuspendDate(newBalance, fee, item.billingDay);
    const updated = await updateItem(env.DB, item.id, existing => ({
      ...existing,
      balance: newBalance,
      predictedSuspendDate: newSuspendDate,
      lastDeductDate: today,
    }));

    if (updated) {
      await addHistory(env.DB, {
        action: 'deduct',
        itemId: item.id,
        itemName: item.name,
        details: {
          fee,
          oldBalance,
          newBalance,
          billingDay: item.billingDay,
        },
      }).catch(() => {}); // non-critical

      console.log(`Auto-deducted ${fee} from "${item.name}" (${oldBalance} → ${newBalance})`);
    }
  }
}
