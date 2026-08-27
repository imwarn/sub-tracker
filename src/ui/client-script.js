/**
 * Browser-side application script injected into the HTML shell.
 */

import {
  ISO_CURRENCIES,
  CURRENCY_SYMBOLS,
  DEFAULT_CATEGORIES,
  DEFAULT_REGIONS,
  DEFAULT_REMIND_DAYS,
  DEFAULT_EXCHANGE_RATES,
} from '../data/constants.js';
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
let appSettings = null;
let editingRates = {};
let editingCategories = [];
let editingRegions = [];
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
const ISO_CURRENCIES = ${JSON.stringify(ISO_CURRENCIES)};
const CURRENCY_SYMBOLS = ${JSON.stringify(CURRENCY_SYMBOLS)};
const DEFAULT_CATEGORIES = ${JSON.stringify(DEFAULT_CATEGORIES)};
const DEFAULT_REGIONS = ${JSON.stringify(DEFAULT_REGIONS)};
const DEFAULT_EXCHANGE_RATES = ${JSON.stringify(DEFAULT_EXCHANGE_RATES)};
const DEFAULT_REMIND_DAYS_CLIENT = ${JSON.stringify(DEFAULT_REMIND_DAYS)};
const FLAG_MAP = ${JSON.stringify(flagMap)};

function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '¥'; }

function getRateToBase(cur, baseCur, rates) {
  if (!cur || cur === baseCur) return 1.0;
  if (rates && rates[cur] != null && Number(rates[cur]) > 0) return Number(rates[cur]);
  if (baseCur === 'CNY') return DEFAULT_EXCHANGE_RATES[cur] || 1.0;
  return 1.0;
}

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
  await loadSettings();
  await loadItems();
}

async function loadSettings() {
  try {
    const res = await api('GET', '/api/settings');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        appSettings = {
          baseCurrency: json.baseCurrency || 'CNY',
          exchangeRates: json.exchangeRates || { ...DEFAULT_EXCHANGE_RATES },
          categories: json.categories || [...DEFAULT_CATEGORIES],
          regions: json.regions || [...DEFAULT_REGIONS],
          defaultRemindDays: json.defaultRemindDays || [...DEFAULT_REMIND_DAYS_CLIENT],
        };
      }
    }
  } catch (err) {
    console.error('loadSettings error:', err);
  }
  if (!appSettings) {
    appSettings = {
      baseCurrency: 'CNY',
      exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
      categories: [...DEFAULT_CATEGORIES],
      regions: [...DEFAULT_REGIONS],
      defaultRemindDays: [...DEFAULT_REMIND_DAYS_CLIENT],
    };
  }
  populateCurrencySelects();
  populateCategoryDatalist();
  populateRegionDatalist();
}

async function loadItems() {
  try {
    const res = await api('GET', '/api/items');
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) allItems = data; }
    else { console.error('loadItems failed:', res.status); }
  } catch (e) {
    console.error('loadItems error:', e);
  }
  populateCategoryDatalist();
  populateRegionDatalist();
  renderStats();
  renderAnalytics();
  renderItems();
}

function populateCurrencySelects() {
  const selects = document.querySelectorAll('.currency-select-target');
  const optionsHTML = ISO_CURRENCIES.map(c =>
    '<option value="'+c.code+'">'+c.flag+' '+c.code+' · '+c.name+' ('+c.symbol+')</option>'
  ).join('');

  selects.forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = optionsHTML;
    if (currentVal) sel.value = currentVal;
  });

  const baseSelect = document.getElementById('settings-base-currency');
  if (baseSelect) {
    baseSelect.innerHTML = optionsHTML;
    baseSelect.value = appSettings?.baseCurrency || 'CNY';
  }
}

function populateCategoryDatalist() {
  const dl = document.getElementById('category-datalist');
  if (!dl) return;
  const set = new Set(appSettings?.categories || DEFAULT_CATEGORIES);
  allItems.forEach(item => { if (item.category) set.add(item.category); });
  dl.innerHTML = Array.from(set).map(cat => '<option value="'+esc(cat)+'"></option>').join('');
}

