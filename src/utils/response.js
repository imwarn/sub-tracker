/**
 * HTTP Response helpers with CORS support
 */

const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const CORS_REQUEST_HEADERS = 'Content-Type, Authorization';

/**
 * Build CORS headers dynamically.
 * Priority: ALLOWED_ORIGIN env > request Origin (same-origin fallback).
 * ALLOWED_ORIGIN supports comma-separated multiple domains.
 */
function buildCorsHeaders(request, env = null) {
  const allowed = (env?.ALLOWED_ORIGIN || '').trim();
  let origin = '';
  try { origin = request?.headers?.get('Origin') || ''; } catch {}

  if (allowed) {
    const origins = allowed.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    // If origin matches one of the allowed origins, echo it; otherwise use the first allowed origin
    origin = origins.includes(origin) ? origin : origins[0];
  } else if (!origin) {
    origin = '*';
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_REQUEST_HEADERS,
  };
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function jsonResponse(data, status = 200, request = null, env = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(request, env), ...SECURITY_HEADERS },
  });
}

export function htmlResponse(html, request = null, env = null) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...buildCorsHeaders(request, env), ...SECURITY_HEADERS },
  });
}

export function textResponse(text, contentType = 'text/plain;charset=UTF-8', request = null, env = null) {
  return new Response(text, {
    headers: { 'Content-Type': contentType, ...buildCorsHeaders(request, env), ...SECURITY_HEADERS },
  });
}

export function svgResponse(svg, request = null, env = null) {
  return textResponse(svg, 'image/svg+xml;charset=UTF-8', request, env);
}

/**
 * Binary response for static assets (icons, favicon).
 * Note: cacheControl overrides SECURITY_HEADERS' 'no-store' — intended for immutable assets.
 */
export function binaryResponse(body, contentType, cacheControl = 'public, max-age=86400', request = null, env = null) {
  return new Response(body, {
    headers: {
      ...buildCorsHeaders(request, env),
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });
}

export function errorResponse(message, status = 400, request = null, env = null) {
  return jsonResponse({ success: false, message }, status, request, env);
}

export function successResponse(data = null, request = null, env = null) {
  const res = { success: true };
  if (data) Object.assign(res, data);
  return jsonResponse(res, 200, request, env);
}

export function downloadResponse(body, contentType, filename, request = null, env = null) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${filename}`,
      ...buildCorsHeaders(request, env),
      ...SECURITY_HEADERS,
    },
  });
}

export function corsPreFlight(request = null, env = null) {
  return new Response(null, { status: 204, headers: { ...buildCorsHeaders(request, env), ...SECURITY_HEADERS } });
}
