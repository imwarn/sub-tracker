/**
 * PWA resources and static brand assets.
 */

import {
  FAVICON_ICO_BASE64,
  ICON_192_PNG_BASE64,
  ICON_512_PNG_BASE64,
  ICON_SVG,
} from './brand-assets.js';

export function getManifest() {
  return {
    name: 'Sub-Tracker',
    short_name: 'SubTracker',
    description: 'eSIM 保号、订阅费用和话费余额管理看板',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0ea5e9',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
}

export function getIconSVG() {
  return ICON_SVG;
}

function bytesFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function getIconPNG(size) {
  if (size === 192) return bytesFromBase64(ICON_192_PNG_BASE64);
  if (size === 512) return bytesFromBase64(ICON_512_PNG_BASE64);
  return null;
}

export function getFaviconICO() {
  return bytesFromBase64(FAVICON_ICO_BASE64);
}

// Auto-versioned SW cache: changes on each Worker deploy
const SW_VERSION = Date.now().toString(36);

export function getServiceWorker() {
  return `
const CACHE_NAME = 'sub-tracker-${SW_VERSION}';
const SHELL_CACHE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/favicon.ico'];
const CDN_HOSTS = new Set(['cdn.tailwindcss.com', 'cdnjs.cloudflare.com']);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_CACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function offlineFallback() {
  return new Response('<!doctype html><meta charset="utf-8"><title>Sub-Tracker</title><body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:28rem;padding:2rem;text-align:center"><h1>Sub-Tracker</h1><p>当前离线，已缓存的应用壳不可用。请恢复网络后刷新。</p></main></body>', {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone()).catch(() => {});
    return response;
  } catch {
    return await cache.match('/') || offlineFallback();
  }
}

async function networkFirstApi(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return await cache.match(request) || new Response(JSON.stringify({ success:false, message:'离线且没有已缓存数据' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone()).catch(() => {});
    return response;
  });
  return cached || refresh;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cache GET /api/items for offline support (network-first)
  if (url.pathname === '/api/items' && !url.searchParams.has('type')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Skip other API requests
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === location.origin && SHELL_CACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (CDN_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`.trim();
}
