/**
 * Auto-renew service for subscriptions with autoRenew: true.
 *
 * Called by the daily Cron trigger alongside checkReminders and autoDeduct.
 */

import { getAllItems, updateItem, addHistory } from '../data/store.js';
import { addBillingPeriod, todayString } from '../utils/date.js';
import { sendNotifications } from './notify.js';
import { escapeTelegramHTML } from './telegram.js';
import { CURRENCY_SYMBOLS } from '../data/constants.js';

function tg(s) { return escapeTelegramHTML(s); }
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }

/**
 * Run auto-renew for subscriptions whose expireDate has arrived and autoRenew is true.
 */
export async function autoRenewSubscriptions(env, now = new Date()) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;

  const today = todayString(now);

  for (const item of items) {
    if (item.type !== 'subscription') continue;
    if (item.status !== 'active') continue;
    if (!item.autoRenew) continue;
    if (!item.expireDate) continue;
    if (item.billing === 'once') continue;

    // Check if subscription has reached or passed expiry date
    if (item.expireDate <= today) {
      const mode = item.billingMode || 'natural';
      const baseDate = item.expireDate;
      const newExpireDate = addBillingPeriod(baseDate, item.billing, mode, item.cycleDays);

      const updated = await updateItem(env.DB, item.id, existing => ({
        ...existing,
        expireDate: newExpireDate,
      }));

      if (updated) {
        await addHistory(env.DB, {
          action: 'renew',
          itemId: item.id,
          itemName: item.name,
          itemType: 'subscription',
          details: {
            oldExpireDate: baseDate,
            newExpireDate,
            auto: true,
          },
        }).catch(() => {});

        const sym = currSym(item.currency);
        const priceText = item.price ? `\n💰 续费金额: ${sym}${item.price}` : '';
        const msg = [
          `🔄 <b>【Sub-Tracker 订阅自动续费】</b>`,
          '',
          `📦 订阅名称: ${tg(item.name)}`,
          item.category ? `🏷️ 分类: ${tg(item.category)}` : '',
          priceText,
          `📅 上期到期: ${baseDate}`,
          `🎉 新到期日: <b>${newExpireDate}</b>`,
          item.remark ? `📝 备注: ${tg(item.remark)}` : '',
          '',
          '<i>系统已根据设置自动顺延下一个计费周期。</i>',
        ].filter(Boolean).join('\n');

        await sendNotifications(env, msg, { title: 'Sub-Tracker 自动续费' }).catch(() => {});
        console.log(`Auto-renewed subscription "${item.name}" (${baseDate} → ${newExpireDate})`);
      }
    }
  }
}
