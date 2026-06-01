/**
 * Items CRUD handlers - unified for eSIM cards and subscriptions
 *
 * Routes:
 *   GET    /api/items          - List all items (optional ?type=esim|subscription)
 *   POST   /api/items          - Create new item
 *   PUT    /api/items/:id      - Update item
 *   DELETE /api/items/:id      - Delete item
 *   POST   /api/items/:id/renew - One-click renew (extend expireDate by cycle)
 */

import { errorResponse, successResponse, jsonResponse, corsPreFlight } from '../utils/response.js';
import { requireAuth } from './auth.js';
import { createItem, validateItem, mergeUpdate } from '../data/schema.js';
import { getAllItems, addItem, updateItem, deleteItem, saveAllItems } from '../data/store.js';
import { addDays } from '../utils/date.js';

export async function handleItems(request, env, path) {
  if (request.method === 'OPTIONS') return corsPreFlight();

  // Auth check for all item routes
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;

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
