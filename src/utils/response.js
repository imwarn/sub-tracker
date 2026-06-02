/**
 * HTTP Response helpers with CORS support
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...SECURITY_HEADERS },
  });
}

export function htmlResponse(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS, ...SECURITY_HEADERS },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}

export function successResponse(data = null) {
  const res = { success: true };
  if (data) Object.assign(res, data);
  return jsonResponse(res);
}

export function downloadResponse(body, contentType, filename) {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${filename}`,
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
    },
  });
}

export function corsPreFlight() {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...SECURITY_HEADERS } });
}
