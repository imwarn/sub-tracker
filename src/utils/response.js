/**
 * HTTP Response helpers with CORS support
 */

const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const CORS_REQUEST_HEADERS = 'Content-Type, Authorization';

/**
 * Build CORS headers dynamically.
 * If ALLOWED_ORIGIN env is set, use that; otherwise mirror the request's own Origin
 * (locks cross-origin requests to same-origin by default).
 */
function buildCorsHeaders(request) {
  let origin = '';
  try { origin = request?.headers?.get('Origin') || ''; } catch {}
  return {
    'Access-Control-Allow-Origin': origin || '*',
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

export function jsonResponse(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...buildCorsHeaders(request), ...SECURITY_HEADERS },
  });
}

export function htmlResponse(html, request = null) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...buildCorsHeaders(request), ...SECURITY_HEADERS },
  });
}

export function textResponse(text, contentType = 'text/plain;charset=UTF-8', request = null) {
  return new Response(text, {
    headers: { 'Content-Type': contentType, ...buildCorsHeaders(request), ...SECURITY_HEADERS },
  });
}

export function svgResponse(svg, request = null) {
  return textResponse(svg, 'image/svg+xml;charset=UTF-8', request);
}

export function binaryResponse(body, contentType, cacheControl = 'public, max-age=86400', request = null) {
  return new Response(body, {
    headers: {
      ...buildCorsHeaders(request),
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });
}

export function errorResponse(message, status = 400, request = null) {
  return jsonResponse({ success: false, message }, status, request);
}

export function successResponse(data = null, request = null) {
  const res = { success: true };
  if (data) Object.assign(res, data);
  return jsonResponse(res, 200, request);
}

export function downloadResponse(body, contentType, filename, request = null) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${filename}`,
      ...buildCorsHeaders(request),
      ...SECURITY_HEADERS,
    },
  });
}

export function corsPreFlight(request = null) {
  return new Response(null, { status: 204, headers: { ...buildCorsHeaders(request), ...SECURITY_HEADERS } });
}
