/**
 * Simple request router
 * Matches URL paths to handler functions
 */

import { corsPreFlight, errorResponse, htmlResponse } from './utils/response.js';
import { handleAuth } from './handlers/auth.js';
import { handleItems } from './handlers/items.js';
import { getHTML } from './ui/template.js';

/**
 * Route a request to the appropriate handler
 */
export async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight for all API routes
  if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
    return corsPreFlight();
  }

  // Auth routes
  if (path.startsWith('/api/auth')) {
    const result = await handleAuth(request, env, path);
    if (result) return result;
  }

  // Items routes
  if (path.startsWith('/api/items')) {
    const result = await handleItems(request, env, path);
    if (result) return result;
  }

  // Serve the frontend (all non-API routes)
  if (!path.startsWith('/api/')) {
    return htmlResponse(getHTML());
  }

  return errorResponse('Not Found', 404);
}
