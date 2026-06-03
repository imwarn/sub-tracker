/**
 * Activity history handlers
 */

import { requireAuth } from './auth.js';
import { clearHistory, getHistory } from '../data/store.js';
import { corsPreFlight, errorResponse, jsonResponse, successResponse } from '../utils/response.js';

export async function handleHistory(request, env, path) {
  if (request.method === 'OPTIONS') return corsPreFlight(request);

  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;

  if (path === '/api/history' && request.method === 'GET') {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 100));
    return jsonResponse(await getHistory(env.DB, limit));
  }

  if (path === '/api/history' && request.method === 'DELETE') {
    await clearHistory(env.DB);
    return successResponse();
  }

  return errorResponse('Not Found', 404);
}
