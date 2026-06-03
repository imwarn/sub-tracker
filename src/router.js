/**
 * Simple request router
 * Matches URL paths to handler functions
 */

import { binaryResponse, corsPreFlight, errorResponse, htmlResponse, svgResponse, textResponse } from './utils/response.js';
import { handleAuth } from './handlers/auth.js';
import { handleHistory } from './handlers/history.js';
import { handleItems } from './handlers/items.js';
import { getFaviconICO, getHTML, getIconPNG, getIconSVG, getManifest, getServiceWorker } from './ui/template.js';

/**
 * Route a request to the appropriate handler
 */
export async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight for all API routes
  if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
    return corsPreFlight(request);
  }

  if (path === '/manifest.webmanifest') {
    return textResponse(JSON.stringify(getManifest()), 'application/manifest+json', request);
  }

  if (path === '/sw.js') {
    return textResponse(getServiceWorker(), 'application/javascript; charset=utf-8', request);
  }

  if (path === '/icon.svg') {
    return svgResponse(getIconSVG(), request);
  }

  if (path === '/icon-192.png') {
    return binaryResponse(getIconPNG(192), 'image/png', undefined, request);
  }

  if (path === '/icon-512.png') {
    return binaryResponse(getIconPNG(512), 'image/png', undefined, request);
  }

  if (path === '/favicon.ico') {
    return binaryResponse(getFaviconICO(), 'image/x-icon', undefined, request);
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

  if (path.startsWith('/api/history')) {
    return await handleHistory(request, env, path);
  }

  // Serve the frontend (all non-API routes)
  if (!path.startsWith('/api/')) {
    return htmlResponse(getHTML(), request);
  }

  return errorResponse('Not Found', 404, request);
}
