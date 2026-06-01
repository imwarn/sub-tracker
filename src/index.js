/**
 * Sub-Tracker - Cloudflare Worker entry point
 */

import { route } from './router.js';
import { checkReminders } from './services/reminder.js';

export default {
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

  async scheduled(event, env, ctx) {
    try {
      await checkReminders(env);
    } catch (err) {
      console.error('Cron error:', err);
    }
  },
};
