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

import { errorResponse, successResponse, jsonResponse, corsPreFlight } from '../utils/response.js';
import { requireAuth } from './auth.js';
import { createItem, validateItem, mergeUpdate } from '../data/schema.js';
import { getAllItems, addItem, updateItem, deleteItem, saveAllItems, getItemById } from '../data/store.js';
import { addDays } from '../utils/date.js';

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

    if (!['esim', 'subscription'].includes(type)) {
      return errorResponse('无效的类型');
    }

    const err = validateItem(type, body);
    if (err) return errorResponse(err);

    const item = createItem(type, body);
    await addItem(env.DB, item);
    return successResponse({ id: item.id });
  } catch {
    return errorResponse('参数错误', 400);
  }
}

async function updateExistingItem(request, env, id) {
  try {
    const body = await request.json();
    const result = await updateItem(env.DB, id, existing => {
      return mergeUpdate(existing, body);
    });

    if (!result) return errorResponse('未找到记录', 404);
    return successResponse();
  } catch {
    return errorResponse('更新失败', 400);
  }
}

async function deleteExistingItem(env, id) {
  const ok = await deleteItem(env.DB, id);
  if (!ok) return errorResponse('未找到记录', 404);
  return successResponse();
}

async function renewItem(env, id) {
  const result = await updateItem(env.DB, id, existing => {
    if (!existing.cycle) {
      throw new Error('未设置保号周期，无法续期');
    }
    const newExpire = addDays(existing.expireDate, existing.cycle);
    return { ...existing, expireDate: newExpire, status: 'active' };
  });

  if (!result) return errorResponse('未找到记录', 404);
  return successResponse({ newExpireDate: result.expireDate });
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

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename=sub-tracker-${new Date().toISOString().split('T')[0]}.json`,
    },
  });
}

async function exportCSV(env) {
  const items = await getAllItems(env.DB);
  const headers = ['类型', '名称', '号码', '分类', '到期日期', '周期(天)', '费用', '货币', '自动续费', '状态', '备注'];

  const rows = items.map(item => {
    const typeLabel = item.type === 'esim' ? 'eSIM' : '订阅';
    return [
      typeLabel,
      csvEscape(item.name),
      csvEscape(item.number || ''),
      csvEscape(item.category || ''),
      item.expireDate || '',
      item.cycle || '',
      item.price || '',
      item.currency || 'CNY',
      item.autoRenew ? '是' : '否',
      item.status === 'active' ? '启用' : '停用',
      csvEscape(item.remark || ''),
    ].join(',');
  });

  const bom = '\uFEFF'; // Excel UTF-8 BOM
  const csv = bom + [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=sub-tracker-${new Date().toISOString().split('T')[0]}.csv`,
    },
  });
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

    for (const raw of importedItems) {
      const type = raw.type || 'esim';
      if (!['esim', 'subscription'].includes(type)) continue;

      const item = createItem(type, raw);
      existing.push(item);
      added++;
    }

    await saveAllItems(env.DB, existing);
    return successResponse({ added, total: existing.length });
  } catch {
    return errorResponse('导入失败：JSON 解析错误', 400);
  }
}

async function testNotify(env, id) {
  const { getConfig } = await import('../data/store.js');
  const { sendTelegram } = await import('../services/telegram.js');
  const { daysUntil, getStatusText } = await import('../utils/date.js');

  const item = await getItemById(env.DB, id);
  if (!item) return errorResponse('未找到记录', 404);

  let tgToken = env.TG_BOT_TOKEN;
  let tgChat = env.TG_CHAT_ID;
  try {
    if (!tgToken) tgToken = await getConfig(env.DB, 'TG_BOT_TOKEN');
    if (!tgChat) tgChat = await getConfig(env.DB, 'TG_CHAT_ID');
  } catch {}

  if (!tgToken || !tgChat) {
    return errorResponse('TG 密钥未配置，无法发送测试通知');
  }

  const diff = daysUntil(item.expireDate);
  const statusText = getStatusText(diff);
  const emoji = diff <= 0 ? '🚨' : (diff <= 15 ? '⚠️' : '📢');
  const typeLabel = item.type === 'esim' ? 'eSIM 保号' : '订阅续费';

  const msg = [
    `${emoji} <b>【${typeLabel} · 测试通知】</b>`,
    '',
    `📦 名称: ${item.name}`,
    item.number ? `📞 号码: ${item.number}` : '',
    item.category ? `🏷️ 分类: ${item.category}` : '',
    `📅 到期: ${item.expireDate}`,
    `⏳ 状态: ${statusText}`,
    item.remark ? `📝 备注: ${item.remark}` : '',
    '',
    '<i>这是一条测试通知，确认通知功能正常。</i>',
  ].filter(Boolean).join('\n');

  const ok = await sendTelegram(tgToken, tgChat, msg);
  if (ok) return successResponse();
  return errorResponse('发送失败，请检查 TG 配置');
}
