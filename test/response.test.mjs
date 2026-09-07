import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonResponse, corsPreFlight } from '../src/utils/response.js';

test('CORS allows wildcard when request has no Origin header and ALLOWED_ORIGIN is empty', () => {
  const req = new Request('https://sub.example.com/api/items');
  const res = jsonResponse({ ok: true }, 200, req, {});
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('CORS strictly checks same-origin when ALLOWED_ORIGIN is not configured', () => {
  // Same-origin request: origin matches URL origin
  const sameReq = new Request('https://sub.example.com/api/items', {
    headers: { Origin: 'https://sub.example.com' },
  });
  const sameRes = jsonResponse({ ok: true }, 200, sameReq, {});
  assert.equal(sameRes.headers.get('Access-Control-Allow-Origin'), 'https://sub.example.com');

  // Cross-origin request without ALLOWED_ORIGIN: should NOT allow third-party origin
  const crossReq = new Request('https://sub.example.com/api/items', {
    headers: { Origin: 'https://evil.com' },
  });
  const crossRes = jsonResponse({ ok: true }, 200, crossReq, {});
  assert.equal(crossRes.headers.get('Access-Control-Allow-Origin'), null);
});

test('CORS honors configured ALLOWED_ORIGIN domains', () => {
  const env = { ALLOWED_ORIGIN: 'https://sub1.com, https://sub2.com' };

  // Matching origin
  const req1 = new Request('https://sub.example.com/api/items', {
    headers: { Origin: 'https://sub2.com' },
  });
  const res1 = jsonResponse({ ok: true }, 200, req1, env);
  assert.equal(res1.headers.get('Access-Control-Allow-Origin'), 'https://sub2.com');

  // Non-matching origin falls back to the first allowed origin
  const req2 = new Request('https://sub.example.com/api/items', {
    headers: { Origin: 'https://other.com' },
  });
  const res2 = jsonResponse({ ok: true }, 200, req2, env);
  assert.equal(res2.headers.get('Access-Control-Allow-Origin'), 'https://sub1.com');
});

test('corsPreFlight returns 204 with CORS and security headers', () => {
  const req = new Request('https://sub.example.com/api/items', { method: 'OPTIONS' });
  const res = corsPreFlight(req, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, POST, PUT, DELETE, OPTIONS');
});
