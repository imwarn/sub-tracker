/**
 * Sub-Tracker - Cloudflare Worker entry point
 *
 * eSIM 保号 & 订阅费用管理看板
 * Built on Cloudflare Workers + KV
 */

import { route } from './router.js';
import { checkReminders } from './services/reminder.js';

export default {
  /**
   * Handle HTTP requests
   */
  async fetch(request, env, ctx) {
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

  /**
   * Handle scheduled (cron) triggers
   * Runs daily to check for expiring items and send reminders
   */
  async scheduled(event, env, ctx) {
    try {
      await checkReminders(env);
    } catch (err) {
      console.error('Cron error:', err);
    }
  },
};
