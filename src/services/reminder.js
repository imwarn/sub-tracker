/**
 * Reminder service - checks item expiration and sends notifications
 *
 * Uses per-item remindDays array (e.g. [30, 15, 3, 1, 0])
 * 0 = today, 1 = 1 day before, etc.
 */

import { getAllItems, getConfig } from '../data/store.js';
import { sendTelegram } from './telegram.js';
import { todayMidnight } from '../utils/date.js';

const DEFAULT_REMIND_DAYS = [3, 1, 0]; // fallback

/**
 * Run the reminder check (called by Cron trigger)
 */
export async function checkReminders(env) {
  let tgToken = env.TG_BOT_TOKEN;
  let tgChat = env.TG_CHAT_ID;
  try {
    if (!tgToken) tgToken = await getConfig(env.DB, 'TG_BOT_TOKEN');
    if (!tgChat) tgChat = await getConfig(env.DB, 'TG_CHAT_ID');
  } catch {}

  if (!tgToken || !tgChat) return;

  const items = await getAllItems(env.DB);
  if (!items.length) return;

  const today = todayMidnight();
  const messages = [];

  for (const item of items) {
    if (item.status !== 'active') continue;
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
    const remarkText = item.remark ? `\n📝 备注: ${item.remark}` : '';
    const typeLabel = item.type === 'esim' ? 'eSIM 保号' : '订阅续费';
    const typeEmoji = item.type === 'esim' ? '📱' : '📦';

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
      `${typeEmoji} 名称: ${item.name}\n` +
      (item.number ? `📞 号码: ${item.number}\n` : '') +
      `🔄 周期: ${cycleText}\n` +
      `📅 到期: ${item.expireDate}\n` +
      `⏳ ${statusText}${remarkText}\n` +
      (diffDays > 0 ? `👉 请尽快处理！` : '')
    );
  }

  if (messages.length > 0) {
    const text = messages.join('\n\n---\n\n');
    await sendTelegram(tgToken, tgChat, text);
  }
}