function populateRegionDatalist() {
  const dl = document.getElementById('region-datalist');
  if (!dl) return;
  const list = appSettings?.regions || DEFAULT_REGIONS;
  const options = list.map(r =>
    '<option value="'+r.code+'">'+(r.flag ? r.flag+' ' : '')+r.code+' - '+(r.name||'')+'</option>'
  );
  dl.innerHTML = options.join('');
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

  const baseCur = appSettings?.baseCurrency || 'CNY';
  const rates = appSettings?.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const convertedMonthly = Object.entries(monthlyByCur).reduce((acc, [cur, val]) => acc + val * getRateToBase(cur, baseCur, rates), 0);

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
    { label:'月度总支出 (折算)', value:currSym(baseCur) + Math.round(convertedMonthly), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
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

  const baseCur = appSettings?.baseCurrency || 'CNY';
  const rates = appSettings?.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const totalMonthly = Object.entries(monthly).reduce((acc, [cur, val]) => acc + val * getRateToBase(cur, baseCur, rates), 0);
  const totalYearly = Object.entries(yearly).reduce((acc, [cur, val]) => acc + val * getRateToBase(cur, baseCur, rates), 0);

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
        '<div class="text-xs text-sky-400 font-semibold mb-0.5"><i class="fa-solid fa-calculator mr-1"></i>全币种汇率折算总支出 (基准: '+baseCur+')</div>' +
        '<div class="text-xl sm:text-2xl font-bold text-white">'+currSym(baseCur) + totalMonthly.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ 月</span></div>' +
      '</div>' +
      '<div class="sm:text-right sm:border-l sm:border-white/10 sm:pl-6">' +
        '<div class="text-xs text-slate-400 mb-0.5">折算年度总预算</div>' +
        '<div class="text-base sm:text-lg font-bold text-emerald-400">'+currSym(baseCur) + totalYearly.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ 年</span></div>' +
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
        const diff = Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000);
        return diff <= 15;
      });
    } else {
      items = items.filter(i => i.type === currentFilter);
    }
  }
  if (search) {
    items = items.filter(i =>
      (i.name||'').toLowerCase().includes(search) ||
      (i.number||'').toLowerCase().includes(search) ||
      (i.remark||'').toLowerCase().includes(search) ||
      (i.category||'').toLowerCase().includes(search) ||
      (i.region||'').toLowerCase().includes(search) ||
      (i.subId||'').toLowerCase().includes(search) ||
      (i.currency||'').toLowerCase().includes(search)
    );
  }
  const sortBy = document.getElementById('sort-select')?.value || 'expire';
  return sortItemsByPaused([...items], sortBy);
}

