/**
 * Sub-Tracker - Cloudflare Worker entry point
 */

import { route } from './router.js';
import { checkReminders } from './services/reminder.js';
import { jsonResponse } from './utils/response.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Debug endpoint - check which env vars are set (no values exposed)
    if (url.pathname === '/api/debug' && url.searchParams.get('key') === 'subtracker') {
      return jsonResponse({
        has_TG_BOT_TOKEN: !!env.TG_BOT_TOKEN,
        has_TG_CHAT_ID: !!env.TG_CHAT_ID,
        has_DB: !!env.DB,
        tg_token_len: env.TG_BOT_TOKEN ? env.TG_BOT_TOKEN.length : 0,
        tg_chat_val: env.TG_CHAT_ID || '(empty)',
        env_keys: Object.keys(env).filter(k => !k.startsWith('__')),
      });
    }

    try {
      return await route(request, env);
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      await checkReminders(env);
    } catch (err) {
      console.error('Cron error:', err);
    }
  },
};
