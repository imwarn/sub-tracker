/**
 * Items CRUD handlers - unified for eSIM cards and subscriptions
 *
 * Routes:
 *   GET    /api/items              - List all items (optional ?type=esim|subscription)
 *   POST   /api/items              - Create new item
 *   PUT    /api/items/:id          - Update item
 *   DELETE /api/items/:id          - Delete item
 *   POST   /api/items/:id/renew    - One-click renew
 *   GET    /api/items/export/json  - Export all as JSON
 *   GET    /api/items/export/csv   - Export all as CSV
 *   POST   /api/items/import/json  - Import from JSON
 */

import { downloadResponse, errorResponse, successResponse, jsonResponse, corsPreFlight } from '../utils/response.js';
import { requireAuth } from './auth.js';
import { createItem, validateItem, mergeUpdate } from '../data/schema.js';
import { addHistory, getAllItems, addItem, updateItem, deleteItem, saveAllItems, getItemById } from '../data/store.js';
import { addDays, daysUntil, getStatusText, calcSuspendDate } from '../utils/date.js';
import { escapeTelegramHTML } from '../services/telegram.js';
import { getConfiguredNotificationChannels, sendNotifications } from '../services/notify.js';
import { CURRENCY_SYMBOLS, ITEM_TYPES } from '../data/constants.js';

function tg(s) {
  return escapeTelegramHTML(s);
}

async function recordHistory(env, action, item, details = {}) {
  try {
    await addHistory(env.DB, {
      action,
      itemId: item?.id || '',
      itemName: item?.name || '',
      itemType: item?.type || '',
      details,
    });
  } catch (err) {
    console.error('History write failed:', err);
  }
}

export async function handleItems(request, env, path) {
  if (request.method === 'OPTIONS') return corsPreFlight();

  // Auth check for all item routes
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;

  // GET /api/items/export/json
  if (path === '/api/items/export/json' && request.method === 'GET') {
    return await exportJSON(env);
  }

  // GET /api/items/export/csv
  if (path === '/api/items/export/csv' && request.method === 'GET') {
    return await exportCSV(env);
  }

  // POST /api/items/import/json
  if (path === '/api/items/import/json' && request.method === 'POST') {
    return await importJSON(request, env);
  }

  // GET /api/items
  if (path === '/api/items' && request.method === 'GET') {
    return await listItems(request, env);
  }

  // POST /api/items
  if (path === '/api/items' && request.method === 'POST') {
    return await createNewItem(request, env);
  }

  // Route with ID: /api/items/:id[/action]
  const idMatch = path.match(/^\/api\/items\/([^/]+)(\/.*)?$/);
  if (idMatch) {
    const id = idMatch[1];
    const action = idMatch[2] || '';

    if (request.method === 'PUT' && action === '') {
      return await updateExistingItem(request, env, id);
    }

    if (request.method === 'DELETE' && action === '') {
      return await deleteExistingItem(env, id);
    }

    if (request.method === 'POST' && action === '/renew') {
      return await renewItem(env, id);
    }

    if (request.method === 'POST' && action === '/recharge') {
      return await rechargeItem(request, env, id);
    }

    if (request.method === 'POST' && action === '/test-notify') {
      return await testNotify(env, id);
    }
  }

  return null;
}

async function listItems(request, env) {
  const url = new URL(request.url);
  const typeFilter = url.searchParams.get('type');

  let items = await getAllItems(env.DB);
  if (typeFilter) {
    items = items.filter(i => i.type === typeFilter);
  }

  return jsonResponse(items);
}

async function createNewItem(request, env) {
  try {
    const body = await request.json();
    const type = body.type || 'esim';

    if (!ITEM_TYPES.includes(type)) {
      return errorResponse('无效的类型');
    }

    const err = validateItem(type, body);
    if (err) return errorResponse(err);

    const item = createItem(type, body);
    await addItem(env.DB, item);
    await recordHistory(env, 'create', item);
    return successResponse({ id: item.id });
  } catch {
    return errorResponse('参数错误', 400);
  }
}

