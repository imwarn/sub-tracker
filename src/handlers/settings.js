/**
 * App Settings & Presets Handlers
 *
 * Routes:
 *   GET  /api/settings  - Get current user preferences and exchange rates
 *   PUT  /api/settings  - Update preferences and exchange rates
 */

import { requireAuth } from './auth.js';
import { addHistory, getSettings, saveSettings } from '../data/store.js';
import { corsPreFlight, errorResponse, jsonResponse, successResponse } from '../utils/response.js';

export async function handleSettings(request, env, path) {
  if (request.method === 'OPTIONS') return corsPreFlight(request, env);

  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;

  // GET /api/settings
  if (path === '/api/settings' && request.method === 'GET') {
    const settings = await getSettings(env.DB);
    return successResponse(settings, request, env);
  }

  // PUT /api/settings or POST /api/settings
  if (path === '/api/settings' && (request.method === 'PUT' || request.method === 'POST')) {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('无效的 JSON 数据', 400, request, env);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('请求参数格式不正确', 400, request, env);
    }

    const current = await getSettings(env.DB);
    const updated = { ...current };

    if (body.baseCurrency) {
      const cur = String(body.baseCurrency).toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(cur)) {
        return errorResponse('基准货币格式不正确 (须为 3 位字母代码)', 400, request, env);
      }
      updated.baseCurrency = cur;
    }

    if (body.exchangeRates && typeof body.exchangeRates === 'object') {
      const cleanRates = {};
      for (const [key, val] of Object.entries(body.exchangeRates)) {
        const k = String(key).toUpperCase().trim();
        const v = Number(val);
        if (/^[A-Z]{3}$/.test(k) && Number.isFinite(v) && v > 0) {
          cleanRates[k] = v;
        }
      }
      updated.exchangeRates = { ...updated.exchangeRates, ...cleanRates };
    }

    if (Array.isArray(body.categories)) {
      const cats = body.categories
        .map(c => String(c).trim())
        .filter(c => c.length > 0 && c.length <= 40);
      updated.categories = [...new Set(cats)];
    }

    if (Array.isArray(body.regions)) {
      updated.regions = body.regions
        .filter(r => r && (typeof r === 'string' || typeof r === 'object'))
        .map(r => {
          if (typeof r === 'string') return { code: r.toUpperCase().trim(), name: r.trim(), flag: '🌐' };
          return {
            code: String(r.code || '').toUpperCase().trim(),
            name: String(r.name || r.code || '').trim(),
            flag: String(r.flag || '🌐').trim(),
          };
        })
        .filter(r => r.code.length > 0);
    }

    if (Array.isArray(body.defaultRemindDays)) {
      const days = body.defaultRemindDays
        .map(d => Number(d))
        .filter(d => Number.isInteger(d) && d >= 0 && d <= 365);
      if (days.length > 0) {
        updated.defaultRemindDays = [...new Set(days)].sort((a, b) => b - a);
      }
    }

    await saveSettings(env.DB, updated);

    try {
      await addHistory(env.DB, {
        action: 'update_settings',
        details: { baseCurrency: updated.baseCurrency },
      });
    } catch (err) {
      console.error('History write failed for settings:', err);
    }

    return successResponse(updated, request, env);
  }

  return errorResponse('Not Found', 404, request, env);
}
