/**
 * HTML template - serves the complete frontend
 * Single-page app with login + dashboard
 */

export function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sub-Tracker | eSIM 保号 & 订阅管理</title>
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
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .glass {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .glass-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }
    .glass-input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #f1f5f9;
    }
    .glass-input::placeholder { color: rgba(255, 255, 255, 0.4); }
    .glass-input:focus {
      outline: none;
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      transition: all 0.2s;
    }
    .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      transition: all 0.2s;
    }
    .status-active { color: #4ade80; }
    .status-warning { color: #fbbf24; }
    .status-danger { color: #f87171; }
    .status-expired { color: #ef4444; }
    .modal-overlay {
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .tab-active { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: #38bdf8; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
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
        <input id="otp-input" type="text" maxlength="6" placeholder="输入 6 位验证码"
          class="glass-input w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] font-mono">
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
    <div class="glass rounded-2xl p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <i class="fa-solid fa-chart-line text-sky-400"></i> Sub-Tracker
        </h1>
        <p class="text-slate-400 mt-1 text-sm">eSIM 保号 & 订阅费用管理看板</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap justify-center">
        <span class="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full" id="today-display"></span>
        <button onclick="openModal('esim')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> 添加 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> 添加订阅
        </button>
        <button onclick="logout()" class="text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors" title="退出">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="stats-bar"></div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button onclick="setFilter('all')" data-filter="all" class="filter-tab tab-active px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all">
        <i class="fa-solid fa-globe mr-1"></i> 全部
      </button>
      <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
        <i class="fa-solid fa-sim-card mr-1"></i> eSIM
      </button>
      <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
        <i class="fa-solid fa-credit-card mr-1"></i> 订阅
      </button>
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

    <!-- Items grid -->
    <div id="items-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    <div id="empty-state" class="hidden text-center py-16 text-slate-500">
      <i class="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
      <p class="text-lg">暂无数据</p>
      <p class="text-sm mt-1">点击上方按钮添加你的第一个 eSIM 卡或订阅</p>
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
          <!-- Name -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">名称 *</label>
            <input id="form-name" type="text" required placeholder="如: T-Mobile eSIM / Netflix"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Number (eSIM only) -->
          <div id="field-number" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">号码</label>
            <input id="form-number" type="text" placeholder="+8613800138000"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Category (subscription only) -->
          <div id="field-category" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">分类</label>
            <select id="form-category" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">未分类</option>
              <option value="VPN">VPN</option>
              <option value="Cloud">云服务</option>
              <option value="Streaming">流媒体</option>
              <option value="Domain">域名/SSL</option>
              <option value="VPS">VPS/服务器</option>
              <option value="Software">软件订阅</option>
              <option value="Other">其他</option>
            </select>
          </div>

          <!-- Expire Date -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">到期日期 *</label>
            <input id="form-expire" type="date" required
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Cycle -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">保号/续费周期 (天)</label>
            <input id="form-cycle" type="number" min="1" placeholder="如: 180"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Price & Currency (subscription only) -->
          <div id="field-price" class="hidden grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-slate-400 mb-1 block">费用</label>
              <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99"
                class="glass-input w-full px-4 py-3 rounded-xl text-sm">
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
              </select>
            </div>
          </div>

          <!-- Remark -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">备注</label>
            <textarea id="form-remark" rows="2" placeholder="可选备注..."
              class="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white">
            <i class="fa-solid fa-check mr-1"></i> 保存
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">
            取消
          </button>
        </div>
      </form>
    </div>
  </div>

<script>
// ==================== STATE ====================
let TOKEN = localStorage.getItem('token') || '';
let allItems = [];
let currentFilter = 'all';

const API = '';

// ==================== AUTH ====================
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = TOKEN;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res.json();
}

async function sendOTP() {
  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 发送中...';
  const data = await api('POST', '/api/auth/send');
  if (data.success) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> 已发送，请查看 TG';
    btn.classList.add('text-green-400');
    showLoginMsg('');
  } else {
    showLoginMsg(data.message || '发送失败');
    btn.innerHTML = '<i class="fa-brands fa-telegram"></i> 获取验证码';
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-brands fa-telegram"></i> 获取验证码';
    btn.classList.remove('text-green-400');
  }, 5000);
}

async function verifyOTP() {
  const code = document.getElementById('otp-input').value.trim();
  if (!code || code.length !== 6) return showLoginMsg('请输入 6 位验证码');
  const data = await api('POST', '/api/auth/verify', { code });
  if (data.success) {
    TOKEN = data.token;
    localStorage.setItem('token', TOKEN);
    enterDashboard();
  } else {
    showLoginMsg(data.message || '验证失败');
  }
}

function showLoginMsg(msg) {
  const el = document.getElementById('login-msg');
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

async function checkAuth() {
  if (!TOKEN) return false;
  const data = await api('GET', '/api/auth/check');
  return data.success;
}

function logout() {
  TOKEN = '';
  localStorage.removeItem('token');
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
}

// ==================== DASHBOARD ====================
async function enterDashboard() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  document.getElementById('today-display').textContent = '今日: ' + new Date().toLocaleDateString('zh-CN');
  await loadItems();
}

async function loadItems() {
  const data = await api('GET', '/api/items');
  if (Array.isArray(data)) allItems = data;
  renderStats();
  renderItems();
}

// ==================== RENDER ====================
function renderStats() {
  const esims = allItems.filter(i => i.type === 'esim');
  const subs = allItems.filter(i => i.type === 'subscription');
  const today = new Date(); today.setHours(0,0,0,0);

  let urgentCount = 0;
  let monthlyCost = 0;
  allItems.forEach(i => {
    if (i.expireDate) {
      const exp = new Date(i.expireDate + 'T00:00:00');
      const diff = Math.ceil((exp - today) / 86400000);
      if (diff <= 15) urgentCount++;
    }
    if (i.type === 'subscription' && i.price) {
      monthlyCost += parseFloat(i.price) || 0;
    }
  });

  const stats = [
    { label: 'eSIM 卡', value: esims.length, icon: 'fa-sim-card', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: '订阅服务', value: subs.length, icon: 'fa-credit-card', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: '即将到期', value: urgentCount, icon: 'fa-clock', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: '月度支出', value: '¥' + monthlyCost.toFixed(0), icon: 'fa-coins', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map(s =>
    '<div class="glass-card rounded-xl p-4">' +
      '<div class="flex items-center gap-3">' +
        '<div class="' + s.bg + ' w-10 h-10 rounded-lg flex items-center justify-center">' +
          '<i class="fa-solid ' + s.icon + ' ' + s.color + '"></i>' +
        '</div>' +
        '<div>' +
          '<div class="text-xs text-slate-400">' + s.label + '</div>' +
          '<div class="text-xl font-bold text-white">' + s.value + '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');
}

function renderItems() {
  const search = (document.getElementById('search-input').value || '').toLowerCase();
  let items = allItems;

  if (currentFilter !== 'all') items = items.filter(i => i.type === currentFilter);
  if (search) items = items.filter(i =>
    (i.name || '').toLowerCase().includes(search) ||
    (i.number || '').toLowerCase().includes(search) ||
    (i.remark || '').toLowerCase().includes(search) ||
    (i.category || '').toLowerCase().includes(search)
  );

  // Sort: urgent first
  const today = new Date(); today.setHours(0,0,0,0);
  items.sort((a, b) => {
    const da = a.expireDate ? Math.ceil((new Date(a.expireDate+'T00:00:00') - today) / 86400000) : 9999;
    const db = b.expireDate ? Math.ceil((new Date(b.expireDate+'T00:00:00') - today) / 86400000) : 9999;
    return da - db;
  });

  const grid = document.getElementById('items-grid');
  const empty = document.getElementById('empty-state');

  if (!items.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = items.map(item => renderItemCard(item)).join('');
}

function renderItemCard(item) {
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = item.expireDate ? new Date(item.expireDate+'T00:00:00') : null;
  const diff = exp ? Math.ceil((exp - today) / 86400000) : null;

  let statusClass = 'status-active';
  let statusText = '正常';
  if (diff !== null) {
    if (diff < 0) { statusClass = 'status-expired'; statusText = '已过期 ' + Math.abs(diff) + ' 天'; }
    else if (diff === 0) { statusClass = 'status-danger'; statusText = '今天到期'; }
    else if (diff <= 15) { statusClass = 'status-warning'; statusText = '剩余 ' + diff + ' 天'; }
    else { statusText = '剩余 ' + diff + ' 天'; }
  }

  const isEsim = item.type === 'esim';
  const typeIcon = isEsim ? 'fa-sim-card' : 'fa-credit-card';
  const typeColor = isEsim ? 'text-cyan-400' : 'text-violet-400';
  const typeBg = isEsim ? 'bg-cyan-500/10' : 'bg-violet-500/10';
  const typeLabel = isEsim ? 'eSIM' : (item.category || '订阅');

  // Flag for eSIM
  let flag = '';
  if (isEsim && item.number) {
    const m = item.number.match(/^\\+?(\\d{1,3})/);
    if (m) {
      const flags = {'1':'🇺🇸','7':'🇷🇺','20':'🇪🇬','33':'🇫🇷','34':'🇪🇸','39':'🇮🇹','44':'🇬🇧','49':'🇩🇪','52':'🇲🇽','55':'🇧🇷','60':'🇲🇾','61':'🇦🇺','62':'🇮🇩','63':'🇵🇭','65':'🇸🇬','66':'🇹🇭','81':'🇯🇵','82':'🇰🇷','84':'🇻🇳','86':'🇨🇳','90':'🇹🇷','91':'🇮🇳','852':'🇭🇰','853':'🇲🇴','886':'🇹🇼'};
      flag = flags[m[1]] || '🌍';
    }
  }

  let body = '';
  if (isEsim) {
    body = (flag ? '<div class="text-2xl mb-2">' + flag + '</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">' + escHtml(item.number) + '</div>' : '');
  } else {
    const priceStr = item.price ? item.currency + ' ' + item.price : '';
    body = (item.category ? '<div class="text-xs text-slate-400 mb-1">' + escHtml(item.category) + '</div>' : '') +
      (priceStr ? '<div class="text-sm text-emerald-400 font-semibold">' + escHtml(priceStr) + '</div>' : '');
  }

  const cycleStr = item.cycle ? item.cycle + '天' : '';
  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem(\\'' + item.id + '\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-colors" title="一键续期"><i class="fa-solid fa-rotate"></i> 续期</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3">' +
      '<div class="flex items-center gap-2">' +
        '<div class="' + typeBg + ' w-8 h-8 rounded-lg flex items-center justify-center">' +
          '<i class="fa-solid ' + typeIcon + ' ' + typeColor + ' text-sm"></i>' +
        '</div>' +
        '<span class="text-xs ' + typeColor + ' opacity-70">' + escHtml(typeLabel) + '</span>' +
      '</div>' +
      '<span class="text-xs font-semibold ' + statusClass + '">' + escHtml(statusText) + '</span>' +
    '</div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">' + escHtml(item.name) + '</h3>' +
    body +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>到期: ' + item.expireDate + '</div>' : '') +
    (cycleStr ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: ' + cycleStr + '</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>' + escHtml(item.remark) + '</div>' : '') +
    '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">' +
      renewBtn +
      '<button onclick="editItem(\\'' + item.id + '\\')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"><i class="fa-solid fa-pen"></i></button>' +
      '<button onclick="deleteItem(\\'' + item.id + '\\')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"><i class="fa-solid fa-trash"></i></button>' +
    '</div>' +
  '</div>';
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==================== FILTER ====================
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(b => {
    const active = b.dataset.filter === f;
    b.classList.toggle('tab-active', active);
    b.classList.toggle('text-slate-400', !active);
  });
  renderItems();
}

// ==================== MODAL ====================
let editingType = 'esim';

function openModal(type, item) {
  editingType = type;
  document.getElementById('form-type').value = type;
  document.getElementById('form-id').value = item ? item.id : '';
  document.getElementById('modal-title').textContent = (item ? '编辑' : '添加') + (type === 'esim' ? ' eSIM' : ' 订阅');

  // Show/hide type-specific fields
  document.getElementById('field-number').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-category').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-price').classList.toggle('hidden', type !== 'subscription');

  if (item) {
    document.getElementById('form-name').value = item.name || '';
    document.getElementById('form-number').value = item.number || '';
    document.getElementById('form-category').value = item.category || '';
    document.getElementById('form-expire').value = item.expireDate || '';
    document.getElementById('form-cycle').value = item.cycle || '';
    document.getElementById('form-price').value = item.price || '';
    document.getElementById('form-currency').value = item.currency || 'CNY';
    document.getElementById('form-remark').value = item.remark || '';
  } else {
    document.getElementById('item-form').reset();
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.add('flex');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-overlay').classList.remove('flex');
}

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const body = {
    type: document.getElementById('form-type').value,
    name: document.getElementById('form-name').value.trim(),
    number: document.getElementById('form-number').value.trim(),
    category: document.getElementById('form-category').value,
    expireDate: document.getElementById('form-expire').value,
    cycle: parseInt(document.getElementById('form-cycle').value) || null,
    price: document.getElementById('form-price').value || null,
    currency: document.getElementById('form-currency').value,
    remark: document.getElementById('form-remark').value.trim(),
  };

  let data;
  if (id) {
    data = await api('PUT', '/api/items/' + id, body);
  } else {
    data = await api('POST', '/api/items', body);
  }

  if (data.success) {
    closeModal();
    await loadItems();
  } else {
    alert(data.message || '保存失败');
  }
}

// ==================== ACTIONS ====================
function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (item) openModal(item.type, item);
}

async function deleteItem(id) {
  if (!confirm('确定删除此记录？')) return;
  const data = await api('DELETE', '/api/items/' + id);
  if (data.success) await loadItems();
}

async function renewItem(id) {
  const data = await api('POST', '/api/items/' + id + '/renew');
  if (data.success) {
    await loadItems();
  } else {
    alert(data.message || '续期失败');
  }
}

// ==================== INIT ====================
(async function init() {
  const ok = await checkAuth();
  if (ok) {
    enterDashboard();
  } else {
    TOKEN = '';
    localStorage.removeItem('token');
  }
})();
</script>
</body>
</html>`;
}