async function updateExistingItem(request, env, id) {
  try {
    const body = await request.json();
    const result = await updateItem(env.DB, id, existing => {
      const updated = mergeUpdate(existing, body);
      const err = validateItem(updated.type, updated);
      if (err) throw new Error(err);
      return updated;
    });

    if (!result) return errorResponse('未找到记录', 404);
    await recordHistory(env, 'update', result);
    return successResponse();
  } catch (e) {
    return errorResponse(e.message || '更新失败', 400);
  }
}

async function deleteExistingItem(env, id) {
  const deleted = await deleteItem(env.DB, id);
  if (!deleted) return errorResponse('未找到记录', 404);
  await recordHistory(env, 'delete', deleted);
  return successResponse();
}

async function renewItem(env, id) {
  try {
    const result = await updateItem(env.DB, id, existing => {
      if (existing.type !== 'esim') {
        throw new Error('仅 eSIM 类型支持一键续期');
      }
      if (!existing.cycle) {
        throw new Error('未设置保号周期，无法续期');
      }
      const newExpire = addDays(existing.expireDate, existing.cycle);
      return { ...existing, expireDate: newExpire, status: 'active' };
    });

    if (!result) return errorResponse('未找到记录', 404);
    await recordHistory(env, 'renew', result, { newExpireDate: result.expireDate });
    return successResponse({ newExpireDate: result.expireDate });
  } catch (e) {
    return errorResponse(e.message || '续期失败', 400);
  }
}

async function rechargeItem(request, env, id) {
  try {
    const body = await request.json();
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount === 0) {
      return errorResponse('金额不能为空或为零');
    }

    const result = await updateItem(env.DB, id, existing => {
      if (existing.type !== 'balance') {
        throw new Error('仅话费类型支持充值');
      }
      const newBalance = Math.round((existing.balance + amount) * 100) / 100;
      const newSuspendDate = calcSuspendDate(newBalance, existing.monthlyFee, existing.billingDay);
      return {
        ...existing,
        balance: newBalance,
        lastRecharge: { amount, date: new Date().toISOString().split('T')[0], note: body.note || '' },
        predictedSuspendDate: newSuspendDate,
      };
    });

    if (!result) return errorResponse('未找到记录', 404);
    await recordHistory(env, 'recharge', result, {
      amount,
      newBalance: result.balance,
      predictedSuspendDate: result.predictedSuspendDate,
    });
    return successResponse({
      newBalance: result.balance,
      predictedSuspendDate: result.predictedSuspendDate,
    });
  } catch (e) {
    return errorResponse(e.message || '充值失败', 400);
  }
}

// ==================== EXPORT / IMPORT ====================

async function exportJSON(env) {
  const items = await getAllItems(env.DB);
  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    count: items.length,
    items: items.map(({ id, createdAt, ...rest }) => rest), // strip id/createdAt for clean import
  };

  return downloadResponse(
    JSON.stringify(exportData, null, 2),
    'application/json',
    `sub-tracker-${new Date().toISOString().split('T')[0]}.json`
  );
}

async function exportCSV(env) {
  const items = await getAllItems(env.DB);
  const headers = ['类型', '名称', '号码', '分类', '到期日期', '周期(天)', '费用/余额', '货币', '自动续费/月租', '扣费日', '状态', '备注'];

  const rows = items.map(item => {
    const typeLabel = item.type === 'esim' ? 'eSIM' : item.type === 'balance' ? '话费' : '订阅';
    const priceOrBalance = item.type === 'balance'
      ? (item.balance != null ? item.balance : '')
      : (item.price || '');
    const autoRenewOrFee = item.type === 'balance'
      ? (item.monthlyFee || '')
      : (item.autoRenew ? '是' : '否');
    const billingDay = item.type === 'balance' ? (item.billingDay || '') : '';
    return [
      typeLabel,
      csvEscape(item.name),
      csvEscape(item.number || ''),
      csvEscape(item.category || ''),
      item.expireDate || '',
      item.cycle || '',
      priceOrBalance,
      item.currency || 'CNY',
      autoRenewOrFee,
      billingDay,
      item.status === 'active' ? '启用' : '停用',
      csvEscape(item.remark || ''),
    ].join(',');
  });

  const bom = '\uFEFF'; // Excel UTF-8 BOM
  const csv = bom + [headers.join(','), ...rows].join('\n');

  return downloadResponse(
    csv,
    'text/csv; charset=utf-8',
    `sub-tracker-${new Date().toISOString().split('T')[0]}.csv`
  );
}

