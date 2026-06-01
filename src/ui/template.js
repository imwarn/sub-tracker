/**
 * HTML template - serves the complete frontend
 * Single-page app with login + dashboard
 * Phase 2: list/card/calendar views, stats, import/export
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
      <div class="flex items-center gap-2 flex-wrap justify-center">
        <span class="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full" id="today-display"></span>
        <button onclick="openModal('esim')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> 订阅
        </button>
        <div class="relative" id="menu-trigger">
          <button onclick="toggleMenu(event)" class="text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" id="stats-bar"></div>

    <!-- View toggle + Filter -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <div class="flex gap-2 flex-wrap">
        <button onclick="setFilter('all')" data-filter="all" class="filter-tab tab-active px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all">
          <i class="fa-solid fa-globe mr-1"></i>全部
        </button>
        <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-sim-card mr-1"></i>eSIM
        </button>
        <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-credit-card mr-1"></i>订阅
        </button>
      </div>
      <div class="flex gap-1 glass rounded-lg p-1">
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
      <p class="text-sm mb-6">添加你的第一个 eSIM 卡或订阅服务</p>
      <div class="flex gap-3 justify-center">
        <button onclick="openModal('esim')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> 添加 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> 添加订阅
        </button>
      </div>
    </div>
  </div>

  <!-- ========== MODAL ========== -->
  <div id="modal-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
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
              <option value="CN">🇨🇳 大陆</option>
              <option value="HK">🇭🇰 香港</option>
              <option value="TW">🇹🇼 台湾</option>
              <option value="US">🇺🇸 美区</option>
              <option value="JP">🇯🇵 日区</option>
              <option value="KR">🇰🇷 韩区</option>
              <option value="TR">🇹🇷 土耳其</option>
              <option value="NG">🇳🇬 尼日利亚</option>
              <option value="IN">🇮🇳 印度</option>
              <option value="BR">🇧🇷 巴西</option>
              <option value="AR">🇦🇷 阿根廷</option>
              <option value="PH">🇵🇭 菲律宾</option>
              <option value="MY">🇲🇾 马来西亚</option>
              <option value="SG">🇸🇬 新加坡</option>
              <option value="EU">🇪🇺 欧洲</option>
              <option value="OTHER">🌍 其他</option>
            </select>
          </div>
          <div id="field-sub-id" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">订阅 ID / 账号</label>
            <input id="form-sub-id" type="text" placeholder="账号邮箱或订阅ID" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">到期日期 *</label>
            <input id="form-expire" type="date" required min="2020-01-01" max="2035-12-31" class="glass-input w-full px-4 py-3 rounded-xl text-sm" lang="zh-CN">
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
          <div id="field-price" class="hidden">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">费用</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">货币</label>
                <select id="form-currency" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                  <option value="CNY">🇨🇳 CNY ¥</option>
                  <option value="USD">🇺🇸 USD $</option>
                  <option value="EUR">🇪🇺 EUR €</option>
                  <option value="GBP">🇬🇧 GBP £</option>
                  <option value="JPY">🇯🇵 JPY ¥</option>
                  <option value="HKD">🇭🇰 HKD $</option>
                  <option value="TWD">🇹🇼 TWD $</option>
                  <option value="KRW">🇰🇷 KRW ₩</option>
                  <option value="TRY">🇹🇷 TRY ₺</option>
                  <option value="THB">🇹🇭 THB ฿</option>
                  <option value="NGN">🇳🇬 NGN ₦</option>
                  <option value="INR">🇮🇳 INR ₹</option>
                  <option value="PHP">🇵🇭 PHP ₱</option>
                  <option value="MYR">🇲🇾 MYR RM</option>
                  <option value="SGD">🇸🇬 SGD $</option>
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

function logout() {
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
  renderStats(); renderItems();
}

// ==================== STATS ====================
function renderStats() {
  const esims = allItems.filter(i => i.type === 'esim');
  const subs = allItems.filter(i => i.type === 'subscription');
  const today = new Date(); today.setHours(0,0,0,0);
  let urgentCount = 0;
  allItems.forEach(i => {
    if (i.expireDate) { const exp = new Date(i.expireDate+'T00:00:00'); const diff = Math.ceil((exp-today)/86400000); if (diff <= 15) urgentCount++; }
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

  // Determine display currency from first subscription with a price
  const primaryCur = subs.find(s => s.price)?.currency || 'CNY';
  const sym = currSym(primaryCur);

  const stats = [
    { label:'eSIM', value:esims.length, icon:'fa-sim-card', color:'text-cyan-400', bg:'bg-cyan-500/10' },
    { label:'订阅', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10' },
    { label:'即将到期', value:urgentCount, icon:'fa-clock', color:'text-amber-400', bg:'bg-amber-500/10' },
    { label:'月度支出', value:sym+monthlyCost.toFixed(0), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
    { label:'年度预算', value:sym+yearlyCost.toFixed(0), icon:'fa-chart-pie', color:'text-rose-400', bg:'bg-rose-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map(s =>
    '<div class="glass-card rounded-xl p-4"><div class="flex items-center gap-3">' +
    '<div class="'+s.bg+' w-10 h-10 rounded-lg flex items-center justify-center"><i class="fa-solid '+s.icon+' '+s.color+'"></i></div>' +
    '<div><div class="text-xs text-slate-400">'+s.label+'</div><div class="text-xl font-bold text-white">'+s.value+'</div></div>' +
    '</div></div>'
  ).join('');
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
    const da = a.expireDate ? Math.ceil((new Date(a.expireDate+'T00:00:00')-today)/86400000) : 9999;
    const db = b.expireDate ? Math.ceil((new Date(b.expireDate+'T00:00:00')-today)/86400000) : 9999;
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
  const st = statusInfo(diff);
  const isEsim = item.type === 'esim';
  const tc = isEsim ? 'text-cyan-400' : 'text-violet-400';
  const tb = isEsim ? 'bg-cyan-500/10' : 'bg-violet-500/10';
  const ti = isEsim ? 'fa-sim-card' : 'fa-credit-card';
  const tl = isEsim ? 'eSIM' : (item.category||'订阅');

  let body = '';
  if (isEsim) {
    const flag = getFlag(item.number);
    body = (flag ? '<div class="text-2xl mb-2">'+flag+'</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">'+esc(item.number)+'</div>' : '');
  } else {
    const ps = item.price ? (item.billing==='yearly' ? currSym(item.currency)+item.price+'/年' : item.billing==='once' ? currSym(item.currency)+item.price+'(一次性)' : currSym(item.currency)+item.price+'/月') : '';
    const regionFlags = {'CN':'🇨🇳','HK':'🇭🇰','TW':'🇹🇼','US':'🇺🇸','JP':'🇯🇵','KR':'🇰🇷','TR':'🇹🇷','NG':'🇳🇬','IN':'🇮🇳','BR':'🇧🇷','AR':'🇦🇷','PH':'🇵🇭','MY':'🇲🇾','SG':'🇸🇬','EU':'🇪🇺'};
    const regionStr = item.region ? (regionFlags[item.region]||'🌍')+' '+item.region : '';
    const catStr = item.category ? esc(item.category) : '';
    const metaLine = [catStr, regionStr].filter(Boolean).join(' · ');
    body = (metaLine ? '<div class="text-xs text-slate-400 mb-1">'+metaLine+'</div>' : '') +
      (ps ? '<div class="text-sm text-emerald-400 font-semibold">'+esc(ps)+'</div>' : '') +
      (item.subId ? '<div class="text-xs text-slate-500 mt-1 truncate"><i class="fa-solid fa-id-card mr-1"></i>'+esc(item.subId)+'</div>' : '');
    if (item.url) body += '<a href="'+esc(item.url)+'" target="_blank" class="text-xs text-sky-400 hover:underline mt-1 inline-block"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>访问</a>';
  }

  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-colors"><i class="fa-solid fa-rotate"></i> 续期</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">' +
    '<div class="'+tb+' w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid '+ti+' '+tc+' text-sm"></i></div>' +
    '<span class="text-xs '+tc+' opacity-70">'+esc(tl)+'</span></div>' +
    '<span class="text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</span></div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">'+esc(item.name)+'</h3>' +
    body +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>到期: '+item.expireDate+'</div>' : '') +
    (item.cycle ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: '+item.cycle+'天</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>'+esc(item.remark)+'</div>' : '') +
    '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">' +
    renewBtn +
    '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs px-2 py-1 rounded-lg transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
    '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
    '<button onclick="editItem(\\''+item.id+'\\')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
    '<button onclick="deleteItem(\\''+item.id+'\\')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
    '</div></div>';
}

// -- List view --
function renderList(items, area) {
  let html = '<div class="glass rounded-xl overflow-hidden">';
  html += '<div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/10 bg-white/5">' +
    '<div class="col-span-4">名称</div><div class="col-span-2 hidden sm:block">类型/号码</div>' +
    '<div class="col-span-2">到期</div><div class="col-span-2 hidden sm:block">状态</div>' +
    '<div class="col-span-2 text-right">操作</div></div>';
  html += items.map(i => listRowHTML(i)).join('');
  html += '</div>';
  area.innerHTML = html;
}

function listRowHTML(item) {
  const diff = getDiff(item);
  const st = statusInfo(diff);
  const isEsim = item.type === 'esim';
  const sub = isEsim ? (item.number || '-') : (item.category || '-');
  const flag = isEsim ? getFlag(item.number)+' ' : '';
  const priceStr = !isEsim && item.price ? ' · '+currSym(item.currency)+item.price : '';

  return '<div class="list-row grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5">' +
    '<div class="col-span-4 flex items-center gap-2 min-w-0">' +
      '<i class="fa-solid '+(isEsim?'fa-sim-card text-cyan-400':'fa-credit-card text-violet-400')+' text-sm flex-shrink-0"></i>' +
      '<span class="truncate text-sm font-medium text-white">'+esc(item.name)+priceStr+'</span></div>' +
    '<div class="col-span-2 hidden sm:block text-xs text-slate-400 truncate">'+flag+esc(sub)+'</div>' +
    '<div class="col-span-2 text-xs text-slate-300">'+(item.expireDate||'-')+'</div>' +
    '<div class="col-span-2 hidden sm:block text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</div>' +
    '<div class="col-span-2 flex justify-end gap-1">' +
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
    if (!i.expireDate) return;
    const d = new Date(i.expireDate+'T00:00:00');
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
      const isEsim = e.type === 'esim';
      const bg = isEsim ? 'bg-cyan-500/30 text-cyan-300' : 'bg-violet-500/30 text-violet-300';
      html += '<div class="cal-event '+bg+' mb-0.5 cursor-pointer" onclick="editItem(\\''+e.id+'\\')" title="'+esc(e.name)+'">'+esc(e.name)+'</div>';
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

const FLAG_MAP = {'1':'🇺🇸','7':'🇷🇺','20':'🇪🇬','27':'🇿🇦','30':'🇬🇷','31':'🇳🇱','32':'🇧🇪','33':'🇫🇷','34':'🇪🇸','36':'🇭🇺','39':'🇮🇹','40':'🇷🇴','41':'🇨🇭','43':'🇦🇹','44':'🇬🇧','45':'🇩🇰','46':'🇸🇪','47':'🇳🇴','48':'🇵🇱','49':'🇩🇪','51':'🇵🇪','52':'🇲🇽','53':'🇨🇺','54':'🇦🇷','55':'🇧🇷','56':'🇨🇱','57':'🇨🇴','58':'🇻🇪','60':'🇲🇾','61':'🇦🇺','62':'🇮🇩','63':'🇵🇭','64':'🇳🇿','65':'🇸🇬','66':'🇹🇭','81':'🇯🇵','82':'🇰🇷','84':'🇻🇳','86':'🇨🇳','90':'🇹🇷','91':'🇮🇳','92':'🇵🇰','93':'🇦🇫','94':'🇱🇰','95':'🇲🇲','98':'🇮🇷','212':'🇲🇦','213':'🇩🇿','216':'🇹🇳','218':'🇱🇾','220':'🇬🇲','221':'🇸🇳','223':'🇲🇱','224':'🇬🇳','225':'🇨🇮','226':'🇧🇫','227':'🇳🇪','228':'🇹🇬','229':'🇧🇯','230':'🇲🇺','231':'🇱🇷','233':'🇬🇭','234':'🇳🇬','235':'🇹🇩','237':'🇨🇲','242':'🇨🇬','243':'🇨🇩','244':'🇦🇴','249':'🇸🇩','250':'🇷🇼','251':'🇪🇹','252':'🇸🇴','253':'🇩🇯','254':'🇰🇪','255':'🇹🇿','256':'🇺🇬','257':'🇧🇮','258':'🇲🇿','260':'🇿🇲','261':'🇲🇬','263':'🇿🇼','264':'🇳🇦','265':'🇲🇼','266':'🇱🇸','267':'🇧🇼','268':'🇸🇿','269':'🇰🇲','297':'🇦🇼','299':'🇬🇱','350':'🇬🇮','351':'🇵🇹','352':'🇱🇺','353':'🇮🇪','354':'🇮🇸','355':'🇦🇱','356':'🇲🇹','357':'🇨🇾','358':'🇫🇮','359':'🇧🇬','370':'🇱🇹','371':'🇱🇻','372':'🇪🇪','373':'🇲🇩','374':'🇦🇲','375':'🇧🇾','376':'🇦🇩','377':'🇲🇨','380':'🇺🇦','381':'🇷🇸','382':'🇲🇪','385':'🇭🇷','386':'🇸🇮','387':'🇧🇦','389':'🇲🇰','850':'🇰🇵','852':'🇭🇰','853':'🇲🇴','855':'🇰🇭','856':'🇱🇦','880':'🇧🇩','886':'🇹🇼','960':'🇲🇻','961':'🇱🇧','962':'🇯🇴','964':'🇮🇶','965':'🇰🇼','966':'🇸🇦','967':'🇾🇪','968':'🇴🇲','971':'🇦🇪','972':'🇮🇱','973':'🇧🇭','974':'🇶🇦','975':'🇧🇹','976':'🇲🇳','977':'🇳🇵','992':'🇹🇯','994':'🇦🇿','995':'🇬🇪','996':'🇰🇬','998':'🇺🇿'};
function getFlag(num) {
  if (!num) return '';
  let digits = num.replace(/[^\d]/g, '');
  if (digits.startsWith('00')) digits = digits.substring(2);
  for (const len of [3, 2, 1]) {
    if (digits.length >= len) {
      const prefix = digits.substring(0, len);
      if (FLAG_MAP[prefix]) return FLAG_MAP[prefix];
    }
  }
  return '🌍';
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

const CURRENCY_SYMBOLS = {'CNY':'¥','USD':'$','EUR':'€','GBP':'£','JPY':'¥','HKD':'$','TWD':'$','KRW':'₩','TRY':'₺','THB':'฿','NGN':'₦','INR':'₹','PHP':'₱','MYR':'RM','SGD':'$'};
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }

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
  if (menu && !menu.contains(e.target) && !trigger.contains(e.target)) menu.classList.add('hidden');
});

// ==================== MODAL ====================
function openModal(type, item) {
  document.getElementById('form-type').value = type;
  document.getElementById('form-id').value = item ? item.id : '';
  document.getElementById('modal-title').textContent = (item ? '编辑' : '添加') + (type === 'esim' ? ' eSIM' : ' 订阅');
  document.getElementById('field-number').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-category').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-region').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-sub-id').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-price').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-url').classList.toggle('hidden', type !== 'subscription');

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
    setSelectedRemindDays(item.remindDays);
  } else {
    document.getElementById('item-form').reset();
    setSelectedRemindDays([3, 1, 0]); // defaults
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.add('flex');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('modal-overlay').classList.remove('flex'); }

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
  };

  const res = id ? await api('PUT', '/api/items/'+id, body) : await api('POST', '/api/items', body);
  const data = await res.json();
  if (data.success) { closeModal(); await loadItems(); } else alert(data.message || '保存失败');
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

function getSelectedRemindDays() {
  return Array.from(document.querySelectorAll('.remind-day:checked')).map(cb => parseInt(cb.value)).sort((a,b) => b-a);
}

function setSelectedRemindDays(days) {
  if (!days || !Array.isArray(days)) days = [3, 1, 0];
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
      alert('导入成功！新增 ' + result.added + ' 条，共 ' + result.total + ' 条');
      await loadItems();
    } else {
      alert(result.message || '导入失败');
    }
  } catch (e) {
    alert('JSON 解析失败: ' + e.message);
  }
  input.value = '';
}

// ==================== KEYBOARD ====================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
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
  const ok = await checkAuth();
  if (ok) enterDashboard();
  else { TOKEN = ''; localStorage.removeItem('token'); }
})();
</script>
</body>
</html>`;
}
