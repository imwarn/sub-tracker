/**
 * Browser-side application script injected into the HTML shell.
 */

import { CURRENCY_SYMBOLS, DEFAULT_REMIND_DAYS, DEFAULT_EXCHANGE_RATES } from '../data/constants.js';
import { getCountryMap } from '../utils/country.js';
import { countUrgent, sortItemsByPaused } from '../utils/stats.js';
import { getQRCodeClientScript } from '../utils/qrcode.js';

function getFrontendFlagMap() {
  return Object.fromEntries(
    Object.entries(getCountryMap()).map(([prefix, info]) => [prefix, info.code])
  );
}

export function getClientScript() {
  const flagMap = getFrontendFlagMap();
  const statsSrc = countUrgent.toString() + '\n' + sortItemsByPaused.toString();
  const qrScript = getQRCodeClientScript();

  return `${statsSrc}
${qrScript}

let TOKEN = localStorage.getItem('token') || '';
let allItems = [];
let currentFilter = 'all';
let currentView = 'grid';
let calYear, calMonth;
let currentLpaString = '';
let _renderTimer = null;
function debouncedRender() { clearTimeout(_renderTimer); _renderTimer = setTimeout(renderItems, 300); }

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
}

function copyText(text, label = '') {
  if (!text) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast((label ? label + ' ' : '') + '已复制到剪贴板', 'success');
    }).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
}

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast((label ? label + ' ' : '') + '已复制到剪贴板', 'success');
  } catch (e) {
    showToast('复制失败，请手动选择复制', 'error');
  }
  document.body.removeChild(ta);
}

function togglePasswordVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPass ? 'fa-solid fa-eye text-sky-400' : 'fa-solid fa-eye-slash text-slate-400';
  }
}

function toggleFab() {
  const menu = document.getElementById('fab-menu');
  const icon = document.getElementById('fab-icon');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !isHidden);
  if (icon) {
    icon.style.transform = isHidden ? 'rotate(45deg)' : 'rotate(0deg)';
  }
}

const API = '';
const DEFAULT_REMIND_DAYS_CLIENT = ${JSON.stringify(DEFAULT_REMIND_DAYS)};
const DEFAULT_EXCHANGE_RATES = ${JSON.stringify(DEFAULT_EXCHANGE_RATES)};

// ==================== API ====================
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = TOKEN;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401 && TOKEN) {
    TOKEN = ''; localStorage.removeItem('token');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    showLoginMsg('会话已过期，请重新登录');
  }
  return res;
}

// ==================== AUTH ====================
async function sendOTP() {
  const btn = document.getElementById('send-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 发送中...';
  const res = await api('POST', '/api/auth/send');
  const data = await res.json();
  if (data.success) { btn.innerHTML = '<i class="fa-solid fa-check"></i> 已发送'; btn.classList.add('text-green-400'); showLoginMsg(''); }
  else { showLoginMsg(data.message || '发送失败'); btn.innerHTML = '<i class="fa-solid fa-key"></i> 获取验证码'; }
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> 获取验证码'; btn.classList.remove('text-green-400'); }, 5000);
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
  calYear = now.getFullYear(); calMonth = now.getMonth();
  await loadItems();
}

async function loadItems() {
  try {
    const res = await api('GET', '/api/items');
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) allItems = data; }
    else { console.error('loadItems failed:', res.status); }
  } catch (e) {
    console.error('loadItems error:', e);
  }
  renderStats(); renderAnalytics(); renderItems();
}

// ==================== STATS ====================
function renderStats() {
  const esims = allItems.filter(i => i.type === 'esim');
  const subs = allItems.filter(i => i.type === 'subscription');
  const balances = allItems.filter(i => i.type === 'balance');
  const urgentCount = countUrgent(allItems);

  const activeSubs = subs.filter(s => s.status !== 'paused');
  const activeBalances = balances.filter(b => b.status !== 'paused');
  const monthlyByCur = {};
  const yearlyByCur = {};

  activeSubs.forEach(s => {
    if (!s.price) return;
    const p = parseFloat(s.price);
    const cur = s.currency || 'CNY';
    const billing = s.billing || 'monthly';
    if (billing === 'monthly') { monthlyByCur[cur] = (monthlyByCur[cur]||0) + p; yearlyByCur[cur] = (yearlyByCur[cur]||0) + p * 12; }
    else if (billing === 'yearly') { monthlyByCur[cur] = (monthlyByCur[cur]||0) + p / 12; yearlyByCur[cur] = (yearlyByCur[cur]||0) + p; }
    else { yearlyByCur[cur] = (yearlyByCur[cur]||0) + p; }
  });

  activeBalances.forEach(b => {
    if (!b.monthlyFee) return;
    const cur = b.currency || 'CNY';
    monthlyByCur[cur] = (monthlyByCur[cur]||0) + parseFloat(b.monthlyFee);
    yearlyByCur[cur] = (yearlyByCur[cur]||0) + parseFloat(b.monthlyFee) * 12;
  });

  const balanceByCur = {};
  balances.forEach(b => {
    if (b.balance == null) return;
    const cur = b.currency || 'CNY';
    balanceByCur[cur] = (balanceByCur[cur]||0) + b.balance;
  });

  const allCurs = [...new Set([...Object.keys(monthlyByCur), ...Object.keys(balanceByCur)])].sort();

  // Multi-currency converted estimate to CNY
  const convertedMonthlyCNY = Object.entries(monthlyByCur).reduce((acc, [cur, val]) => acc + val * (DEFAULT_EXCHANGE_RATES[cur] || 1), 0);

  function fmtBalance() {
    if (!allCurs.length) return '0';
    const parts = allCurs.filter(c => balanceByCur[c] > 0).map(c => currSym(c) + Math.round(balanceByCur[c]));
    return parts.length ? parts[0] + (parts.length > 1 ? ' +' : '') : '0';
  }

  const stats = [
    { label:'eSIM', value:esims.length, icon:'fa-sim-card', color:'text-cyan-400', bg:'bg-cyan-500/10', filter:'esim' },
    { label:'订阅', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10', filter:'subscription' },
    { label:'话费', value:balances.length ? fmtBalance() : '0', icon:'fa-wallet', color:'text-amber-400', bg:'bg-amber-500/10', filter:'balance' },
    { label:'即将到期', value:urgentCount, icon:'fa-clock', color:'text-rose-400', bg:'bg-rose-500/10', filter:'urgent' },
    { label:'月度总支出 (折算)', value:'¥' + Math.round(convertedMonthlyCNY), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map(s =>
    '<div class="glass-card rounded-xl p-4' + (s.filter ? ' cursor-pointer' : '') + '"' +
    (s.filter ? ' onclick="setFilter(\\''+s.filter+'\\')" role="button" tabindex="0" aria-label="筛选'+s.label+'"' : '') + '><div class="flex items-center gap-3">' +
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

  const totalMonthlyCNY = Object.entries(monthly).reduce((acc, [cur, val]) => acc + val * (DEFAULT_EXCHANGE_RATES[cur] || 1), 0);
  const totalYearlyCNY = Object.entries(yearly).reduce((acc, [cur, val]) => acc + val * (DEFAULT_EXCHANGE_RATES[cur] || 1), 0);

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
    '<div class="glass rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-950/40 to-slate-900/40 border border-sky-500/20">' +
      '<div>' +
        '<div class="text-xs text-sky-400 font-semibold mb-0.5"><i class="fa-solid fa-calculator mr-1"></i>全币种汇率折算总支出 (基准: CNY)</div>' +
        '<div class="text-xl sm:text-2xl font-bold text-white">¥' + totalMonthlyCNY.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ 月</span></div>' +
      '</div>' +
      '<div class="sm:text-right sm:border-l sm:border-white/10 sm:pl-6">' +
        '<div class="text-xs text-slate-400 mb-0.5">折算年度总预算</div>' +
        '<div class="text-base sm:text-lg font-bold text-emerald-400">¥' + totalYearlyCNY.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ 年</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-chart-simple text-emerald-400 mr-2"></i>按原始币种统计</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+currencyHTML+'</div></div>' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-layer-group text-violet-400 mr-2"></i>按分类支出统计</div>'+categoryRows+'</div>' +
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
  if (!['all','esim','subscription','balance'].includes(f)) {
    document.querySelectorAll('.filter-tab').forEach(b => { b.classList.remove('tab-active'); b.classList.add('text-slate-400'); });
  }
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
  if (currentFilter !== 'all') {
    if (currentFilter === 'urgent') {
      const today = new Date(); today.setHours(0,0,0,0);
      items = items.filter(i => {
        if (i.status === 'paused') return false;
        const dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
        if (!dateStr) return false;
        const diff = Math.ceil((new Date(dateStr+'T00:00:00') - today) / 86400000);
        return diff <= 15;
      });
    } else {
      items = items.filter(i => i.type === currentFilter);
    }
  }
  if (search) items = items.filter(i =>
    (i.name||'').toLowerCase().includes(search) || (i.number||'').toLowerCase().includes(search) ||
    (i.remark||'').toLowerCase().includes(search) || (i.category||'').toLowerCase().includes(search) ||
    (i.region||'').toLowerCase().includes(search) || (i.subId||'').toLowerCase().includes(search) ||
    (i.url||'').toLowerCase().includes(search)
  );
  const sortBy = document.getElementById('sort-select')?.value || 'expire';
  return sortItemsByPaused(items, sortBy);
}

function renderItems() {
  const items = getFilteredItems();
  const area = document.getElementById('content-area');
  const empty = document.getElementById('empty-state');
  if (!items.length) {
    area.innerHTML = '';
    const search = (document.getElementById('search-input').value || '').trim();
    if (search || currentFilter !== 'all') {
      empty.querySelector('p.text-lg').textContent = '没有匹配的记录';
      empty.querySelector('p.text-sm').textContent = '尝试调整搜索关键词或筛选条件';
      empty.querySelector('.flex.gap-3')?.classList.add('hidden');
    } else {
      empty.querySelector('p.text-lg').textContent = '暂无数据';
      empty.querySelector('p.text-sm').textContent = '添加你的第一个 eSIM 卡、订阅服务或话费管理';
      empty.querySelector('.flex.gap-3')?.classList.remove('hidden');
    }
    empty.classList.remove('hidden');
    return;
  }
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
    const monthsLeft = item.monthlyFee > 0 ? Math.max(0, Math.floor(item.balance / item.monthlyFee)) : 0;
    body = (item.number ? '<div class="text-sm text-slate-300 font-mono mb-1">'+esc(item.number)+'</div>' : '') +
      '<div class="text-lg text-emerald-400 font-bold">'+sym+esc(item.balance)+'</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-receipt mr-1"></i>月租 '+sym+esc(item.monthlyFee)+'/月 · 每月'+esc(item.billingDay)+'日扣</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-battery-half mr-1"></i>可撑 '+monthsLeft+' 个月</div>' +
      (item.lastRecharge ? '<div class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-plus-circle mr-1"></i>上次 '+((item.lastRecharge.amount>0)?'+':'')+esc(item.lastRecharge.amount)+' ('+esc(item.lastRecharge.date)+')</div>' : '');
  } else if (isEsim) {
    const iso = getFlag(item.number);
    const hasLPA = item.smDp || item.activationCode;
    body = (iso ? '<div class="text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded mb-2 inline-block">'+esc(iso)+'</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">'+esc(item.number)+'</div>' : '') +
      (hasLPA ? '<div class="text-xs text-cyan-400/90 mt-1 cursor-pointer hover:text-cyan-300 flex items-center gap-1.5" onclick="showQrCode('+jsArg(item.id)+')"><i class="fa-solid fa-qrcode text-cyan-400"></i><span>点击展示安装二维码</span></div>' : '');
  } else {
    const ps = item.price ? (item.billing==='yearly' ? currSym(item.currency)+item.price+'/年' : item.billing==='once' ? currSym(item.currency)+item.price+'(一次性)' : currSym(item.currency)+item.price+'/月') : '';
    const regionStr = item.region ? esc(item.region) : '';
    const catStr = item.category ? esc(item.category) : '';
    const metaLine = [catStr, regionStr].filter(Boolean).join(' · ');
    const autoBadge = item.autoRenew ? '<span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2" title="到期自动顺延"><i class="fa-solid fa-arrows-rotate mr-1"></i>自动续费</span>' : '';
    body = (metaLine ? '<div class="text-xs text-slate-400 mb-1">'+metaLine+'</div>' : '') +
      (ps ? '<div class="text-sm text-emerald-400 font-semibold flex items-center">'+esc(ps)+autoBadge+'</div>' : '') +
      (item.subId ? '<div class="text-xs text-slate-500 mt-1 truncate"><i class="fa-solid fa-id-card mr-1"></i>'+esc(item.subId)+'</div>' : '');
    if (item.url) body += '<a href="'+safeHref(item.url)+'" target="_blank" rel="noopener noreferrer" class="text-xs text-sky-400 hover:underline mt-1 inline-block"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>访问</a>';
  }

  const idArg = jsArg(item.id);
  const hasLPA = isEsim && (item.smDp || item.activationCode);
  const qrBtn = hasLPA ?
    '<button onclick="showQrCode('+idArg+')" class="text-xs btn-touch text-cyan-400 hover:text-cyan-300 px-2 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors" title="查看 eSIM 二维码"><i class="fa-solid fa-qrcode"></i></button>' : '';
  const renewBtn = (isEsim && item.cycle) || (item.type === 'subscription' && item.billing !== 'once') ?
    '<button onclick="renewItem('+idArg+')" class="text-xs btn-touch text-sky-400 hover:text-sky-300 px-2.5 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors font-medium"><i class="fa-solid fa-rotate mr-1"></i>续期</button>' : '';
  const rechargeBtn = isBalance ?
    '<button onclick="rechargeItem('+idArg+')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors font-medium"><i class="fa-solid fa-plus-circle mr-1"></i>充值</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">' +
    '<div class="'+tb+' w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid '+ti+' '+tc+' text-sm"></i></div>' +
    '<span class="text-xs '+tc+' opacity-70">'+esc(tl)+'</span></div>' +
    '<span class="text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</span></div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">'+esc(item.name)+'</h3>' +
    body +
    (isBalance && item.predictedSuspendDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i>预计停机: '+esc(item.predictedSuspendDate)+'</div>' : '') +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>到期: '+esc(item.expireDate)+'</div>' : '') +
    (item.cycle ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: '+esc(item.cycle)+'天</div>' : '') +
    (isEsim && item.balance != null ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-wallet mr-1"></i>余额: '+currSym(item.currency || 'CNY')+esc(item.balance)+'</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>'+esc(item.remark)+'</div>' : '') +
    '<div class="flex justify-between items-center gap-2 mt-3 pt-3 border-t border-white/5">' +
      '<div class="flex items-center gap-1">' + qrBtn + rechargeBtn + renewBtn + '</div>' +
      '<div class="flex items-center gap-1">' +
        '<button onclick="toggleStatus('+idArg+')" class="text-xs btn-touch px-2 py-1.5 rounded-lg transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
        '<button onclick="testNotify('+idArg+')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
        '<button onclick="editItem('+idArg+')" class="text-xs btn-touch text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5" title="编辑"><i class="fa-solid fa-pen"></i></button>' +
        '<button onclick="deleteItem('+idArg+')" class="text-xs btn-touch text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10" title="删除"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div></div>';
}

// -- List view --
function renderList(items, area) {
  const isMobile = window.innerWidth < 640;
  if (isMobile) {
    let html = '<div class="space-y-2">';
    html += items.map(i => listRowMobileHTML(i)).join('');
    html += '</div>';
    area.innerHTML = html;
    return;
  }
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
  const hasLPA = isEsim && (item.smDp || item.activationCode);
  const idArg = jsArg(item.id);
  let tc, ti;
  if (isBalance) { tc = 'text-amber-400'; ti = 'fa-wallet'; }
  else if (isEsim) { tc = 'text-cyan-400'; ti = 'fa-sim-card'; }
  else { tc = 'text-violet-400'; ti = 'fa-credit-card'; }
  const statusText = item.status==='paused' ? '已暂停' : (st.text || '未设置');
  const statusCls = item.status==='paused' ? 'text-slate-500' : st.cls;

  const sym = currSym(item.currency);
  const balanceInfo = isBalance ? sym+esc(item.balance)+' · 月租'+sym+esc(item.monthlyFee) : '';

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
        (isEsim && item.balance != null ? '<span>'+sym+esc(item.balance)+'</span>' : '') +
        (!isBalance && item.expireDate ? '<i class="fa-regular fa-calendar mr-1"></i>'+esc(item.expireDate) : '') +
        (item.number ? '<span class="ml-2 font-mono">'+esc(item.number)+'</span>' : '') +
        (item.category ? '<span class="ml-1">'+esc(item.category)+'</span>' : '') +
      '</div>' +
      '<div class="flex gap-1 flex-shrink-0">' +
        (hasLPA ? '<button onclick="showQrCode('+idArg+')" class="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded hover:bg-cyan-500/10" title="二维码"><i class="fa-solid fa-qrcode"></i></button>' : '') +
        (isBalance ? '<button onclick="rechargeItem('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="充值"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
        ((isEsim && item.cycle) || (item.type === 'subscription' && item.billing !== 'once') ? '<button onclick="renewItem('+idArg+')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="续期"><i class="fa-solid fa-rotate"></i></button>' : '') +
        '<button onclick="toggleStatus('+idArg+')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
        '<button onclick="testNotify('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
        '<button onclick="editItem('+idArg+')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
        '<button onclick="deleteItem('+idArg+')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function listRowHTML(item) {
  const diff = getDiff(item);
  const isBalance = item.type === 'balance';
  const st = isBalance ? statusInfoBalance(diff) : statusInfo(diff);
  const isEsim = item.type === 'esim';
  const hasLPA = isEsim && (item.smDp || item.activationCode);
  const flag = isEsim ? getFlag(item.number) : '';
  const idArg = jsArg(item.id);
  let sub, priceStr, iconClass;
  if (isBalance) {
    sub = item.number || '-';
    const sym = currSym(item.currency);
    priceStr = ' · '+sym+esc(item.balance)+' (月租'+sym+esc(item.monthlyFee)+')';
    iconClass = 'fa-wallet text-amber-400';
  } else if (isEsim) {
    sub = item.number || '-';
    priceStr = item.balance != null ? ' · '+currSym(item.currency || 'CNY')+esc(item.balance) : '';
    iconClass = 'fa-sim-card text-cyan-400';
  } else {
    sub = item.category || '-';
    priceStr = item.price ? ' · '+currSym(item.currency)+esc(item.price) : '';
    iconClass = 'fa-credit-card text-violet-400';
  }

  const dateCol = isBalance ? esc(item.predictedSuspendDate || '-') : esc(item.expireDate || '-');

  return '<div class="list-row grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5">' +
    '<div class="col-span-4 sm:col-span-4 flex items-center gap-2 min-w-0">' +
      '<i class="fa-solid '+iconClass+' text-sm flex-shrink-0"></i>' +
      '<span class="truncate text-sm font-medium text-white">'+esc(item.name)+priceStr+'</span></div>' +
    '<div class="col-span-2 hidden sm:block text-xs text-slate-400 truncate">'+flag+esc(sub)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 text-xs text-slate-300">'+dateCol+'</div>' +
    '<div class="col-span-2 hidden sm:block text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'已暂停':st.text)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 flex justify-end gap-1">' +
      (hasLPA ? '<button onclick="showQrCode('+idArg+')" class="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded hover:bg-cyan-500/10" title="二维码"><i class="fa-solid fa-qrcode"></i></button>' : '') +
      (isBalance ? '<button onclick="rechargeItem('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="充值"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
      ((isEsim && item.cycle) || (item.type === 'subscription' && item.billing !== 'once') ? '<button onclick="renewItem('+idArg+')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="续期"><i class="fa-solid fa-rotate"></i></button>' : '') +
      '<button onclick="toggleStatus('+idArg+')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'启用':'暂停')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
      '<button onclick="testNotify('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="测试通知"><i class="fa-solid fa-bell"></i></button>' +
      '<button onclick="editItem('+idArg+')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
      '<button onclick="deleteItem('+idArg+')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
    '</div></div>';
}

// -- Calendar view --
function renderCalendar(items, area) {
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  const events = {};
  items.forEach(i => {
    let dateStr = i.type === 'balance' ? i.predictedSuspendDate : i.expireDate;
    if (!dateStr) return;
    const d = new Date(dateStr+'T00:00:00');
    const key = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if (!events[key]) events[key] = [];
    events[key].push(i);
  });

  // Project recurring active subscriptions onto the viewed month
  items.forEach(i => {
    if (i.status === 'paused') return;
    if (i.type === 'subscription' && i.billing === 'monthly' && i.expireDate) {
      const orig = new Date(i.expireDate + 'T00:00:00');
      const dayOfMonth = orig.getDate();
      const targetDay = Math.min(dayOfMonth, daysInMonth);
      const key = calYear + '-' + (calMonth + 1) + '-' + targetDay;
      if (!events[key]) events[key] = [];
      if (!events[key].some(e => e.id === i.id)) {
        events[key].push({ ...i, _isProjected: true });
      }
    }
  });

  const monthName = calYear + '年' + (calMonth+1) + '月';
  const weekDays = ['日','一','二','三','四','五','六'];

  let html = '<div class="glass rounded-xl p-4">';
  html += '<div class="flex justify-between items-center mb-4">' +
    '<div class="flex items-center gap-2">' +
      '<button onclick="calPrev()" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-chevron-left"></i></button>' +
      '<button onclick="calToday()" class="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">今天</button>' +
    '</div>' +
    '<h3 class="text-lg font-bold text-white">'+monthName+'</h3>' +
    '<button onclick="calNext()" class="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-chevron-right"></i></button></div>';

  html += '<div class="grid grid-cols-7 gap-1 mb-1">';
  weekDays.forEach(d => html += '<div class="text-center text-xs font-semibold text-slate-400 py-2">'+d+'</div>');
  html += '</div>';

  html += '<div class="grid grid-cols-7 gap-1">';
  for (let i = 0; i < startPad; i++) html += '<div class="cal-day rounded-lg"></div>';
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
      else bg = e._isProjected ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-violet-500/30 text-violet-300';
      const prefix = e._isProjected ? '🔄 ' : '';
      html += '<div class="cal-event '+bg+' mb-0.5 cursor-pointer" onclick="editItem('+jsArg(e.id)+')" title="'+esc(prefix + e.name)+'（点击编辑）">'+esc(prefix + e.name)+'</div>';
    });
    html += '</div>';
  }
  if (!Object.keys(events).length) {
    html += '<div class="text-center text-slate-500 py-6 text-sm col-span-7">本月无到期事件</div>';
  }
  html += '</div></div>';
  area.innerHTML = html;
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderItems(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderItems(); }
function calToday() { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); renderItems(); }

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
function jsArg(s) { return esc(JSON.stringify(String(s || ''))); }
function safeHref(url) { if (!url) return ''; const u = String(url).trim().toLowerCase(); if (u.startsWith('javascript:') || u.startsWith('data:') || u.startsWith('vbscript:')) return '#'; return esc(url); }

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
  const fabMenu = document.getElementById('fab-menu');
  const fabBtn = document.getElementById('fab-btn');
  if (fabMenu && !fabMenu.contains(e.target) && !fabBtn.contains(e.target)) {
    fabMenu.classList.add('hidden');
    const icon = document.getElementById('fab-icon');
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
});

// ==================== QR MODAL ====================
function showQrCode(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const smdp = (item.smDp || '').trim();
  const act = (item.activationCode || '').trim();
  const conf = (item.confirmationCode || '').trim();

  // GSMA LPA Standard format
  let lpa = 'LPA:1$' + smdp + '$' + act;
  if (conf) lpa += '$' + conf;
  currentLpaString = lpa;

  document.getElementById('qr-title').textContent = (item.name || 'eSIM') + ' 安装二维码';
  document.getElementById('qr-smdp-val').textContent = smdp || '(未填写)';
  document.getElementById('qr-act-val').textContent = act || '(未填写)';

  const confRow = document.getElementById('qr-conf-row');
  if (conf) {
    confRow.classList.remove('hidden');
    document.getElementById('qr-conf-val').textContent = conf;
  } else {
    confRow.classList.add('hidden');
  }

  const svg = generateQRCodeSVG(lpa, { size: 210 });
  document.getElementById('qr-container').innerHTML = svg || '<p class="text-slate-500 text-xs">无法生成二维码，请先填写 SM-DP+ 与激活码</p>';

  const overlay = document.getElementById('qr-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function closeQrModal() {
  const overlay = document.getElementById('qr-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
}

function copyLpaString() {
  if (!currentLpaString) return;
  copyText(currentLpaString, 'LPA 激活代码');
}

// ==================== MODAL ====================
function openModal(type, item) {
  document.getElementById('form-type').value = type;
  document.getElementById('form-id').value = item ? item.id : '';
  const typeLabel = type === 'esim' ? ' eSIM' : type === 'balance' ? ' 话费' : ' 订阅';
  document.getElementById('modal-title').textContent = (item ? '编辑' : '添加') + typeLabel;
  document.getElementById('field-number').classList.toggle('hidden', type !== 'esim' && type !== 'balance');
  document.getElementById('field-esim-activation').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-esim-balance').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-category').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-region').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-sub-id').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-price').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-url').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-balance').classList.toggle('hidden', type !== 'balance');
  
  const expireField = document.getElementById('form-expire').closest('.space-y-4 > div') || document.getElementById('form-expire').parentElement;
  const cycleField = document.getElementById('form-cycle').closest('.space-y-4 > div') || document.getElementById('form-cycle').parentElement;
  if (expireField) expireField.classList.toggle('hidden', type === 'balance');
  if (cycleField) cycleField.classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-billing-mode').classList.toggle('hidden', type !== 'subscription');
  updateCycleDaysVisibility(type);

  if (item) {
    document.getElementById('form-name').value = item.name || '';
    document.getElementById('form-number').value = item.number || '';
    document.getElementById('form-smdp').value = item.smDp || '';
    document.getElementById('form-activation-code').value = item.activationCode || '';
    document.getElementById('form-confirmation-code').value = item.confirmationCode || '';
    document.getElementById('form-wid').value = item.wid || '';
    document.getElementById('form-balance-esim').value = item.balance == null ? '' : item.balance;
    document.getElementById('form-currency-esim').value = item.currency || 'CNY';
    document.getElementById('form-category').value = item.category || '';
    document.getElementById('form-region').value = item.region || '';
    document.getElementById('form-sub-id').value = item.subId || '';
    document.getElementById('form-expire').value = item.expireDate || '';
    document.getElementById('form-cycle').value = item.cycle || '';
    document.getElementById('form-price').value = item.price || '';
    document.getElementById('form-currency').value = item.currency || 'CNY';
    document.getElementById('form-billing').value = item.billing || 'monthly';
    document.getElementById('form-billing-mode').value = item.billingMode || 'natural';
    document.getElementById('form-cycle-days').value = item.cycleDays || '';
    document.getElementById('form-auto-renew').checked = Boolean(item.autoRenew);
    document.getElementById('form-url').value = item.url || '';
    document.getElementById('form-remark').value = item.remark || '';
    document.getElementById('form-status').value = item.status || 'active';
    if (type === 'balance') {
      document.getElementById('form-balance').value = item.balance ?? '';
      document.getElementById('form-monthly-fee').value = item.monthlyFee ?? '';
      document.getElementById('form-billing-day').value = item.billingDay ?? '';
    }
    setSelectedRemindDays(item.remindDays);
  } else {
    document.getElementById('item-form').reset();
    document.getElementById('form-auto-renew').checked = false;
    setSelectedRemindDays(DEFAULT_REMIND_DAYS_CLIENT);
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.add('flex');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('modal-overlay').classList.remove('flex'); }
function closeHistory() { document.getElementById('history-overlay').classList.add('hidden'); document.getElementById('history-overlay').classList.remove('flex'); }

function updateCycleDaysVisibility(type) {
  const field = document.getElementById('field-cycle-days');
  if (!field) return;
  const isFixed = type === 'subscription' && document.getElementById('form-billing-mode').value === 'fixed';
  field.classList.toggle('hidden', !isFixed);
  if (isFixed) {
    const billing = document.getElementById('form-billing').value;
    const input = document.getElementById('form-cycle-days');
    input.placeholder = billing === 'yearly' ? '默认365天' : '默认30天';
  }
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'form-billing-mode' || e.target.id === 'form-billing') {
    updateCycleDaysVisibility(document.getElementById('form-type')?.value || 'subscription');
  }
});

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const body = {
    type: document.getElementById('form-type').value,
    name: document.getElementById('form-name').value.trim(),
    number: document.getElementById('form-number').value.trim(),
    smDp: document.getElementById('form-smdp').value.trim(),
    activationCode: document.getElementById('form-activation-code').value.trim(),
    confirmationCode: document.getElementById('form-confirmation-code').value.trim(),
    wid: document.getElementById('form-wid').value.trim(),
    balance: document.getElementById('form-balance-esim').value.trim(),
    currency: document.getElementById('form-currency-esim').value,
    category: document.getElementById('form-category').value,
    region: document.getElementById('form-region').value,
    subId: document.getElementById('form-sub-id').value.trim(),
    expireDate: document.getElementById('form-expire').value,
    cycle: parseInt(document.getElementById('form-cycle').value) || null,
    price: document.getElementById('form-price').value || null,
    currency: document.getElementById('form-currency').value,
    billing: document.getElementById('form-billing').value,
    billingMode: document.getElementById('form-billing-mode').value,
    cycleDays: parseInt(document.getElementById('form-cycle-days').value) || null,
    autoRenew: document.getElementById('form-auto-renew').checked,
    url: document.getElementById('form-url').value.trim(),
    remark: document.getElementById('form-remark').value.trim(),
    status: document.getElementById('form-status').value,
    remindDays: getSelectedRemindDays(),
    balance: document.getElementById('form-balance').value,
    monthlyFee: document.getElementById('form-monthly-fee').value,
    billingDay: document.getElementById('form-billing-day').value,
  };

  if (body.type !== 'balance' && !body.expireDate) {
    showToast('到期日期不能为空', 'error'); return;
  }
  if (body.type === 'balance') {
    if (!body.balance && body.balance !== 0) { showToast('请输入当前余额', 'error'); return; }
    if (!body.monthlyFee && body.monthlyFee !== 0) { showToast('请输入月租', 'error'); return; }
    if (!body.billingDay) { showToast('请输入扣费日', 'error'); return; }
  }

  const btn = e.target.querySelector('[type="submit"]');
  const origHTML = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>保存中...';
  try {
    const res = id ? await api('PUT', '/api/items/'+id, body) : await api('POST', '/api/items', body);
    const data = await res.json();
    if (data.success) { closeModal(); await loadItems(); }
    else if (data.message) showToast(data.message, 'error');
    else showToast('保存失败', 'error');
  } catch { showToast('保存失败', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = origHTML; }
}

// ==================== ACTIONS ====================
function editItem(id) { const item = allItems.find(i => i.id === id); if (item) openModal(item.type, item); }

async function deleteItem(id) {
  if (!confirm('确定删除此记录？')) return;
  try {
    showToast('删除中...', 'info');
    const res = await api('DELETE', '/api/items/'+id);
    const data = await res.json();
    if (data.success) { showToast('已删除', 'success'); await loadItems(); }
    else showToast(data.message || '删除失败', 'error');
  } catch { showToast('删除失败', 'error'); }
}

async function renewItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const isEsim = item.type === 'esim';
  const sym = currSym(item.currency || 'CNY');
  const overlay = document.getElementById('renew-overlay');
  document.getElementById('renew-title').textContent = isEsim ? '续期 eSIM' : '续期订阅';
  document.getElementById('renew-info').textContent = isEsim
    ? '当前余额: ' + (item.balance == null ? '未追踪' : sym + item.balance)
    : '当前到期日: ' + (item.expireDate || '未设置');
  document.getElementById('renew-balance-fields').classList.toggle('hidden', !isEsim);
  document.getElementById('renew-balance-delta').value = '';
  document.getElementById('renew-balance-note').value = '';
  document.getElementById('renew-form').onsubmit = async function(e) {
    e.preventDefault();
    const deltaRaw = document.getElementById('renew-balance-delta').value;
    const note = document.getElementById('renew-balance-note').value.trim();
    const body = {};
    if (isEsim && deltaRaw !== '') {
      const n = Number(deltaRaw);
      if (!Number.isFinite(n)) { showToast('余额变动必须是数字', 'error'); return; }
      body.balanceDelta = n;
      if (note) body.balanceNote = note;
    }
    overlay.classList.add('hidden'); overlay.classList.remove('flex');
    try {
      const res = await api('POST', '/api/items/'+id+'/renew', body);
      const data = await res.json();
      if (data.success) {
        await loadItems();
        const extra = data.newBalance != null ? '，新余额: '+sym+data.newBalance : '';
        showToast('续期成功'+extra, 'success');
      }
      else showToast(data.message || '续期失败', 'error');
    } catch { showToast('续期失败', 'error'); }
  };
  overlay.classList.remove('hidden'); overlay.classList.add('flex');
  document.getElementById(isEsim ? 'renew-balance-delta' : 'renew-submit').focus();
}

async function testNotify(id) {
  const res = await api('POST', '/api/items/'+id+'/test-notify');
  const data = await res.json();
  if (data.success) showToast('✅ 测试通知已发送', 'success');
  else showToast(data.message || '发送失败', 'error');
}

function rechargeItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const sym = currSym(item.currency);
  const overlay = document.getElementById('recharge-overlay');
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-note').value = '';
  document.getElementById('recharge-info').textContent = '当前余额: ' + sym + item.balance;
  document.getElementById('recharge-form').onsubmit = async function(e) {
    e.preventDefault();
    const amount = document.getElementById('recharge-amount').value;
    const note = document.getElementById('recharge-note').value || '';
    if (!amount) return;
    overlay.classList.add('hidden'); overlay.classList.remove('flex');
    try {
      const res = await api('POST', '/api/items/'+id+'/recharge', { amount: parseFloat(amount), note });
      const data = await res.json();
      if (data.success) { await loadItems(); showToast('充值成功！新余额: '+sym+data.newBalance, 'success'); }
      else showToast(data.message || '充值失败', 'error');
    } catch { showToast('充值失败', 'error'); }
  };
  overlay.classList.remove('hidden'); overlay.classList.add('flex');
  document.getElementById('recharge-amount').focus();
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
      showToast('导入完成！新增 ' + result.added + ' 条' + skipped, 'success');
      await loadItems();
    } else {
      showToast(result.message || '导入失败', 'error');
    }
  } catch (e) {
    showToast('JSON 解析失败: ' + e.message, 'error');
  }
  input.value = '';
}

let historyData = [];
let historyFilter = 'all';

async function openHistory() {
  hideMenu();
  const overlay = document.getElementById('history-overlay');
  const content = document.getElementById('history-content');
  content.innerHTML = '<div class="text-sm text-slate-400 py-8 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>加载中...</div>';
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  historyFilter = 'all';
  document.querySelectorAll('.hfilter-tab').forEach(b => {
    b.classList.toggle('tab-active', b.dataset.hfilter === 'all');
    b.classList.toggle('text-slate-400', b.dataset.hfilter !== 'all');
  });
  const res = await api('GET', '/api/history');
  historyData = await res.json();
  renderHistory();
}

function filterHistory(action) {
  historyFilter = action;
  document.querySelectorAll('.hfilter-tab').forEach(b => {
    b.classList.toggle('tab-active', b.dataset.hfilter === action);
    b.classList.toggle('text-slate-400', b.dataset.hfilter !== action);
  });
  renderHistory();
}

function renderHistory() {
  const content = document.getElementById('history-content');
  let data = historyData;
  if (historyFilter !== 'all') data = data.filter(e => e.action === historyFilter);
  if (!Array.isArray(data) || !data.length) {
    content.innerHTML = '<div class="text-sm text-slate-500 py-10 text-center">' + (historyFilter !== 'all' ? '该类型暂无记录' : '暂无操作历史') + '</div>';
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
    deduct: ['扣费', 'fa-minus-circle', 'text-orange-400'],
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
  if (entry.action === 'renew' && d.newExpireDate) {
    const autoBadge = d.auto ? ' (自动续费)' : '';
    return '新到期日：' + esc(d.newExpireDate) + autoBadge;
  }
  if (entry.action === 'recharge') {
    const parts = [];
    if (d.amount != null) parts.push('金额：' + esc(d.amount));
    if (d.newBalance != null) parts.push('新余额：' + esc(d.newBalance));
    if (d.predictedSuspendDate) parts.push('预计停机：' + esc(d.predictedSuspendDate));
    return parts.join(' · ');
  }
  if (entry.action === 'import') return '新增 ' + (d.added || 0) + ' 条，跳过 ' + (d.skipped || 0) + ' 条，总计 ' + (d.total || 0) + ' 条';
  if (entry.action === 'deduct') {
    const parts = [];
    if (d.fee != null) parts.push('月租：' + esc(d.fee));
    if (d.oldBalance != null && d.newBalance != null) parts.push('余额：' + esc(d.oldBalance) + ' → ' + esc(d.newBalance));
    return parts.join(' · ');
  }
  return '';
}

async function clearHistory() {
  if (!confirm('确定清空操作历史？')) return;
  const res = await api('DELETE', '/api/history');
  const data = await res.json();
  if (data.success) openHistory();
  else showToast(data.message || '清空失败', 'error');
}

function downloadDemo() {
  toggleMenu();
  const demo = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    count: 4,
    items: [
      { type: 'esim', name: '美国保号卡', number: '+120****1234', expireDate: '2026-12-31', cycle: 180, remark: 'Ultra Mobile 保号', status: 'active', smDp: 'rsp.ultramobile.com', activationCode: 'DEMO-ACT-CODE', confirmationCode: 'DEMO-CONF-CODE', wid: '89012345678901234567890123456789', balance: 12.5, currency: 'USD' },
      { type: 'esim', name: '日本 IIJmio', number: '+819****4567', expireDate: '2026-09-15', cycle: 365, remark: '', status: 'active' },
      { type: 'subscription', name: 'ChatGPT Plus', category: 'AI 服务', region: 'US', subId: '', expireDate: '2026-07-20', price: '20', billing: 'monthly', currency: 'USD', autoRenew: true, remindDays: [3, 1, 0], url: 'https://chat.openai.com', remark: '', status: 'active' },
      { type: 'subscription', name: 'YouTube Premium', category: '流媒体', region: 'TR', subId: '', expireDate: '2026-08-01', price: '99.99', billing: 'yearly', currency: 'TRY', autoRenew: false, remindDays: [7, 3, 1], url: 'https://youtube.com/premium', remark: '土耳其区', status: 'active' },
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
    closeQrModal();
    const ro = document.getElementById('recharge-overlay');
    if (ro) { ro.classList.add('hidden'); ro.classList.remove('flex'); }
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.add('hidden');
    return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === '/') {
    e.preventDefault();
    const search = document.getElementById('search-input');
    if (search) search.focus();
  }
});

// ==================== STATUS TOGGLE ====================
async function toggleStatus(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const newStatus = item.status === 'active' ? 'paused' : 'active';
  try {
    const res = await api('PUT', '/api/items/' + id, { status: newStatus });
    const data = await res.json();
    if (data.success) { showToast(newStatus === 'paused' ? '已暂停' : '已启用', 'success'); await loadItems(); }
    else showToast(data.message || '操作失败', 'error');
  } catch { showToast('操作失败', 'error'); }
}

// ==================== INIT ====================
(async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  // Check and fallback for FontAwesome
  setTimeout(() => {
    try {
      const testEl = document.createElement('i');
      testEl.className = 'fa-solid fa-gear';
      testEl.style.position = 'absolute';
      testEl.style.left = '-9999px';
      document.body.appendChild(testEl);
      const font = window.getComputedStyle(testEl).fontFamily.toLowerCase();
      if (!font.includes('font awesome') && !font.includes('fontawesome')) {
        const fallbacks = [
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css',
          'https://unpkg.com/@fortawesome/fontawesome-free@6.5.0/css/all.min.css'
        ];
        fallbacks.forEach(href => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        });
      }
      testEl.remove();
    } catch {}
  }, 1000);

  const ok = await checkAuth();
  if (ok) enterDashboard();
  else { TOKEN = ''; localStorage.removeItem('token'); }
})();
`;
}