function renderItems() {
  const items = getFilteredItems();
  const container = document.getElementById('content-area');
  const empty = document.getElementById('empty-state');

  if (allItems.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (items.length === 0) {
    container.innerHTML = '<div class="text-center py-16 text-slate-500"><i class="fa-solid fa-filter text-4xl mb-3 opacity-30"></i><p>没有匹配的记录</p></div>';
    return;
  }

  if (currentView === 'grid') container.innerHTML = renderGrid(items);
  else if (currentView === 'list') container.innerHTML = renderList(items);
  else if (currentView === 'calendar') container.innerHTML = renderCalendar(items);
}

function getDaysRemaining(item) {
  const targetDate = item.type === 'balance' ? item.predictedSuspendDate : item.expireDate;
  if (!targetDate) return 999;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(targetDate + 'T00:00:00');
  return Math.ceil((exp - today) / 86400000);
}

function getStatusBadge(item) {
  if (item.status === 'paused') {
    return { text: '已暂停', cls: 'status-paused bg-slate-500/10 text-slate-400 border border-slate-500/20' };
  }
  const days = getDaysRemaining(item);
  if (days < 0) return { text: '已过期 ' + Math.abs(days) + ' 天', cls: 'status-expired bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days === 0) return { text: '今天到期', cls: 'status-danger bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days <= 3) return { text: days + ' 天后到期', cls: 'status-danger bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days <= 7) return { text: days + ' 天后到期', cls: 'status-warning bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  if (days <= 15) return { text: days + ' 天后到期', cls: 'status-warning bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' };
  return { text: days + ' 天后到期', cls: 'status-active bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
}

function renderGrid(items) {
  return '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' +
    items.map(item => {
      const badge = getStatusBadge(item);
      const isPaused = item.status === 'paused';
      const flag = getFlag(item.number);
      const sym = currSym(item.currency || 'CNY');
      const isEsim = item.type === 'esim';
      const isSub = item.type === 'subscription';
      const isBal = item.type === 'balance';

      let tc, tb, ti, tl;
      if (isEsim) { tc = 'text-cyan-400'; tb = 'bg-cyan-500/10'; ti = 'fa-sim-card'; tl = 'eSIM'; }
      else if (isBal) { tc = 'text-amber-400'; tb = 'bg-amber-500/10'; ti = 'fa-wallet'; tl = '话费'; }
      else { tc = 'text-violet-400'; tb = 'bg-violet-500/10'; ti = 'fa-credit-card'; tl = (item.category||'订阅'); }

      const priceStr = (isSub && item.price)
        ? sym + item.price + (item.billing === 'yearly' ? '/年' : item.billing === 'once' ? '' : '/月')
        : '';
      const autoStr = (isSub && item.autoRenew)
        ? '<span class="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20"><i class="fa-solid fa-rotate mr-1"></i>自动续费</span>'
        : '';
      const cycleModeStr = (isSub && item.billingMode === 'fixed')
        ? '<span class="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">固定'+(item.cycleDays||(item.billing==='yearly'?365:30))+'天</span>'
        : '';

      const regionStr = item.region ? esc(item.region) : '';
      const catStr = item.category ? esc(item.category) : '';
      const metaLine = [catStr, regionStr].filter(Boolean).join(' · ');

      let balanceStr = '';
      if (isBal) {
        balanceStr = '<div class="text-lg font-bold text-amber-300">' + sym + (item.balance != null ? item.balance : 0) +
          ' <span class="text-xs font-normal text-slate-400">(月租 ' + sym + (item.monthlyFee || 0) + ' · 每月' + (item.billingDay || 1) + '日扣)</span></div>';
      } else if (isEsim && item.balance != null) {
        balanceStr = '<div class="text-xs text-slate-300"><i class="fa-solid fa-wallet text-amber-400 mr-1"></i>余额: <span class="font-bold text-amber-300">' + sym + item.balance + '</span></div>';
      }

      return '<div class="glass-card rounded-2xl p-5 fade-in relative flex flex-col justify-between ' + (isPaused ? 'opacity-60' : '') + '">' +
        '<div>' +
          '<div class="flex items-start justify-between gap-2 mb-3">' +
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<div class="' + tb + ' w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">' +
                '<i class="fa-solid ' + ti + ' ' + tc + '"></i>' +
              '</div>' +
              '<div class="min-w-0">' +
                '<div class="font-bold text-white text-base truncate flex items-center gap-1.5">' +
                  (flag ? '<span class="text-base flex-shrink-0">' + flag + '</span>' : '') +
                  '<span class="truncate">' + esc(item.name) + '</span>' +
                '</div>' +
                (metaLine ? '<div class="text-xs text-slate-400 truncate mt-0.5">' + metaLine + '</div>' : '') +
              '</div>' +
            '</div>' +
            '<span class="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ' + badge.cls + '">' + badge.text + '</span>' +
          '</div>' +

          (item.number ? '<div class="text-xs text-slate-400 mb-2 font-mono"><i class="fa-solid fa-phone text-slate-500 mr-1.5"></i>' + esc(item.number) + '</div>' : '') +
          (balanceStr ? '<div class="mb-2">' + balanceStr + '</div>' : '') +

          '<div class="space-y-1.5 text-xs text-slate-300 mb-3">' +
            (isBal
              ? '<div class="flex justify-between"><span>预计停机：</span><span class="font-mono text-slate-200 font-bold">' + (item.predictedSuspendDate || '-') + '</span></div>'
              : '<div class="flex justify-between"><span>到期日期：</span><span class="font-mono text-slate-200 font-bold">' + (item.expireDate || '-') + '</span></div>') +
            (item.cycle ? '<div class="flex justify-between"><span>续费周期：</span><span>' + item.cycle + ' 天</span></div>' : '') +
            (priceStr ? '<div class="flex justify-between items-center"><span>费用：</span><span class="font-bold text-emerald-400">' + priceStr + '</span></div>' : '') +
            ((autoStr || cycleModeStr) ? '<div class="flex gap-1.5 pt-1 flex-wrap">' + autoStr + cycleModeStr + '</div>' : '') +
            (item.url ? '<div class="pt-1 truncate"><a href="' + safeHref(item.url) + '" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline inline-flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>' + esc(item.url.replace(/^https?:\\/\\//,'')) + '</a></div>' : '') +
            (item.remark ? '<div class="text-slate-400 text-xs italic bg-white/5 rounded-lg p-2 mt-2 break-all">' + esc(item.remark) + '</div>' : '') +
          '</div>' +
        '</div>' +

        '<div class="pt-3 border-t border-white/10 flex items-center justify-between gap-1 flex-wrap mt-2">' +
          '<div class="flex items-center gap-1 flex-wrap">' +
            (!isBal ? '<button onclick="renewItem(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 transition-colors" title="续期"><i class="fa-solid fa-rotate mr-1"></i>续期</button>' : '') +
            (isBal ? '<button onclick="openRechargeModal(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors" title="充值"><i class="fa-solid fa-plus-circle mr-1"></i>充值</button>' : '') +
            (isEsim && (item.smDp || item.activationCode) ? '<button onclick="showQrCode(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors" title="安装二维码"><i class="fa-solid fa-qrcode mr-1"></i>二维码</button>' : '') +
            '<button onclick="toggleStatus(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="' + (isPaused ? '恢复启用' : '暂停') + '"><i class="fa-solid ' + (isPaused ? 'fa-play text-emerald-400' : 'fa-pause') + '"></i></button>' +
          '</div>' +
          '<div class="flex items-center gap-1">' +
            '<button onclick="editItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="编辑"><i class="fa-solid fa-pen"></i></button>' +
            '<button onclick="deleteItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" title="删除"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function renderList(items) {
  return '<div class="glass rounded-2xl overflow-hidden">' +
    '<div class="overflow-x-auto"><table class="w-full text-left text-sm">' +
      '<thead class="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">' +
        '<tr>' +
          '<th class="px-4 py-3">名称 / 类型</th>' +
          '<th class="px-4 py-3">号码 / 账号</th>' +
          '<th class="px-4 py-3">分类 / 区域</th>' +
          '<th class="px-4 py-3">到期/停机日</th>' +
          '<th class="px-4 py-3">费用 / 余额</th>' +
          '<th class="px-4 py-3">状态</th>' +
          '<th class="px-4 py-3 text-right">操作</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody class="divide-y divide-white/5">' +
        items.map(item => {
          const badge = getStatusBadge(item);
          const flag = getFlag(item.number);
          const sym = currSym(item.currency || 'CNY');
          const isEsim = item.type === 'esim';
          const isSub = item.type === 'subscription';
          const isBal = item.type === 'balance';

          let typeBadge;
          if (isEsim) typeBadge = '<span class="text-[11px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">eSIM</span>';
          else if (isBal) typeBadge = '<span class="text-[11px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">话费</span>';
          else typeBadge = '<span class="text-[11px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20">订阅</span>';

          let priceOrBal = '-';
          if (isSub && item.price) priceOrBal = '<span class="font-bold text-emerald-400">' + sym + item.price + (item.billing==='yearly'?'/年':'/月') + '</span>';
          else if (isBal) priceOrBal = '<span class="font-bold text-amber-300">' + sym + (item.balance ?? 0) + '</span> (月租 ' + sym + (item.monthlyFee||0) + ')';
          else if (isEsim && item.balance != null) priceOrBal = sym + item.balance;

          return '<tr class="list-row ' + (item.status === 'paused' ? 'opacity-50' : '') + '">' +
            '<td class="px-4 py-3">' +
              '<div class="font-bold text-white flex items-center gap-1.5">' +
                (flag ? '<span>' + flag + '</span>' : '') +
                '<span>' + esc(item.name) + '</span>' +
                typeBadge +
              '</div>' +
            '</td>' +
            '<td class="px-4 py-3 font-mono text-xs text-slate-300">' + esc(item.number || item.subId || '-') + '</td>' +
            '<td class="px-4 py-3 text-xs text-slate-300">' + esc(item.category || '-') + (item.region ? ' ('+esc(item.region)+')' : '') + '</td>' +
            '<td class="px-4 py-3 font-mono text-xs text-slate-200">' + (isBal ? item.predictedSuspendDate || '-' : item.expireDate || '-') + '</td>' +
            '<td class="px-4 py-3 text-xs">' + priceOrBal + '</td>' +
            '<td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + badge.cls + '">' + badge.text + '</span></td>' +
            '<td class="px-4 py-3 text-right">' +
              '<div class="flex items-center justify-end gap-1">' +
                (!isBal ? '<button onclick="renewItem(\\'' + item.id + '\\')" class="px-2 py-1 rounded text-xs text-sky-400 hover:bg-sky-500/10" title="续期"><i class="fa-solid fa-rotate"></i></button>' : '') +
                (isBal ? '<button onclick="openRechargeModal(\\'' + item.id + '\\')" class="px-2 py-1 rounded text-xs text-amber-400 hover:bg-amber-500/10" title="充值"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
                (isEsim && (item.smDp || item.activationCode) ? '<button onclick="showQrCode(\\'' + item.id + '\\')" class="px-2 py-1 rounded text-xs text-cyan-400 hover:bg-cyan-500/10" title="二维码"><i class="fa-solid fa-qrcode"></i></button>' : '') +
                '<button onclick="editItem(\\'' + item.id + '\\')" class="px-2 py-1 rounded text-xs text-slate-400 hover:text-white" title="编辑"><i class="fa-solid fa-pen"></i></button>' +
                '<button onclick="deleteItem(\\'' + item.id + '\\')" class="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10" title="删除"><i class="fa-solid fa-trash"></i></button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table></div>' +
  '</div>';
}

function renderCalendar(items) {
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDay = firstDay.getDay(); // 0 = Sunday
  const totalDays = lastDay.getDate();
  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString('zh-CN', { year:'numeric', month:'long' });

  const eventsByDay = {};
  items.forEach(item => {
    const dStr = item.type === 'balance' ? item.predictedSuspendDate : item.expireDate;
    if (!dStr) return;
    const [y, m, d] = dStr.split('-').map(Number);
    if (y === calYear && m === (calMonth + 1)) {
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(item);
    }
  });

  const weekHeaders = ['日','一','二','三','四','五','六'].map(w =>
    '<div class="py-2 text-center text-xs font-semibold text-slate-400 bg-white/5">' + w + '</div>'
  ).join('');

  let dayCells = '';
  for (let i = 0; i < startDay; i++) {
    dayCells += '<div class="cal-day p-1.5 border border-white/5 bg-white/[0.01]"></div>';
  }

  const today = new Date();
  const isCurMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;
  const todayDate = today.getDate();

  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurMonth && d === todayDate;
    const dayEvents = eventsByDay[d] || [];

    const eventsHTML = dayEvents.map(e => {
      const isBal = e.type === 'balance';
      const isEsim = e.type === 'esim';
      const bg = isEsim ? 'bg-cyan-500/20 text-cyan-300' : isBal ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300';
      return '<div class="cal-event ' + bg + ' mb-1 cursor-pointer" onclick="editItem(\\'' + e.id + '\\')" title="' + esc(e.name) + '">' +
        esc(e.name) +
      '</div>';
    }).join('');

    dayCells += '<div class="cal-day p-1.5 border border-white/5 transition-colors relative ' + (isToday ? 'bg-sky-500/10 border-sky-500/40' : '') + '">' +
      '<div class="text-xs font-bold ' + (isToday ? 'text-sky-400' : 'text-slate-400') + ' mb-1">' + d + '</div>' +
      '<div class="overflow-y-auto max-h-16">' + eventsHTML + '</div>' +
    '</div>';
  }

  return '<div class="glass rounded-2xl p-4 md:p-6">' +
    '<div class="flex items-center justify-between mb-4">' +
      '<h2 class="text-lg font-bold text-white">' + monthName + '</h2>' +
      '<div class="flex gap-2">' +
        '<button onclick="changeCalMonth(-1)" class="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-xs"><i class="fa-solid fa-chevron-left"></i></button>' +
        '<button onclick="calYear=new Date().getFullYear();calMonth=new Date().getMonth();renderItems();" class="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-xs">今天</button>' +
        '<button onclick="changeCalMonth(1)" class="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-xs"><i class="fa-solid fa-chevron-right"></i></button>' +
      '</div>' +
    '</div>' +
    '<div class="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-white/5">' +
      weekHeaders +
      dayCells +
    '</div>' +
  '</div>';
}

function changeCalMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  else if (calMonth > 11) { calMonth = 0; calYear++; }
  renderItems();
}

function getFlag(number) {
  if (!number) return '';
  const digits = String(number).replace(/[^0-9]/g, '');
  if (!digits) return '';
  const clean = digits.startsWith('00') ? digits.substring(2) : digits;
  for (let len of [3, 2, 1]) {
    if (clean.length >= len) {
      const p = clean.substring(0, len);
      if (FLAG_MAP[p]) return isoToFlag(FLAG_MAP[p]);
    }
  }
  return '';
}

function isoToFlag(iso) {
  if (!iso || iso.length !== 2) return '';
  const codePoints = iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function jsArg(s) { return esc(JSON.stringify(String(s || ''))); }
function safeHref(url) { if (!url) return ''; const u = String(url).trim().toLowerCase(); if (u.startsWith('javascript:') || u.startsWith('data:') || u.startsWith('vbscript:')) return '#'; return esc(url); }

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

// ==================== SETTINGS MODAL ====================
function openSettings() {
  hideMenu();
  const base = appSettings?.baseCurrency || 'CNY';
  editingRates = { ...(appSettings?.exchangeRates || DEFAULT_EXCHANGE_RATES) };
  editingCategories = [ ...(appSettings?.categories || DEFAULT_CATEGORIES) ];
  editingRegions = [ ...(appSettings?.regions || DEFAULT_REGIONS) ];

  const baseSelect = document.getElementById('settings-base-currency');
  if (baseSelect) baseSelect.value = base;

  setSettingsTab('currency');
  renderRateList();
  renderCategoryTags();
  renderRegionTags();

  const overlay = document.getElementById('settings-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }
}

function setSettingsTab(tab) {
  const tabs = ['currency', 'category', 'region'];
  tabs.forEach(t => {
    const btn = document.getElementById('stab-btn-' + t);
    const content = document.getElementById('stab-content-' + t);
    const active = t === tab;
    if (btn) {
      btn.classList.toggle('tab-active', active);
      btn.classList.toggle('text-slate-400', !active);
    }
    if (content) content.classList.toggle('hidden', !active);
  });
}

function onBaseCurrencyChange() {
  const baseSelect = document.getElementById('settings-base-currency');
  const newBase = baseSelect?.value || 'CNY';
  editingRates[newBase] = 1.0;
  renderRateList();
}

function updateEditingRate(code, val) {
  const n = parseFloat(val);
  if (Number.isFinite(n) && n >= 0) {
    editingRates[code] = n;
  }
}

function renderRateList() {
  const listEl = document.getElementById('settings-rate-list');
  if (!listEl) return;
  const search = (document.getElementById('settings-rate-search')?.value || '').toLowerCase().trim();
  const baseCur = document.getElementById('settings-base-currency')?.value || appSettings?.baseCurrency || 'CNY';

  let list = ISO_CURRENCIES;
  if (search) {
    list = list.filter(c =>
      c.code.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search) ||
      c.symbol.toLowerCase().includes(search)
    );
  }

  listEl.innerHTML = list.map(c => {
    const isBase = c.code === baseCur;
    const rateVal = isBase ? 1.0 : (editingRates[c.code] != null ? editingRates[c.code] : (DEFAULT_EXCHANGE_RATES[c.code] || 1.0));
    return '<div class="glass-card rounded-xl p-2.5 flex items-center justify-between gap-2 border border-white/10">' +
      '<div class="flex items-center gap-2 min-w-0">' +
        '<span class="text-lg flex-shrink-0">'+c.flag+'</span>' +
        '<div class="min-w-0">' +
          '<div class="text-xs font-bold text-white truncate">'+c.code+' <span class="text-[11px] font-normal text-slate-400">('+c.symbol+')</span></div>' +
          '<div class="text-[11px] text-slate-400 truncate">'+c.name+'</div>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-1.5 flex-shrink-0">' +
        (isBase
          ? '<span class="text-xs text-sky-400 font-bold px-2 py-1 bg-sky-500/10 rounded-lg border border-sky-500/20">基准 (1.0)</span>'
          : '<input type="number" step="0.0001" min="0" value="'+rateVal+'" onchange="updateEditingRate(\\''+c.code+'\\', this.value)" class="glass-input w-24 px-2 py-1 rounded-lg text-xs font-mono text-right text-emerald-300">') +
      '</div>' +
    '</div>';
  }).join('');
}

function filterRateList() { renderRateList(); }

async function syncLiveRates() {
  const baseSelect = document.getElementById('settings-base-currency');
  const base = baseSelect?.value || 'CNY';
  const btn = document.getElementById('sync-rates-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>同步中...'; }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/' + base);
    if (!res.ok) throw new Error('API 响应失败');
    const data = await res.json();
    if (data && data.rates) {
      ISO_CURRENCIES.forEach(c => {
        if (c.code === base) {
          editingRates[c.code] = 1.0;
        } else if (data.rates[c.code] != null && data.rates[c.code] > 0) {
          const rate = 1 / data.rates[c.code];
          editingRates[c.code] = rate >= 10 ? Number(rate.toFixed(2)) : Number(rate.toFixed(4));
        }
      });
      renderRateList();
      showToast('已成功获取并同步最新实时汇率 (基准: ' + base + ')', 'success');
    } else {
      throw new Error('未获取到有效汇率');
    }
  } catch (err) {
    console.error('syncLiveRates error:', err);
    showToast('汇率接口同步失败，请检查网络或稍后重试', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
  }
}

function resetDefaultRates() {
  editingRates = { ...DEFAULT_EXCHANGE_RATES };
  renderRateList();
  showToast('已重置汇率表为参考默认值', 'info');
}

function renderCategoryTags() {
  const container = document.getElementById('settings-category-tags');
  if (!container) return;
  container.innerHTML = editingCategories.map((cat, idx) =>
    '<span class="tag-badge text-slate-200">' +
      '<span>' + esc(cat) + '</span>' +
      '<button type="button" onclick="removeCustomCategory(' + idx + ')" class="text-slate-400 hover:text-red-400 text-xs ml-1"><i class="fa-solid fa-xmark"></i></button>' +
    '</span>'
  ).join('');
}

function addCustomCategory() {
  const input = document.getElementById('settings-new-category');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  if (!editingCategories.includes(val)) {
    editingCategories.push(val);
    renderCategoryTags();
  }
  input.value = '';
}

function removeCustomCategory(idx) {
  editingCategories.splice(idx, 1);
  renderCategoryTags();
}

function resetDefaultCategories() {
  editingCategories = [ ...DEFAULT_CATEGORIES ];
  renderCategoryTags();
  showToast('已恢复默认预设分类', 'info');
}

function renderRegionTags() {
  const container = document.getElementById('settings-region-tags');
  if (!container) return;
  container.innerHTML = editingRegions.map((r, idx) =>
    '<span class="tag-badge text-slate-200">' +
      (r.flag ? '<span>' + r.flag + '</span>' : '') +
      '<span class="font-bold text-xs">' + esc(r.code) + '</span>' +
      '<span class="text-slate-400 text-xs">' + esc(r.name || '') + '</span>' +
      '<button type="button" onclick="removeCustomRegion(' + idx + ')" class="text-slate-400 hover:text-red-400 text-xs ml-1"><i class="fa-solid fa-xmark"></i></button>' +
    '</span>'
  ).join('');
}

function addCustomRegion() {
  const codeIn = document.getElementById('settings-new-region-code');
  const nameIn = document.getElementById('settings-new-region-name');
  const flagIn = document.getElementById('settings-new-region-flag');
  const code = codeIn ? codeIn.value.trim().toUpperCase() : '';
  const name = nameIn ? nameIn.value.trim() : '';
  const flag = flagIn ? flagIn.value.trim() : '🌐';
  if (!code) { showToast('请输入区域代码 (如 TR, US)', 'error'); return; }

  const existingIdx = editingRegions.findIndex(r => r.code === code);
  const entry = { code, name: name || code, flag: flag || isoToFlag(code) || '🌐' };
  if (existingIdx >= 0) editingRegions[existingIdx] = entry;
  else editingRegions.push(entry);

  if (codeIn) codeIn.value = '';
  if (nameIn) nameIn.value = '';
  if (flagIn) flagIn.value = '';
  renderRegionTags();
}

function removeCustomRegion(idx) {
  editingRegions.splice(idx, 1);
  renderRegionTags();
}

function resetDefaultRegions() {
  editingRegions = [ ...DEFAULT_REGIONS ];
  renderRegionTags();
  showToast('已恢复默认预设区域', 'info');
}

async function saveSettingsToServer() {
  const baseSelect = document.getElementById('settings-base-currency');
  const baseCurrency = baseSelect?.value || 'CNY';

  const btn = document.getElementById('save-settings-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>保存中...'; }

  const payload = {
    baseCurrency,
    exchangeRates: editingRates,
    categories: editingCategories,
    regions: editingRegions,
    defaultRemindDays: appSettings?.defaultRemindDays || DEFAULT_REMIND_DAYS_CLIENT,
  };

  try {
    const res = await api('PUT', '/api/settings', payload);
    const data = await res.json();
    if (data.success) {
      appSettings = {
        baseCurrency: data.baseCurrency || baseCurrency,
        exchangeRates: data.exchangeRates || editingRates,
        categories: data.categories || editingCategories,
        regions: data.regions || editingRegions,
        defaultRemindDays: data.defaultRemindDays || (appSettings?.defaultRemindDays || DEFAULT_REMIND_DAYS_CLIENT),
      };
      populateCurrencySelects();
      populateCategoryDatalist();
      populateRegionDatalist();
      renderStats();
      renderAnalytics();
      closeSettings();
      showToast('设置与预设已保存', 'success');
    } else {
      showToast(data.message || '保存设置失败', 'error');
    }
  } catch (err) {
    console.error('saveSettings error:', err);
    showToast('保存设置失败', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
  }
}

// ==================== ITEM MODAL ====================
function setSelectedRemindDays(days) {
  const arr = Array.isArray(days) ? days : DEFAULT_REMIND_DAYS_CLIENT;
  document.querySelectorAll('.remind-day').forEach(cb => {
    cb.checked = arr.includes(Number(cb.value));
  });
}

function getSelectedRemindDays() {
  const checked = [];
  document.querySelectorAll('.remind-day:checked').forEach(cb => {
    checked.push(Number(cb.value));
  });
  return checked.length ? checked : DEFAULT_REMIND_DAYS_CLIENT;
}

function openModal(type, item) {
  populateCurrencySelects();
  populateCategoryDatalist();
  populateRegionDatalist();

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

  const baseCur = appSettings?.baseCurrency || 'CNY';

  if (item) {
    document.getElementById('form-name').value = item.name || '';
    document.getElementById('form-number').value = item.number || '';
    document.getElementById('form-smdp').value = item.smDp || '';
    document.getElementById('form-activation-code').value = item.activationCode || '';
    document.getElementById('form-confirmation-code').value = item.confirmationCode || '';
    document.getElementById('form-wid').value = item.wid || '';
    document.getElementById('form-balance-esim').value = item.balance == null ? '' : item.balance;
    document.getElementById('form-currency-esim').value = item.currency || baseCur;
    document.getElementById('form-category').value = item.category || '';
    document.getElementById('form-region').value = item.region || '';
    document.getElementById('form-sub-id').value = item.subId || '';
    document.getElementById('form-expire').value = item.expireDate || '';
    document.getElementById('form-cycle').value = item.cycle || '';
    document.getElementById('form-price').value = item.price || '';
    document.getElementById('form-currency').value = item.currency || baseCur;
    document.getElementById('form-currency-balance').value = item.currency || baseCur;
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
    document.getElementById('form-currency').value = baseCur;
    document.getElementById('form-currency-esim').value = baseCur;
    document.getElementById('form-currency-balance').value = baseCur;
    document.getElementById('form-auto-renew').checked = false;
    setSelectedRemindDays(appSettings?.defaultRemindDays || DEFAULT_REMIND_DAYS_CLIENT);
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
  const type = document.getElementById('form-type').value;

  let currency = 'CNY';
  if (type === 'esim') currency = document.getElementById('form-currency-esim').value;
  else if (type === 'balance') currency = document.getElementById('form-currency-balance').value;
  else currency = document.getElementById('form-currency').value;

  const body = {
    type,
    name: document.getElementById('form-name').value.trim(),
    number: document.getElementById('form-number').value.trim(),
    smDp: document.getElementById('form-smdp').value.trim(),
    activationCode: document.getElementById('form-activation-code').value.trim(),
    confirmationCode: document.getElementById('form-confirmation-code').value.trim(),
    wid: document.getElementById('form-wid').value.trim(),
    balance: type === 'esim' ? document.getElementById('form-balance-esim').value.trim() : document.getElementById('form-balance').value,
    currency: (currency || 'CNY').toUpperCase().trim(),
    category: document.getElementById('form-category').value.trim(),
    region: document.getElementById('form-region').value.trim(),
    subId: document.getElementById('form-sub-id').value.trim(),
    expireDate: document.getElementById('form-expire').value,
    cycle: parseInt(document.getElementById('form-cycle').value) || null,
    price: document.getElementById('form-price').value || null,
    billing: document.getElementById('form-billing').value,
    billingMode: document.getElementById('form-billing-mode').value,
    cycleDays: parseInt(document.getElementById('form-cycle-days').value) || null,
    autoRenew: document.getElementById('form-auto-renew').checked,
    url: document.getElementById('form-url').value.trim(),
    remark: document.getElementById('form-remark').value.trim(),
    status: document.getElementById('form-status').value,
    remindDays: getSelectedRemindDays(),
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

  const form = document.getElementById('renew-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('renew-submit');
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>续期中...';

    const deltaRaw = document.getElementById('renew-balance-delta').value;
    const body = {};
    if (isEsim && deltaRaw !== '') {
      body.balanceDelta = parseFloat(deltaRaw);
      body.note = document.getElementById('renew-balance-note').value.trim();
    }

    try {
      const res = await api('POST', '/api/items/' + id + '/renew', body);
      const data = await res.json();
      if (data.success) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        showToast('续期成功', 'success');
        await loadItems();
      } else {
        showToast(data.message || '续期失败', 'error');
      }
    } catch {
      showToast('续期失败', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  };

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function openRechargeModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const sym = currSym(item.currency || 'CNY');
  const overlay = document.getElementById('recharge-overlay');
  document.getElementById('recharge-info').textContent = esc(item.name) + ' 当前余额: ' + sym + (item.balance != null ? item.balance : 0);
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-note').value = '';

  const form = document.getElementById('recharge-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('recharge-amount').value);
    const note = document.getElementById('recharge-note').value.trim();
    if (!Number.isFinite(amount)) return showToast('请输入有效金额', 'error');

    const btn = form.querySelector('[type="submit"]');
    const origHTML = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>提交中...';

    try {
      const newBal = (item.balance || 0) + amount;
      const res = await api('PUT', '/api/items/' + id, { balance: newBal });
      const data = await res.json();
      if (data.success) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        showToast((amount >= 0 ? '充值成功' : '扣减成功') + '，当前余额: ' + sym + newBal.toFixed(2), 'success');
        await loadItems();
      } else {
        showToast(data.message || '充值失败', 'error');
      }
    } catch {
      showToast('充值失败', 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = origHTML;
    }
  };

  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

// ==================== EXPORT / IMPORT ====================
async function exportJSON() {
  toggleMenu();
  try {
    const res = await api('GET', '/api/items/export/json');
    if (!res.ok) { showToast('导出失败', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-tracker-export-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON 导出成功', 'success');
  } catch { showToast('导出失败', 'error'); }
}

async function exportCSV() {
  toggleMenu();
  try {
    const res = await api('GET', '/api/items/export/csv');
    if (!res.ok) { showToast('导出失败', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-tracker-export-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 导出成功', 'success');
  } catch { showToast('导出失败', 'error'); }
}

async function importJSON(input) {
  toggleMenu();
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const payload = Array.isArray(json) ? json : json.items || [];
    if (!Array.isArray(payload) || payload.length === 0) { showToast('无效的导入文件格式', 'error'); return; }
    showToast('导入中...', 'info');
    const res = await api('POST', '/api/items/import/json', payload);
    const data = await res.json();
    if (data.success) {
      const d = data.data;
      showToast('导入完成：新增 ' + d.added + ' 条，跳过 ' + d.skipped + ' 条', 'success');
      await loadItems();
    } else {
      showToast(data.message || '导入失败', 'error');
    }
  } catch (e) {
    showToast('导入解析失败：' + (e.message || '格式错误'), 'error');
  }
}

// ==================== HISTORY ====================
let historyFilter = 'all';
let rawHistoryData = [];

async function openHistory() {
  toggleMenu();
  const overlay = document.getElementById('history-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  historyFilter = 'all';
  updateHistoryTabs();
  await loadHistory();
}

function updateHistoryTabs() {
  document.querySelectorAll('.hfilter-tab').forEach(b => {
    const active = b.dataset.hfilter === historyFilter;
    b.classList.toggle('tab-active', active);
    b.classList.toggle('text-slate-400', !active);
  });
}

function filterHistory(f) {
  historyFilter = f;
  updateHistoryTabs();
  renderHistory(rawHistoryData);
}

async function loadHistory() {
  const content = document.getElementById('history-content');
  content.innerHTML = '<div class="text-sm text-slate-500 py-10 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>加载中...</div>';
  try {
    const res = await api('GET', '/api/history?limit=100');
    if (!res.ok) { content.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">加载历史失败</div>'; return; }
    rawHistoryData = await res.json();
    renderHistory(rawHistoryData);
  } catch {
    content.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">加载历史失败</div>';
  }
}

function renderHistory(allEntries) {
  const content = document.getElementById('history-content');
  const data = historyFilter === 'all' ? allEntries : allEntries.filter(e => e.action === historyFilter);
  if (!data || data.length === 0) {
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
    update_settings: ['更新偏好', 'fa-sliders', 'text-violet-400'],
  };
  const cfg = actionMap[entry.action] || [entry.action || '操作', 'fa-circle-info', 'text-slate-400'];
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('zh-CN', { hour12:false }) : '';
  const itemName = entry.itemName ? esc(entry.itemName) : '系统偏好设置';
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
  if (entry.action === 'update_settings') {
    return '基准货币：' + (d.baseCurrency || '未变更');
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
    closeSettings();
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
