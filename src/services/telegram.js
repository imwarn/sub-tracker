/**
 * Telegram notification service
 */

export function escapeTelegramHTML(value) {
  return value == null
    ? ''
    : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
}

/**
 * Send a message via Telegram Bot API
 * @param {string} token - Bot token
 * @param {string} chatId - Chat ID
 * @param {string} text - Message text (HTML supported)
 * @returns {Promise<boolean>}
 */
export async function sendTelegram(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.ok;
}
