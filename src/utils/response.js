/**
 * HTTP Response helpers with CORS support
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function htmlResponse(html) {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS },
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

export function corsPreFlight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