function csvEscape(s) {
  if (!s) return '';
  s = String(s);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function importJSON(request, env) {
  try {
    const body = await request.json();
    const importedItems = body.items || body;

    if (!Array.isArray(importedItems)) {
      return errorResponse('数据格式错误：需要 items 数组');
    }

    const existing = await getAllItems(env.DB);
    let added = 0;
    let skipped = 0;
    const errors = [];

    for (const [index, raw] of importedItems.entries()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        skipped++;
        errors.push({ index, message: '记录必须是对象' });
        continue;
      }

      const type = raw.type || 'esim';
      if (!ITEM_TYPES.includes(type)) {
        skipped++;
        errors.push({ index, message: '无效的类型' });
        continue;
      }

      const err = validateItem(type, raw);
      if (err) {
        skipped++;
        errors.push({ index, name: raw.name || '', message: err });
        continue;
      }

      const item = createItem(type, raw);
      existing.push(item);
      added++;
    }

    await saveAllItems(env.DB, existing);
    await recordHistory(env, 'import', null, { added, skipped, total: existing.length });
    return successResponse({ added, skipped, total: existing.length, errors: errors.slice(0, 10) });
  } catch {
    return errorResponse('导入失败：JSON 解析错误', 400);
  }
}

async function testNotify(env, id) {
  const item = await getItemById(env.DB, id);
  if (!item) return errorResponse('未找到记录', 404);

  const channels = await getConfiguredNotificationChannels(env);
  if (!channels.length) {
    return errorResponse('未配置通知渠道。请至少配置 Telegram、Bark、企业微信或 Webhook 中的一种');
  }

  if (item.type === 'balance') {
    const suspendDate = item.predictedSuspendDate || '未计算';
    const sym = CURRENCY_SYMBOLS[item.currency] || item.currency || '¥';
    const monthsLeft = item.monthlyFee > 0 ? Math.floor(item.balance / item.monthlyFee) : 0;
    const msg = [
      `⚠️ <b>【Sub-Tracker 话费停机 · 测试通知】</b>`,
      '',
      `📱 名称: ${tg(item.name)}`,
      item.number ? `📞 号码: ${tg(item.number)}` : '',
      `💰 余额: ${sym}${item.balance}`,
      `💸 月租: ${sym}${item.monthlyFee}/月`,
      `📅 每月${item.billingDay}日扣费`,
      `🔋 可撑 ${monthsLeft} 个月`,
      `📆 预计停机: ${suspendDate}`,
      item.remark ? `📝 备注: ${tg(item.remark)}` : '',
      '',
      '<i>这是一条测试通知，确认通知功能正常。</i>',
    ].filter(Boolean).join('\n');
    const results = await sendNotifications(env, msg, { title: 'Sub-Tracker 测试通知' });
    if (results.some(r => r.ok)) return successResponse({ channels: results });
    return errorResponse('发送失败，请检查通知配置');
  }

  const diff = daysUntil(item.expireDate);
  const statusText = getStatusText(diff);
  const emoji = diff <= 0 ? '🚨' : (diff <= 15 ? '⚠️' : '📢');
  const typeLabel = item.type === 'esim' ? 'eSIM 保号' : '订阅续费';

  const msg = [
    `${emoji} <b>【Sub-Tracker ${typeLabel} · 测试通知】</b>`,
    '',
    `📦 名称: ${tg(item.name)}`,
    item.number ? `📞 号码: ${tg(item.number)}` : '',
    item.category ? `🏷️ 分类: ${tg(item.category)}` : '',
    `📅 到期: ${item.expireDate}`,
    `⏳ 状态: ${statusText}`,
    item.remark ? `📝 备注: ${tg(item.remark)}` : '',
    '',
    '<i>这是一条测试通知，确认通知功能正常。</i>',
  ].filter(Boolean).join('\n');

  const results = await sendNotifications(env, msg, { title: 'Sub-Tracker 测试通知' });
  if (results.some(r => r.ok)) return successResponse({ channels: results });
  return errorResponse('发送失败，请检查通知配置');
}
