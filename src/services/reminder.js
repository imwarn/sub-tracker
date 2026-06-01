/**
 * Reminder service - checks item expiration and sends notifications
 *
 * Reminder logic:
 *   - 15 days before: ⚠️ warning
 *   - Today: 🚨 urgent
 *   - Overdue (every 7 days): ❌ alert
 */

import { getAllItems, getConfig } from '../data/store.js';
import { sendTelegram } from './telegram.js';
import { todayMidnight } from '../utils/date.js';

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
    const cycleText = item.cycle ? `${item.cycle}天` : '未设置';
    const remarkText = item.remark ? `\n📝 备注: ${item.remark}` : '';

    const typeLabel = item.type === 'esim' ? 'eSIM 保号' : '订阅续费';
    const typeEmoji = item.type === 'esim' ? '📱' : '📦';

    // 15 days before
    if (diffDays > 0 && diffDays <= 15) {
      messages.push(
        `⚠️ 【${typeLabel}提醒】\n` +
        `${typeEmoji} 名称: ${item.name}\n` +
        (item.number ? `📞 号码: ${item.number}\n` : '') +
        `🔄 周期: ${cycleText}\n` +
        `📅 到期: ${item.expireDate}\n` +
        `⏳ 剩余: ${diffDays} 天！${remarkText}\n` +
        `👉 请尽快处理！`
      );
    }

    // Today
    if (diffDays === 0) {
      messages.push(
        `🚨 【${typeLabel}紧急提醒】\n` +
        `${typeEmoji} ${item.name} 今天到期！${remarkText}`
      );
    }

    // Overdue (every 7 days)
    if (diffDays < 0 && Math.abs(diffDays) % 7 === 0) {
      messages.push(
        `❌ 【${typeLabel}停机警告】\n` +
        `${typeEmoji} ${item.name} 已过期 ${Math.abs(diffDays)} 天。${remarkText}`
      );
    }
  }

  if (messages.length > 0 && tgToken && tgChat) {
    const text = messages.join('\n\n---\n\n');
    await sendTelegram(tgToken, tgChat, text);
  }
}
