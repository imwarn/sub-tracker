/**
 * HTML template - serves the complete frontend
 * Single-page app with login + dashboard
 * Phase 2: list/card/calendar views, stats, import/export
 */

import { CURRENCY_SYMBOLS, DEFAULT_REMIND_DAYS } from '../data/constants.js';
import { getCountryMap } from '../utils/country.js';
import {
  FAVICON_ICO_BASE64,
  ICON_192_PNG_BASE64,
  ICON_512_PNG_BASE64,
  ICON_SVG,
} from './brand-assets.js';

function getFrontendFlagMap() {
  return Object.fromEntries(
    Object.entries(getCountryMap()).map(([prefix, info]) => [prefix, info.code])
  );
}

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

export function getServiceWorker() {
  return `
const CACHE_NAME = 'sub-tracker-v3';
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

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('/', response.clone()).catch(() => {});
    return response;
  } catch {
    return await cache.match('/') || offlineFallback();
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
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
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

export function getHTML() {
  const flagMap = getFrontendFlagMap();

  return `<!DOCTYPE html>
<html lang="zh-CN">
	<head>
	  <meta charset="UTF-8">
	    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">
	    <meta name="apple-mobile-web-app-capable" content="yes">
	  <meta name="theme-color" content="#0ea5e9">
	    <title>Sub-Tracker | eSIM 保号 & 订阅管理</title>
	  <link rel="manifest" href="/manifest.webmanifest">
	  <link rel="icon" href="/favicon.ico" sizes="any">
	  <link rel="icon" href="/icon.svg" type="image/svg+xml">
	  <link rel="apple-touch-icon" href="/icon-192.png">
	  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      background: linear-gradient(-45deg, #0f172a, #1e3a5f, #164e63, #1e293b);
      background-size: 400% 400%;
      animation: gradient 20s ease infinite;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }
    @keyframes gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
    .glass { background:rgba(255,255,255,0.08); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.12); }
    .glass-card { background:rgba(255,255,255,0.1); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.15); transition:transform 0.2s,box-shadow 0.2s; }
    .glass-card:hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,0.25); }
    .glass-input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#f1f5f9; }
    .glass-input::placeholder { color:rgba(255,255,255,0.4); }
    .glass-input:focus { outline:none; border-color:#38bdf8; box-shadow:0 0 0 2px rgba(56,189,248,0.2); }
    .btn-primary { background:linear-gradient(135deg,#0ea5e9,#2563eb); transition:all 0.2s; }
    .btn-primary:hover { filter:brightness(1.1); transform:translateY(-1px); }
    .status-active { color:#4ade80; } .status-warning { color:#fbbf24; }
    .status-danger { color:#f87171; } .status-expired { color:#ef4444; }
    .modal-overlay { background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); }
    .fade-in { animation:fadeIn 0.3s ease; }
    @keyframes fadeIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    .tab-active { background:rgba(56,189,248,0.2); color:#38bdf8; border-color:#38bdf8; }
    ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:3px; }
    .list-row { transition:background 0.15s; } .list-row:hover { background:rgba(255,255,255,0.05); }
    .cal-day { min-height:80px; } .cal-day:hover { background:rgba(56,189,248,0.08); }
    .cal-event { font-size:0.65rem; padding:1px 4px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    select.glass-input option { background:#1e293b; color:#f1f5f9; }
    /* Mobile responsive overrides */
    @media (max-width: 639px) {
      .cal-day { min-height:52px; padding:2px; }
      .cal-event { font-size:0.55rem; padding:0 2px; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block; }
      .glass-card { padding:14px !important; }
      .glass-card .btn-touch { min-height:36px; min-width:36px; }
      /* Prevent iOS zoom on input focus (font < 16px triggers zoom) */
      input, select, textarea { font-size: 16px !important; }
      /* Safe area insets for notched devices */
      body { padding-bottom: env(safe-area-inset-bottom); }
    }
  </style>
</head>
<body class="text-slate-200 min-h-screen">

  <!-- ========== LOGIN ========== -->
  <div id="login-view" class="flex items-center justify-center min-h-screen p-4">
    <div class="glass rounded-3xl p-8 md:p-10 max-w-md w-full text-center fade-in">
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-sky-500/20 flex items-center justify-center">
        <i class="fa-solid fa-shield-halved text-4xl text-sky-400"></i>
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">安全验证</h2>
      <p class="text-slate-400 text-sm mb-8">向你的 Telegram 机器人获取验证码登录</p>
      <div class="mb-6">
        <input id="otp-input" type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="输入 6 位验证码"
          class="glass-input w-full px-4 py-4 rounded-xl text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.5em] font-mono">
      </div>
      <div class="flex flex-col gap-3">
        <button onclick="verifyOTP()" class="btn-primary w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> 登录
        </button>
        <button onclick="sendOTP()" id="send-btn" class="w-full py-3.5 rounded-xl font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2">
          <i class="fa-brands fa-telegram"></i> 获取验证码
        </button>
      </div>
      <p id="login-msg" class="mt-4 text-sm text-red-400 hidden"></p>
    </div>
  </div>

  <!-- ========== DASHBOARD ========== -->
  <div id="dashboard-view" class="hidden max-w-6xl mx-auto p-4 md:p-8">
    <!-- Header -->
    <div class="glass rounded-2xl p-5 sm:p-6 mb-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
            <img src="/icon.svg" alt="" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-lg shadow-sky-950/30 flex-shrink-0"> Sub-Tracker
          </h1>
          <p class="text-slate-400 mt-1 text-xs sm:text-sm">eSIM 保号 & 订阅费用管理看板</p>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span class="text-xs sm:text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full self-start sm:self-auto" id="today-display"></span>
          <div class="flex items-center gap-2">
            <button onclick="openModal('esim')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-sim-card"></i> eSIM
            </button>
            <button onclick="openModal('subscription')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-credit-card"></i> 订阅
            </button>
            <button onclick="openModal('balance')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-wallet"></i> 话费
            </button>
            <div class="relative" id="menu-trigger">
              <button onclick="toggleMenu(event)" class="text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                <i class="fa-solid fa-ellipsis-vertical"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

	    <!-- Stats -->
	    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6" id="stats-bar"></div>
	    <div id="analytics-panel" class="mb-6"></div>

    <!-- View toggle + Filter -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="flex gap-2 flex-wrap basis-0 grow">
        <button onclick="setFilter('all')" data-filter="all" class="filter-tab tab-active px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all">
          <i class="fa-solid fa-globe mr-1"></i>全部
        </button>
        <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-sim-card mr-1"></i>eSIM
        </button>
        <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-credit-card mr-1"></i>订阅
        </button>
        <button onclick="setFilter('balance')" data-filter="balance" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-wallet mr-1"></i>话费
        </button>
      </div>
      <div class="flex gap-1 glass rounded-lg p-1 flex-shrink-0">
        <button onclick="setView('grid')" data-view="grid" class="view-tab tab-active px-3 py-1.5 rounded-md text-xs transition-all" title="卡片视图">
          <i class="fa-solid fa-grip"></i>
        </button>
        <button onclick="setView('list')" data-view="list" class="view-tab px-3 py-1.5 rounded-md text-xs transition-all text-slate-400" title="列表视图">
          <i class="fa-solid fa-list"></i>
        </button>
        <button onclick="setView('calendar')" data-view="calendar" class="view-tab px-3 py-1.5 rounded-md text-xs transition-all text-slate-400" title="日历视图">
          <i class="fa-solid fa-calendar"></i>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
        <input id="search-input" type="text" placeholder="搜索名称、号码、备注..."
          oninput="renderItems()"
          class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
      </div>
    </div>

    <!-- Content area -->
    <div id="content-area"></div>
    <div id="empty-state" class="hidden text-center py-16 text-slate-500">
      <i class="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
      <p class="text-lg mb-1">暂无数据</p>
      <p class="text-sm mb-6">添加你的第一个 eSIM 卡、订阅服务或话费管理</p>
      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick="openModal('esim')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> 添加 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> 添加订阅
        </button>
        <button onclick="openModal('balance')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-wallet"></i> 添加话费
        </button>
      </div>
    </div>
  </div>

  <!-- ========== MODAL ========== -->
  <div id="modal-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto fade-in">
      <div class="flex justify-between items-center mb-6">
        <h3 id="modal-title" class="text-xl font-bold text-white">添加</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="item-form" onsubmit="saveItem(event)">
        <input type="hidden" id="form-id">
        <input type="hidden" id="form-type">
        <div class="space-y-4">
          <div>
            <label class="text-sm text-slate-400 mb-1 block">名称 *</label>
            <input id="form-name" type="text" required placeholder="如: T-Mobile eSIM / Netflix" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div id="field-number" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">号码</label>
            <input id="form-number" type="text" placeholder="+8613800138000" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div id="field-category" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">分类</label>
            <select id="form-category" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">未分类</option>
              <option value="AI">AI 服务</option>
              <option value="VPN">VPN</option>
              <option value="Cloud">云服务</option>
              <option value="Streaming">流媒体</option>
              <option value="Domain">域名/SSL</option>
              <option value="VPS">VPS/服务器</option>
              <option value="Software">软件订阅</option>
              <option value="Game">游戏</option>
              <option value="Other">其他</option>
            </select>
          </div>
          <div id="field-region" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">账号区域</label>
            <select id="form-region" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">未设置</option>
              <option value="CN">大陆</option>
              <option value="HK">香港</option>
              <option value="TW">台湾</option>
              <option value="US">美区</option>
              <option value="JP">日区</option>
              <option value="KR">韩区</option>
              <option value="TR">土耳其</option>
              <option value="NG">尼日利亚</option>
              <option value="IN">印度</option>
              <option value="BR">巴西</option>
              <option value="AR">阿根廷</option>
              <option value="PH">菲律宾</option>
              <option value="MY">马来西亚</option>
              <option value="SG">新加坡</option>
              <option value="EU">欧洲</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
          <div id="field-sub-id" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">订阅 ID / 账号</label>
            <input id="form-sub-id" type="text" placeholder="账号邮箱或订阅ID" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">到期日期 *</label>
            <input id="form-expire" type="date" min="2020-01-01" max="2035-12-31" class="glass-input w-full px-4 py-3 rounded-xl text-sm" lang="zh-CN">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">保号/续费周期 (天)</label>
            <input id="form-cycle" type="number" min="1" placeholder="如: 180" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-2 block">提醒时间（可多选）</label>
            <div class="flex flex-wrap gap-2" id="remind-checkboxes">
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="30" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">30天前</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="15" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">15天前</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="7" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">7天前</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="3" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">3天前</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="1" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">1天前</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="0" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">当天</span>
              </label>
            </div>
          </div>
          <div id="field-balance" class="hidden">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">当前余额 *</label>
                <input id="form-balance" type="number" step="0.01" min="0" placeholder="50.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">月租 *</label>
                <input id="form-monthly-fee" type="number" step="0.01" min="0" placeholder="18.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">扣费日 *</label>
                <input id="form-billing-day" type="number" min="1" max="28" placeholder="5" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
            </div>
          </div>
          <div id="field-price" class="hidden">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">费用</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">货币</label>
                <select id="form-currency" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                  <option value="CNY">CNY ¥</option>
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                  <option value="GBP">GBP £</option>
                  <option value="JPY">JPY ¥</option>
                  <option value="HKD">HKD $</option>
                  <option value="TWD">TWD $</option>
                  <option value="KRW">KRW ₩</option>
                  <option value="TRY">TRY ₺</option>
                  <option value="THB">THB ฿</option>
                  <option value="NGN">NGN ₦</option>
                  <option value="INR">INR ₹</option>
                  <option value="PHP">PHP ₱</option>
                  <option value="MYR">MYR RM</option>
                  <option value="SGD">SGD $</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">计费周期</label>
                <select id="form-billing" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                  <option value="monthly">月付</option>
                  <option value="yearly">年付</option>
                  <option value="once">一次性</option>
                </select>
              </div>
            </div>
          </div>
          <div id="field-url" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">服务链接</label>
            <input id="form-url" type="url" placeholder="https://..." class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">备注</label>
            <textarea id="form-remark" rows="2" placeholder="可选备注..." class="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>保存</button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">取消</button>
        </div>
      </form>
    </div>
	  </div>

	  <!-- ========== HISTORY MODAL ========== -->
	  <div id="history-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
	    <div class="glass rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[86vh] overflow-y-auto fade-in">
	      <div class="flex justify-between items-center mb-6 gap-3">
	        <h3 class="text-xl font-bold text-white">操作历史</h3>
	        <div class="flex items-center gap-2">
	          <button onclick="clearHistory()" class="text-xs text-red-300 hover:text-red-200 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors">清空</button>
	          <button onclick="closeHistory()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
	        </div>
	      </div>
	      <div id="history-content" class="space-y-2"></div>
	    </div>
	  </div>

	  <!-- ========== DROPDOWN (body level, escapes all stacking contexts) ========== -->
	  <div id="dropdown-menu" class="hidden fixed glass rounded-xl p-2 min-w-[160px]" style="z-index:99999">
    <button onclick="exportJSON()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-download mr-2 text-emerald-400"></i>导出 JSON
    </button>
    <button onclick="exportCSV()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-file-csv mr-2 text-emerald-400"></i>导出 CSV
    </button>
    <button onclick="document.getElementById('import-file').click()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-upload mr-2 text-amber-400"></i>导入 JSON
    </button>
	    <button onclick="downloadDemo()" class="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/10 transition-colors">
	      <i class="fa-solid fa-download mr-2 text-slate-500"></i>下载导入示例
	    </button>
	    <button onclick="openHistory()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
	      <i class="fa-solid fa-clock-rotate-left mr-2 text-cyan-400"></i>操作历史
	    </button>
	    <input type="file" id="import-file" accept=".json" class="hidden" onchange="importJSON(this)">
    <hr class="border-white/10 my-1">
    <button onclick="logout()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-right-from-bracket mr-2"></i>退出登录
    </button>
  </div>

<script>
let TOKEN = localStorage.getItem('token') || '';
let allItems = [];
let currentFilter = 'all';
let currentView = 'grid';
let calYear, calMonth;

const API = '';
const DEFAULT_REMIND_DAYS_CLIENT = ${JSON.stringify(DEFAULT_REMIND_DAYS)};

// ==================== API ====================
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = TOKEN;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res;
}

// ==================== AUTH ====================
async function sendOTP() {
  const btn = document.getElementById('send-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 发送中...';
  const res = await api('POST', '/api/auth/send');
  const data = await res.json();
  if (data.success) { btn.innerHTML = '<i class="fa-solid fa-check"></i> 已发送'; btn.classList.add('text-green-400'); showLoginMsg(''); }
  else { showLoginMsg(data.message || '发送失败'); btn.innerHTML = '<i class="fa-brands fa-telegram"></i> 获取验证码'; }
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-brands fa-telegram"></i> 获取验证码'; btn.classList.remove('text-green-400'); }, 5000);
}

async function verifyOTP() {
  const code = document.getElementById('otp-input').value.trim();
  if (!code || code.length !== 6) return showLoginMsg('请输入 6 位验证码');
  const res = await api('POST', '/api/auth/verify', { code });
  const data = await res.json();
  if (data.success) { TOKEN = data.token; localStorage.setItem('token', TOKEN); enterDashboard(); }
  else showLoginMsg(data.message || '验证失败');
}

function showLoginMsg(msg) { const el = document.getElementById('login-msg'); el.textContent = msg; el.classList.toggle('hidden', !msg); }

async function checkAuth() {
  if (!TOKEN) return false;
  const res = await api('GET', '/api/auth/check');
  const data = await res.json();
  return data.success;
}

async function logout() {
  if (TOKEN) {
    try { await api('POST', '/api/auth/logout'); } catch {}
  }
  TOKEN = ''; localStorage.removeItem('token');
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

// ==================== DASHBOARD ====================
async function enterDashboard() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  const now = new Date();
  document.getElementById('today-display').textContent = now.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'short' });
  const now2 = new Date();
  calYear = now2.getFullYear(); calMonth = now2.getMonth();
  await loadItems();
}

async function loadItems() {
  const res = await api('GET', '/api/items');
  if (res.ok) { const data = await res.json(); if (Array.isArray(data)) allItems = data; }
  renderStats(); renderAnalytics(); renderItems();
}

// ==================== STATS ====================
function renderStats() {
  const esims = allItems.filter(i => i.type === 'esim');
  const subs = allItems.filter(i => i.type === 'subscription');
  const balances = allItems.filter(i => i.type === 'balance');
  const today = new Date(); today.setHours(0,0,0,0);
  let urgentCount = 0;
  allItems.forEach(i => {
    if (i.type === 'balance') {
      if (i.predictedSuspendDate) { const exp = new Date(i.predictedSuspendDate+'T00:00:00'); const diff = Math.ceil((exp-today)/86400000); if (diff <= 15) urgentCount++; }
    } else if (i.expireDate) { const exp = new Date(i.expireDate+'T00:00:00'); const diff = Math.ceil((exp-today)/86400000); if (diff <= 15) urgentCount++; }
  });

  // Cost calculation
  let monthlyCost = 0, yearlyCost = 0;
  subs.forEach(s => {
    if (!s.price) return;
    const p = parseFloat(s.price);
    const billing = s.billing || 'monthly';
    if (billing === 'monthly') { monthlyCost += p; yearlyCost += p * 12; }
    else if (billing === 'yearly') { monthlyCost += p / 12; yearlyCost += p; }
    else { monthlyCost += 0; yearlyCost += p; }
  });

  // Balance: add monthly fees to cost
  let balanceMonthlyFee = 0;
  balances.forEach(b => { if (b.monthlyFee) balanceMonthlyFee += parseFloat(b.monthlyFee); });

  // Total balance
  let totalBalance = 0;
  balances.forEach(b => { if (b.balance != null) totalBalance += b.balance; });

  // Determine display currency from first subscription with a price, or balance
  const primaryCur = subs.find(s => s.price)?.currency || balances[0]?.currency || 'CNY';
  const sym = currSym(primaryCur);

  const allMonthly = monthlyCost + balanceMonthlyFee;

  const stats = [
    { label:'eSIM', value:esims.length, icon:'fa-sim-card', color:'text-cyan-400', bg:'bg-cyan-500/10' },
    { label:'订阅', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10' },
    { label:'话费', value:balances.length ? sym+totalBalance.toFixed(0) : '0', icon:'fa-wallet', color:'text-amber-400', bg:'bg-amber-500/10' },
    { label:'即将到期', value:urgentCount, icon:'fa-clock', color:'text-rose-400', bg:'bg-rose-500/10' },
    { label:'月度支出', value:sym+allMonthly.toFixed(0), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map(s =>
    '<div class="glass-card rounded-xl p-4"><div class="flex items-center gap-3">' +
    '<div class="'+s.bg+' w-10 h-10 rounded-lg flex items-center justify-center"><i class="fa-solid '+s.icon+' '+s.color+'"></i></div>' +
    '<div><div class="text-xs text-slate-400">'+s.label+'</div><div class="text-xl font-bold text-white">'+s.value+'</div></div>' +
    '</div></div>'
  ).join('');
}

function addMoney(bucket, currency, amount) {
  const cur = currency || 'CNY';
  bucket[cur] = (bucket[cur] || 0) + (Number(amount) || 0);
}

function fmtMoney(currency, amount) {
  const value = Math.abs(amount) >= 100 ? amount.toFixed(0) : amount.toFixed(2);
  return currSym(currency) + value + ' ' + currency;
}

function renderAnalytics() {
  const panel = document.getElementById('analytics-panel');
  const monthly = {};
  const yearly = {};
  const categories = {};

  allItems.filter(i => i.status !== 'paused').forEach(item => {
    if (item.type === 'subscription' && item.price) {
      const p = parseFloat(item.price);
      if (!Number.isFinite(p)) return;
      const cur = item.currency || 'CNY';
      const cat = item.category || '未分类';
      let m = 0, y = 0;
      if (item.billing === 'yearly') { m = p / 12; y = p; }
      else if (item.billing === 'once') { y = p; }
      else { m = p; y = p * 12; }
      addMoney(monthly, cur, m);
      addMoney(yearly, cur, y);
      const key = cat + '|' + cur;
      categories[key] = { category: cat, currency: cur, monthly: (categories[key]?.monthly || 0) + m, yearly: (categories[key]?.yearly || 0) + y };
    }

    if (item.type === 'balance' && item.monthlyFee) {
      const cur = item.currency || 'CNY';
      const fee = parseFloat(item.monthlyFee);
      if (!Number.isFinite(fee)) return;
      addMoney(monthly, cur, fee);
      addMoney(yearly, cur, fee * 12);
      const key = '话费|' + cur;
      categories[key] = { category: '话费', currency: cur, monthly: (categories[key]?.monthly || 0) + fee, yearly: (categories[key]?.yearly || 0) + fee * 12 };
    }
  });

  const currencies = Object.keys(monthly).sort();
  if (!currencies.length) { panel.innerHTML = ''; return; }

  const currencyHTML = currencies.map(cur =>
    '<div class="glass-card rounded-xl p-4">' +
      '<div class="text-xs text-slate-400 mb-1">'+cur+'</div>' +
      '<div class="text-lg font-bold text-white">'+fmtMoney(cur, monthly[cur])+'<span class="text-xs text-slate-500 font-normal"> / 月</span></div>' +
      '<div class="text-xs text-slate-400 mt-1">'+fmtMoney(cur, yearly[cur] || 0)+' / 年</div>' +
    '</div>'
  ).join('');

  const categoryRows = Object.values(categories)
    .sort((a,b) => b.yearly - a.yearly)
    .slice(0, 6)
    .map(c =>
      '<div class="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">' +
        '<div class="min-w-0"><div class="text-sm text-white truncate">'+esc(c.category)+'</div><div class="text-xs text-slate-500">'+c.currency+'</div></div>' +
        '<div class="text-right flex-shrink-0"><div class="text-sm text-slate-200">'+fmtMoney(c.currency, c.monthly)+'/月</div><div class="text-xs text-slate-500">'+fmtMoney(c.currency, c.yearly)+'/年</div></div>' +
      '</div>'
    ).join('');

  panel.innerHTML =
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-chart-simple text-emerald-400 mr-2"></i>按货币统计</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+currencyHTML+'</div></div>' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-layer-group text-violet-400 mr-2"></i>按分类统计</div>'+categoryRows+'</div>' +
    '</div>';
}

// ==================== FILTER / VIEW ====================
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(b => {
    const active = b.dataset.filter === f;
    b.classList.toggle('tab-active', active);
    b.classList.toggle('text-slate-400', !active);
  });
  renderItems();
}

function setView(v) {
  currentView = v;
  document.querySelectorAll('.view-tab').forEach(b => {
    const active = b.dataset.view === v;
    b.classList.toggle('tab-active', active);
    b.classList.toggle('text-slate-400', !active);
  });
  renderItems();
}

// ==================== RENDER ====================
function getFilteredItems() {
  const search = (document.getElementById('search-input').value || '').toLowerCase();
  let items = allItems;
  if (currentFilter !== 'all') items = items.filter(i => i.type === currentFilter);
  if (search) items = items.filter(i =>
    (i.name||'').toLowerCase().includes(search) || (i.number||'').toLowerCase().includes(search) ||
    (i.remark||'').toLowerCase().includes(search) || (i.category||'').toLowerCase().includes(search)
  );
  const today = new Date(); today.setHours(0,0,0,0);
  items.sort((a,b) => {
    const da = a.type === 'balance' ? (a.predictedSuspendDate ? Math.ceil((new Date(a.predictedSuspendDate+'T00:00:00')-today)/86400000) : 9999) : (a.expireDate ? Math.ceil((new Date(a.expireDate+'T00:00:00')-today)/86400000) : 9999);
    const db = b.type === 'balance' ? (b.predictedSuspendDate ? Math.ceil((new Date(b.predictedSuspendDate+'T00:00:00')-today)/86400000) : 9999) : (b.expireDate ? Math.ceil((new Date(b.expireDate+'T00:00:00')-today)/86400000) : 9999);
    return da - db;
  });
  return items;
}

function renderItems() {
  const items = getFilteredItems();
  const area = document.getElementById('content-area');
  const empty = document.getElementById('empty-state');
  if (!items.length) { area.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  if (currentView === 'grid') renderGrid(items, area);
  else if (currentView === 'list') renderList(items, area);
  else if (currentView === 'calendar') renderCalendar(items, area);
}

// -- Grid view --
function renderGrid(items, area) {
  area.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' +
    items.map(i => cardHTML(i)).join('') + '</div>';
}

function cardHTML(item) {
  const diff = getDiff(item);
  const isBalance = item.type === 'balance';
  const st = isBalance ? statusInfoBalance(diff) : statusInfo(diff);
  const isEsim = item.type === 'esim';
  let tc, tb, ti, tl;
  if (isBalance) { tc = 'text-amber-400'; tb = 'bg-amber-500/10'; ti = 'fa-wallet'; tl = '话费'; }
  else if (isEsim) { tc = 'text-cyan-400'; tb = 'bg-cyan-500/10'; ti = 'fa-sim-card'; tl = 'eSIM'; }
  else { tc = 'text-violet-400'; tb = 'bg-violet-500/10'; ti = 'fa-credit-card'; tl = (item.category||'订阅'); }

  let body = '';
  if (isBalance) {
    const sym = currSym(item.currency);
    const monthsLeft = item.monthlyFee > 0 ? Math.floor(item.balance / item.monthlyFee) : 0;
    const suspendStr = item.predictedSuspendDate || '未计算';
    body = (item.number ? '<div class="text-sm text-slate-300 font-mono mb-1">'+esc(item.number)+'</div>' : '') +
      '<div class="text-lg text-emerald-400 font-bold">'+sym+item.balance+'</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-receipt mr-1"></i>月租 '+sym+item.monthlyFee+'/月 · 每月'+item.billingDay+'日扣</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-battery-half mr-1"></i>可撑 '+monthsLeft+' 个月</div>' +
      (item.lastRecharge ? '<div class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-plus-circle mr-1"></i>上次 '+((item.lastRecharge.amount>0)?'+':'')+item.lastRecharge.amount+' ('+item.lastRecharge.date+')</div>' : '');
  } else if (isEsim) {
    const iso = getFlag(item.number);
    body = (iso ? '<div class="text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded mb-2 inline-block">'+esc(iso)+'</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">'+esc(item.number)+'</div>' : '');
  } else {
    const ps = item.price ? (item.billing==='yearly' ? currSym(item.currency)+item.price+'/年' : item.billing==='once' ? currSym(item.currency)+item.price+'(一次性)' : currSym(item.currency)+item.price+'/月') : '';
    const regionStr = item.region ? esc(item.region) : '';
    const catStr = item.category ? esc(item.category) : '';
    const metaLine = [catStr, regionStr].filter(Boolean).join(' · ');
    body = (metaLine ? '<div class="text-xs text-slate-400 mb-1">'+metaLine+'</div>' : '') +
      (ps ? '<div class="text-sm text-emerald-400 font-semibold">'+esc(ps)+'</div>' : '') +
      (item.subId ? '<div class="text-xs text-slate-500 mt-1 truncate"><i class="fa-solid fa-id-card mr-1"></i>'+esc(item.subId)+'</div>' : '');
    if (item.url) body += '<a href="'+esc(item.url)+'" target="_blank" class="text-xs text-sky-400 hover:underline mt-1 inline-block"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>访问</a>';
  }

  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs btn-touch text-sky-400 hover:text-sky-300 px-2 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors"><i class="fa-solid fa-rotate"></i> 续期</button>' : '';
  const rechargeBtn = isBalance ?
    '<button onclick="rechargeItem(\\''+item.id+'\\')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"><i class="fa-solid fa-plus-circle"></i> 充值</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">' +
    '<div class="'+tb+' w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid '+ti+' '+tc+' text-sm"></i></div>' +
    '<span class="text-xs '+tc+' opacity-70">'+esc(tl)+'</span></div>' +
    '<span class="text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</span></div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">'+esc(item.name)+'</h3>' +
    body +
    (isBalance && item.predictedSuspendDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i>预计停机: '+item.predictedSuspendDate+'</div>' : '') +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>到期: '+item.expireDate+'</div>' : '') +
    (item.cycle ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: '+item.cycle+'天</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>'+esc(item.remark)+'</div>' : '') +
    '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">' +
    rechargeBtn +
    renewBtn +
    '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs btn-touch px-2 py-1.5 rounded-lg transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
    '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
    '<button onclick="editItem(\\''+item.id+'\\')" class="text-xs btn-touch text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
    '<button onclick="deleteItem(\\''+item.id+'\\')" class="text-xs btn-touch text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
    '</div></div>';
}

// -- List view --
function renderList(items, area) {
  const isMobile = window.innerWidth < 640;
  if (isMobile) {
    // Mobile: stacked card layout, no grid table
    let html = '<div class="space-y-2">';
    html += items.map(i => listRowMobileHTML(i)).join('');
    html += '</div>';
    area.innerHTML = html;
    return;
  }
  // Desktop: grid table
  let html = '<div class="glass rounded-xl overflow-hidden">';
  html += '<div class="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/10 bg-white/5">' +
    '<div class="col-span-4">名称</div><div class="col-span-2">类型/号码</div>' +
    '<div class="col-span-2">到期</div><div class="col-span-2">状态</div>' +
    '<div class="col-span-2 text-right">操作</div></div>';
  html += items.map(i => listRowHTML(i)).join('');
  html += '</div>';
  area.innerHTML = html;
}

function listRowMobileHTML(item) {
  const diff = getDiff(item);
  const isBalance = item.type === 'balance';
  const st = isBalance ? statusInfoBalance(diff) : statusInfo(diff);
  const isEsim = item.type === 'esim';
  let tc, ti;
  if (isBalance) { tc = 'text-amber-400'; ti = 'fa-wallet'; }
  else if (isEsim) { tc = 'text-cyan-400'; ti = 'fa-sim-card'; }
  else { tc = 'text-violet-400'; ti = 'fa-credit-card'; }
  const statusText = item.status==='paused' ? '已暂停' : (st.text || '未设置');
  const statusCls = item.status==='paused' ? 'text-slate-500' : st.cls;

  const sym = currSym(item.currency);
  const balanceInfo = isBalance ? sym+item.balance+' · 月租'+sym+item.monthlyFee : '';

  return '<div class="glass-card rounded-xl p-4">' +
    '<div class="flex items-center justify-between mb-2">' +
      '<div class="flex items-center gap-2 min-w-0">' +
        '<i class="fa-solid '+ti+' '+tc+' text-sm flex-shrink-0"></i>' +
        '<span class="text-sm font-semibold text-white truncate">'+esc(item.name)+'</span>' +
      '</div>' +
      '<span class="text-xs font-semibold '+statusCls+' flex-shrink-0 ml-2">'+statusText+'</span>' +
    '</div>' +
    '<div class="flex items-center justify-between">' +
      '<div class="text-xs text-slate-400">' +
        (isBalance ? '<span>'+balanceInfo+'</span>' : '') +
        (!isBalance && item.expireDate ? '<i class="fa-regular fa-calendar mr-1"></i>'+item.expireDate : '') +
        (item.number ? '<span class="ml-2 font-mono">'+esc(item.number)+'</span>' : '') +
        (item.category ? '<span class="ml-1">'+esc(item.category)+'</span>' : '') +
      '</div>' +
      '<div class="flex gap-1 flex-shrink-0">' +
        (isBalance ? '<button onclick="rechargeItem(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="充值"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
        (isEsim && item.cycle ? '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="续期"><i class="fa-solid fa-rotate"></i></button>' : '') +
        '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
        '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
        '<button onclick="editItem(\\''+item.id+'\\')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
        '<button onclick="deleteItem(\\''+item.id+'\\')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function listRowHTML(item) {
  const diff = getDiff(item);
  const isBalance = item.type === 'balance';
  const st = isBalance ? statusInfoBalance(diff) : statusInfo(diff);
  const isEsim = item.type === 'esim';
  const flag = isEsim ? getFlag(item.number) : '';
  let sub, priceStr, iconClass;
  if (isBalance) {
    sub = item.number || '-';
    const sym = currSym(item.currency);
    priceStr = ' · '+sym+item.balance+' (月租'+sym+item.monthlyFee+')';
    iconClass = 'fa-wallet text-amber-400';
  } else if (isEsim) {
    sub = item.number || '-';
    priceStr = '';
    iconClass = 'fa-sim-card text-cyan-400';
  } else {
    sub = item.category || '-';
    priceStr = item.price ? ' · '+currSym(item.currency)+item.price : '';
    iconClass = 'fa-credit-card text-violet-400';
  }

  const dateCol = isBalance ? (item.predictedSuspendDate || '-') : (item.expireDate || '-');

  return '<div class="list-row grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5">' +
    '<div class="col-span-4 sm:col-span-4 flex items-center gap-2 min-w-0">' +
      '<i class="fa-solid '+iconClass+' text-sm flex-shrink-0"></i>' +
      '<span class="truncate text-sm font-medium text-white">'+esc(item.name)+priceStr+'</span></div>' +
    '<div class="col-span-2 hidden sm:block text-xs text-slate-400 truncate">'+flag+esc(sub)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 text-xs text-slate-300">'+dateCol+'</div>' +
    '<div class="col-span-2 hidden sm:block text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 flex justify-end gap-1">' +
      (isBalance ? '<button onclick="rechargeItem(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="充值"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
      (isEsim && item.cycle ? '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="续期"><i class="fa-solid fa-rotate"></i></button>' : '') +
      '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
      '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
      '<button onclick="editItem(\\''+item.id+'\\')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
      '<button onclick="deleteItem(\\''+item.id+'\\')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
    '</div></div>';
}

// -- Calendar view --
function renderCalendar(items, area) {
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  // Build events map
  const events = {};
  items.forEach(i => {
    let dateStr;
    if (i.type === 'balance') {
      dateStr = i.predictedSuspendDate;
    } else {
      dateStr = i.expireDate;
    }
    if (!dateStr) return;
    const d = new Date(dateStr+'T00:00:00');
    const key = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if (!events[key]) events[key] = [];
    events[key].push(i);
  });

  const monthName = calYear + '年' + (calMonth+1) + '月';
  const weekDays = ['日','一','二','三','四','五','六'];

  let html = '<div class="glass rounded-xl p-4">';
  // Header
  html += '<div class="flex justify-between items-center mb-4">' +
    '<button onclick="calPrev()" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-chevron-left"></i></button>' +
    '<h3 class="text-lg font-bold text-white">'+monthName+'</h3>' +
    '<button onclick="calNext()" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-chevron-right"></i></button></div>';

  // Weekday headers
  html += '<div class="grid grid-cols-7 gap-1 mb-1">';
  weekDays.forEach(d => html += '<div class="text-center text-xs font-semibold text-slate-400 py-2">'+d+'</div>');
  html += '</div>';

  // Days grid
  html += '<div class="grid grid-cols-7 gap-1">';
  // Padding
  for (let i = 0; i < startPad; i++) html += '<div class="cal-day rounded-lg"></div>';
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = calYear+'-'+(calMonth+1)+'-'+d;
    const isToday = today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===d;
    const dayEvents = events[key] || [];

    html += '<div class="cal-day rounded-lg p-1.5 '+(isToday ? 'bg-sky-500/20 border border-sky-500/30' : 'border border-white/5')+'">' +
      '<div class="text-xs font-semibold '+(isToday ? 'text-sky-400' : 'text-slate-400')+' mb-1">'+d+'</div>';
    dayEvents.forEach(e => {
      let bg;
      if (e.type === 'balance') bg = 'bg-amber-500/30 text-amber-300';
      else if (e.type === 'esim') bg = 'bg-cyan-500/30 text-cyan-300';
      else bg = 'bg-violet-500/30 text-violet-300';
      html += '<div class="cal-event '+bg+' mb-0.5 cursor-pointer" onclick="editItem(\\''+e.id+'\\')" title="'+esc(e.name)+'（点击编辑）">'+esc(e.name)+'</div>';
    });
    html += '</div>';
  }
  html += '</div></div>';
  area.innerHTML = html;
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderItems(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderItems(); }

// ==================== HELPERS ====================
function getDiff(item) {
  if (item.type === 'balance') {
    if (!item.predictedSuspendDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const exp = new Date(item.predictedSuspendDate+'T00:00:00');
    return Math.ceil((exp - today) / 86400000);
  }
  if (!item.expireDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(item.expireDate+'T00:00:00');
  return Math.ceil((exp - today) / 86400000);
}

function statusInfo(diff) {
  if (diff === null) return { cls:'text-slate-400', text:'未设置' };
  if (diff < 0) return { cls:'status-expired', text:'已过期 '+Math.abs(diff)+'天' };
  if (diff === 0) return { cls:'status-danger', text:'今天到期' };
  if (diff <= 15) return { cls:'status-warning', text:'剩余 '+diff+'天' };
  return { cls:'status-active', text:'剩余 '+diff+'天' };
}

function statusInfoBalance(diff) {
  if (diff === null) return { cls:'text-slate-400', text:'未设置' };
  if (diff < 0) return { cls:'status-expired', text:'已停机 '+Math.abs(diff)+'天' };
  if (diff === 0) return { cls:'status-danger', text:'即将停机' };
  if (diff <= 15) return { cls:'status-warning', text:diff+'天后停机' };
  return { cls:'status-active', text:diff+'天后停机' };
}

const FLAG_MAP = ${JSON.stringify(flagMap)};
function getFlag(num) {
  if (!num) return '';
  let digits = num.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.substring(2);
  for (const len of [3, 2, 1]) {
    if (digits.length >= len) {
      const prefix = digits.substring(0, len);
      if (FLAG_MAP[prefix]) return FLAG_MAP[prefix];
    }
  }
  return '';
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

const CURRENCY_SYMBOLS = ${JSON.stringify(CURRENCY_SYMBOLS)};
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }

function hideMenu() {
  const menu = document.getElementById('dropdown-menu');
  if (menu) menu.classList.add('hidden');
}

function toggleMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('dropdown-menu');
  const trigger = document.getElementById('menu-trigger');
  if (menu.classList.contains('hidden')) {
    const rect = trigger.getBoundingClientRect();
    menu.style.top = (rect.bottom + 8) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
}
document.addEventListener('click', e => {
  const menu = document.getElementById('dropdown-menu');
  const trigger = document.getElementById('menu-trigger');
  if (menu && !menu.contains(e.target) && !trigger.contains(e.target)) hideMenu();
});

// ==================== MODAL ====================
function openModal(type, item) {
  document.getElementById('form-type').value = type;
  document.getElementById('form-id').value = item ? item.id : '';
  const typeLabel = type === 'esim' ? ' eSIM' : type === 'balance' ? ' 话费' : ' 订阅';
  document.getElementById('modal-title').textContent = (item ? '编辑' : '添加') + typeLabel;
  document.getElementById('field-number').classList.toggle('hidden', type !== 'esim' && type !== 'balance');
  document.getElementById('field-category').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-region').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-sub-id').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-price').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-url').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-balance').classList.toggle('hidden', type !== 'balance');
  // expireDate: hidden for balance only
  // cycle: only shown for esim
  const expireField = document.getElementById('form-expire').closest('.space-y-4 > div') || document.getElementById('form-expire').parentElement;
  const cycleField = document.getElementById('form-cycle').closest('.space-y-4 > div') || document.getElementById('form-cycle').parentElement;
  if (expireField) expireField.classList.toggle('hidden', type === 'balance');
  if (cycleField) cycleField.classList.toggle('hidden', type !== 'esim');

  if (item) {
    document.getElementById('form-name').value = item.name || '';
    document.getElementById('form-number').value = item.number || '';
    document.getElementById('form-category').value = item.category || '';
    document.getElementById('form-region').value = item.region || '';
    document.getElementById('form-sub-id').value = item.subId || '';
    document.getElementById('form-expire').value = item.expireDate || '';
    document.getElementById('form-cycle').value = item.cycle || '';
    document.getElementById('form-price').value = item.price || '';
    document.getElementById('form-currency').value = item.currency || 'CNY';
    document.getElementById('form-billing').value = item.billing || 'monthly';
    document.getElementById('form-url').value = item.url || '';
    document.getElementById('form-remark').value = item.remark || '';
    if (type === 'balance') {
      document.getElementById('form-balance').value = item.balance ?? '';
      document.getElementById('form-monthly-fee').value = item.monthlyFee ?? '';
      document.getElementById('form-billing-day').value = item.billingDay ?? '';
    }
    setSelectedRemindDays(item.remindDays);
  } else {
    document.getElementById('item-form').reset();
    setSelectedRemindDays(DEFAULT_REMIND_DAYS_CLIENT); // defaults
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.add('flex');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('modal-overlay').classList.remove('flex'); }
function closeHistory() { document.getElementById('history-overlay').classList.add('hidden'); document.getElementById('history-overlay').classList.remove('flex'); }

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const body = {
    type: document.getElementById('form-type').value,
    name: document.getElementById('form-name').value.trim(),
    number: document.getElementById('form-number').value.trim(),
    category: document.getElementById('form-category').value,
    region: document.getElementById('form-region').value,
    subId: document.getElementById('form-sub-id').value.trim(),
    expireDate: document.getElementById('form-expire').value,
    cycle: parseInt(document.getElementById('form-cycle').value) || null,
    price: document.getElementById('form-price').value || null,
    currency: document.getElementById('form-currency').value,
    billing: document.getElementById('form-billing').value,
    url: document.getElementById('form-url').value.trim(),
    remark: document.getElementById('form-remark').value.trim(),
    remindDays: getSelectedRemindDays(),
    balance: document.getElementById('form-balance').value,
    monthlyFee: document.getElementById('form-monthly-fee').value,
    billingDay: document.getElementById('form-billing-day').value,
  };

  // Client-side validation for non-balance types
  if (body.type !== 'balance' && !body.expireDate) {
    alert('到期日期不能为空'); return;
  }

  const res = id ? await api('PUT', '/api/items/'+id, body) : await api('POST', '/api/items', body);
  const data = await res.json();
  if (data.success) { closeModal(); await loadItems(); }
  else if (data.message) alert(data.message);
  else alert('保存失败');
}

// ==================== ACTIONS ====================
function editItem(id) { const item = allItems.find(i => i.id === id); if (item) openModal(item.type, item); }

async function deleteItem(id) {
  if (!confirm('确定删除此记录？')) return;
  const res = await api('DELETE', '/api/items/'+id);
  const data = await res.json();
  if (data.success) await loadItems();
}

async function renewItem(id) {
  const res = await api('POST', '/api/items/'+id+'/renew');
  const data = await res.json();
  if (data.success) await loadItems(); else alert(data.message || '续期失败');
}

async function testNotify(id) {
  const res = await api('POST', '/api/items/'+id+'/test-notify');
  const data = await res.json();
  if (data.success) alert('✅ 测试通知已发送，请检查 Telegram');
  else alert('❌ ' + (data.message || '发送失败'));
}

async function rechargeItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const amount = prompt('充值金额（负数为校正扣减）：\\n当前余额: '+currSym(item.currency)+item.balance, '');
  if (amount === null || amount.trim() === '') return;
  const note = prompt('备注（可留空）：', '') || '';
  const res = await api('POST', '/api/items/'+id+'/recharge', { amount: parseFloat(amount), note });
  const data = await res.json();
  if (data.success) { await loadItems(); alert('✅ 充值成功！新余额: '+currSym(item.currency)+data.newBalance+'\\n预计停机: '+data.predictedSuspendDate); }
  else alert('❌ ' + (data.message || '充值失败'));
}

function getSelectedRemindDays() {
  return Array.from(document.querySelectorAll('.remind-day:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
}

function setSelectedRemindDays(days) {
  if (!days || !Array.isArray(days)) days = DEFAULT_REMIND_DAYS_CLIENT;
  document.querySelectorAll('.remind-day').forEach(cb => {
    cb.checked = days.includes(parseInt(cb.value));
  });
}

// ==================== IMPORT / EXPORT ====================
async function exportJSON() {
  toggleMenu();
  const res = await api('GET', '/api/items/export/json');
  const blob = await res.blob();
  downloadBlob(blob, 'sub-tracker-' + new Date().toISOString().split('T')[0] + '.json');
}

async function exportCSV() {
  toggleMenu();
  const res = await api('GET', '/api/items/export/csv');
  const blob = await res.blob();
  downloadBlob(blob, 'sub-tracker-' + new Date().toISOString().split('T')[0] + '.csv');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importJSON(input) {
  toggleMenu();
  const file = input.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res = await api('POST', '/api/items/import/json', data);
    const result = await res.json();
    if (result.success) {
      const skipped = result.skipped ? '，跳过 ' + result.skipped + ' 条' : '';
      const details = result.errors && result.errors.length
        ? '\\n前几条错误：\\n' + result.errors.map(e => '#' + (e.index + 1) + ' ' + (e.name || '') + ' ' + e.message).join('\\n')
        : '';
      alert('导入完成！新增 ' + result.added + ' 条' + skipped + '，共 ' + result.total + ' 条' + details);
      await loadItems();
    } else {
      alert(result.message || '导入失败');
    }
  } catch (e) {
    alert('JSON 解析失败: ' + e.message);
  }
  input.value = '';
}

async function openHistory() {
  hideMenu();
  const overlay = document.getElementById('history-overlay');
  const content = document.getElementById('history-content');
  content.innerHTML = '<div class="text-sm text-slate-400 py-8 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>加载中...</div>';
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  const res = await api('GET', '/api/history');
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) {
    content.innerHTML = '<div class="text-sm text-slate-500 py-10 text-center">暂无操作历史</div>';
    return;
  }
  content.innerHTML = data.map(historyHTML).join('');
}

function historyHTML(entry) {
  const actionMap = {
    create: ['新增', 'fa-plus', 'text-emerald-400'],
    update: ['更新', 'fa-pen', 'text-sky-400'],
    delete: ['删除', 'fa-trash', 'text-red-400'],
    renew: ['续期', 'fa-rotate', 'text-cyan-400'],
    recharge: ['充值', 'fa-plus-circle', 'text-amber-400'],
    import: ['导入', 'fa-upload', 'text-violet-400'],
  };
  const cfg = actionMap[entry.action] || [entry.action || '操作', 'fa-circle-info', 'text-slate-400'];
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('zh-CN', { hour12:false }) : '';
  const itemName = entry.itemName ? esc(entry.itemName) : '批量操作';
  const typeLabel = entry.itemType === 'esim' ? 'eSIM' : entry.itemType === 'balance' ? '话费' : entry.itemType === 'subscription' ? '订阅' : '';
  const detail = historyDetail(entry);
  return '<div class="glass-card rounded-xl p-4">' +
    '<div class="flex items-start gap-3">' +
      '<div class="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><i class="fa-solid '+cfg[1]+' '+cfg[2]+'"></i></div>' +
      '<div class="min-w-0 flex-1">' +
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="text-sm font-semibold text-white">'+cfg[0]+'</span>' +
          (typeLabel ? '<span class="text-[11px] text-slate-400 border border-white/10 rounded px-1.5 py-0.5">'+typeLabel+'</span>' : '') +
          '<span class="text-sm text-slate-300 truncate">'+itemName+'</span>' +
        '</div>' +
        (detail ? '<div class="text-xs text-slate-400 mt-1">'+detail+'</div>' : '') +
        '<div class="text-[11px] text-slate-500 mt-2">'+time+'</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function historyDetail(entry) {
  const d = entry.details || {};
  if (entry.action === 'renew' && d.newExpireDate) return '新到期日：' + esc(d.newExpireDate);
  if (entry.action === 'recharge') {
    const parts = [];
    if (d.amount != null) parts.push('金额：' + esc(d.amount));
    if (d.newBalance != null) parts.push('新余额：' + esc(d.newBalance));
    if (d.predictedSuspendDate) parts.push('预计停机：' + esc(d.predictedSuspendDate));
    return parts.join(' · ');
  }
  if (entry.action === 'import') return '新增 ' + (d.added || 0) + ' 条，跳过 ' + (d.skipped || 0) + ' 条，总计 ' + (d.total || 0) + ' 条';
  return '';
}

async function clearHistory() {
  if (!confirm('确定清空操作历史？')) return;
  const res = await api('DELETE', '/api/history');
  const data = await res.json();
  if (data.success) openHistory();
  else alert(data.message || '清空失败');
}

function downloadDemo() {
  toggleMenu();
  const demo = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    count: 4,
    items: [
      { type: 'esim', name: '美国保号卡', number: '+12025551234', expireDate: '2026-12-31', cycle: 180, remark: 'Ultra Mobile 保号', status: 'active' },
      { type: 'esim', name: '日本 IIJmio', number: '+81901234567', expireDate: '2026-09-15', cycle: 365, remark: '', status: 'active' },
      { type: 'subscription', name: 'ChatGPT Plus', category: 'AI 工具', region: 'US', subId: '', expireDate: '2026-07-20', price: '20', billing: 'monthly', currency: 'USD', autoRenew: true, remindDays: [3, 1, 0], url: 'https://chat.openai.com', remark: '', status: 'active' },
      { type: 'subscription', name: 'YouTube Premium', category: '视频会员', region: 'TR', subId: '', expireDate: '2026-08-01', price: '99.99', billing: 'yearly', currency: 'TRY', autoRenew: false, remindDays: [7, 3, 1], url: 'https://youtube.com/premium', remark: '土耳其区', status: 'active' },
    ]
  };
  const blob = new Blob([JSON.stringify(demo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sub-tracker-demo.json'; a.click();
  URL.revokeObjectURL(url);
}

// ==================== KEYBOARD ====================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeHistory();
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.add('hidden');
  }
});

// ==================== STATUS TOGGLE ====================
async function toggleStatus(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const newStatus = item.status === 'active' ? 'paused' : 'active';
  const res = await api('PUT', '/api/items/' + id, { status: newStatus });
  const data = await res.json();
  if (data.success) await loadItems();
}

// ==================== INIT ====================
(async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  const ok = await checkAuth();
  if (ok) enterDashboard();
  else { TOKEN = ''; localStorage.removeItem('token'); }
})();
</script>
</body>
</html>`;
}
