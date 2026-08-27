/**
 * HTML template - serves the frontend shell.
 */

import { getClientScript } from './client-script.js';
import { getStyles } from './styles.js';

export function getHTML() {
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
${getStyles()}
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
      <p class="text-slate-400 text-sm mb-8">向已配置的登录通道获取验证码</p>
      <div class="mb-6">
        <input id="otp-input" type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="输入 6 位验证码"
          class="glass-input w-full px-4 py-4 rounded-xl text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.5em] font-mono">
      </div>
      <div class="flex flex-col gap-3">
        <button onclick="verifyOTP()" class="btn-primary w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> 登录
        </button>
        <button onclick="sendOTP()" id="send-btn" class="w-full py-3.5 rounded-xl font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-key"></i> 获取验证码
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
              <button onclick="toggleMenu(event)" class="text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors" title="更多功能">
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
      <select id="sort-select" onchange="renderItems()" class="glass-input px-3 py-1.5 rounded-lg text-xs flex-shrink-0">
        <option value="expire">按到期日</option>
        <option value="name">按名称</option>
        <option value="price">按费用</option>
      </select>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
        <input id="search-input" type="text" placeholder="搜索名称、号码、分类、区域、备注..."
          oninput="debouncedRender()"
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

    <!-- Mobile Floating Action Button (FAB) -->
    <div class="fixed right-4 bottom-6 sm:hidden z-40">
      <div id="fab-menu" class="hidden flex flex-col gap-2 mb-3 items-end fade-in">
        <button onclick="openModal('esim');toggleFab();" class="glass bg-cyan-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-cyan-400/30">
          <i class="fa-solid fa-sim-card"></i> eSIM 卡
        </button>
        <button onclick="openModal('subscription');toggleFab();" class="glass bg-violet-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-violet-400/30">
          <i class="fa-solid fa-credit-card"></i> 订阅服务
        </button>
        <button onclick="openModal('balance');toggleFab();" class="glass bg-amber-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-amber-400/30">
          <i class="fa-solid fa-wallet"></i> 话费管理
        </button>
      </div>
      <button id="fab-btn" onclick="toggleFab()" class="fab-btn btn-primary rounded-full text-white flex items-center justify-center text-xl shadow-2xl transition-transform active:scale-95" style="width:52px;height:52px;" aria-label="快捷添加">
        <i id="fab-icon" class="fa-solid fa-plus transition-transform duration-200"></i>
      </button>
    </div>
  </div>

  <!-- ========== ITEM MODAL ========== -->
  <div id="modal-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-2 sm:p-4">
    <div class="glass modal-box rounded-2xl md:rounded-3xl max-w-xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-white/15 fade-in overflow-hidden">
      
      <!-- Modal Header (Fixed) -->
      <div class="flex-shrink-0 px-5 py-4 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
        <div class="flex items-center gap-3 min-w-0">
          <div id="modal-icon-badge" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0 text-sm sm:text-base">
            <i class="fa-solid fa-layer-group"></i>
          </div>
          <div class="min-w-0">
            <h3 id="modal-title" class="text-base sm:text-lg font-bold text-white truncate">添加</h3>
            <p id="modal-subtitle" class="text-[11px] sm:text-xs text-slate-400 truncate">配置服务详情、账期与提醒规则</p>
          </div>
        </div>
        <button type="button" onclick="closeModal()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Modal Body (Scrollable Form Content) -->
      <form id="item-form" onsubmit="saveItem(event)" class="flex-1 flex flex-col min-h-0">
        <input type="hidden" id="form-id">
        <input type="hidden" id="form-type">
        
        <div class="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          
          <!-- Section 1: Basic Info -->
          <div class="space-y-3.5">
            <div>
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>名称 <span class="text-red-400">*</span></span>
                <span class="text-[11px] font-normal text-slate-400">如: Netflix / Ultra Mobile / iCloud</span>
              </label>
              <input id="form-name" type="text" required placeholder="输入服务或卡片名称" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>

            <!-- Subscription Category & Region (2 Columns) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="field-category" class="hidden">
                <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <i class="fa-solid fa-layer-group text-sky-400 text-xs"></i>
                  <span>分类预设 / 输入</span>
                </label>
                <input id="form-category" type="text" list="category-datalist" placeholder="选择或输入分类..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" autocomplete="off">
                <datalist id="category-datalist"></datalist>
              </div>
              
              <div id="field-region" class="hidden">
                <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <i class="fa-solid fa-globe text-emerald-400 text-xs"></i>
                  <span>账号区域 / 国家</span>
                </label>
                <input id="form-region" type="text" list="region-datalist" placeholder="如: US / TR / 大陆..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" autocomplete="off">
                <datalist id="region-datalist"></datalist>
              </div>
            </div>

            <!-- Phone Number (eSIM & Balance) -->
            <div id="field-number" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-phone text-cyan-400 text-xs"></i>
                <span>手机号码</span>
              </label>
              <input id="form-number" type="text" placeholder="+861****8000 / +1234567890" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
            </div>

            <!-- Subscription ID / Account -->
            <div id="field-sub-id" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-user-tag text-purple-400 text-xs"></i>
                <span>订阅账号 / 邮箱 (可选)</span>
              </label>
              <input id="form-sub-id" type="text" placeholder="账号邮箱或订阅唯一识别码" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>
          </div>

          <!-- Section 2: Subscription Price & Billing -->
          <div id="field-price" class="hidden bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3.5">
            <div class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <i class="fa-solid fa-receipt text-xs"></i> 费用与计费周期
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">价格 / 费用</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">货币币种</label>
                <input id="form-currency" type="text" list="currency-datalist" placeholder="搜索 (如 USD, CNY)..." class="glass-input w-full px-3 py-2 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">周期类型</label>
                <select id="form-billing" class="glass-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="monthly">月付</option>
                  <option value="yearly">年付</option>
                  <option value="once">一次性</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div id="field-billing-mode">
                <label class="text-xs text-slate-400 mb-1 block">计费方式</label>
                <select id="form-billing-mode" class="glass-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="natural">自然月 / 年</option>
                  <option value="fixed">固定天数</option>
                </select>
              </div>
              <div id="field-cycle-days" class="hidden">
                <label class="text-xs text-slate-400 mb-1 block">固定天数 (天)</label>
                <input id="form-cycle-days" type="number" min="1" placeholder="默认30天" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div class="sm:col-span-2 flex items-center justify-between pt-1">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" id="form-auto-renew" class="rounded accent-sky-500 w-4 h-4">
                  <span>自动续费 <span class="text-slate-400 text-[11px]">(到期免手动续期，系统按周期顺延)</span></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 3: eSIM Specific Balance & Activation -->
          <div id="field-esim-balance" class="hidden bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div class="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-3">
              <i class="fa-solid fa-wallet text-xs"></i> 余额追踪 (可选)
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">当前余额</label>
                <input id="form-balance-esim" type="number" step="0.01" placeholder="不填表示不追踪余额" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">货币</label>
                <input id="form-currency-esim" type="text" list="currency-datalist" placeholder="如 USD, CNY..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
            </div>
          </div>

          <div id="field-esim-activation" class="hidden bg-cyan-950/20 p-3.5 sm:p-4 rounded-2xl border border-cyan-500/20 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <i class="fa-solid fa-qrcode"></i> eSIM 激活参数 (支持扫码安装)
              </span>
              <span class="text-[10px] text-amber-400/90 font-medium">🔒 敏感信息加密</span>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">SM-DP+ 地址</label>
              <input id="form-smdp" type="text" placeholder="如: rsp.truphone.com" class="glass-input w-full px-3.5 py-2 rounded-xl text-xs font-mono">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">激活码 (Matching ID)</label>
                <div class="relative">
                  <input id="form-activation-code" type="password" placeholder="激活码" class="glass-input w-full pl-3 pr-8 py-2 rounded-xl text-xs font-mono" autocomplete="off">
                  <button type="button" onclick="togglePasswordVis('form-activation-code', this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class="fa-solid fa-eye-slash text-xs"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">确认码 (Confirmation Code)</label>
                <div class="relative">
                  <input id="form-confirmation-code" type="password" placeholder="可选确认码" class="glass-input w-full pl-3 pr-8 py-2 rounded-xl text-xs font-mono" autocomplete="off">
                  <button type="button" onclick="togglePasswordVis('form-confirmation-code', this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class="fa-solid fa-eye-slash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">EID / WID (可选设备标识)</label>
              <input id="form-wid" type="text" placeholder="32位 EID" class="glass-input w-full px-3.5 py-2 rounded-xl text-xs font-mono">
            </div>
          </div>

          <!-- Section 4: Balance Mode Details -->
          <div id="field-balance" class="hidden bg-amber-950/20 p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 space-y-3">
            <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <i class="fa-solid fa-coins text-xs"></i> 话费与停机预测规则
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">当前余额 *</label>
                <input id="form-balance" type="number" step="0.01" min="0" placeholder="50.00" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">月租 *</label>
                <input id="form-monthly-fee" type="number" step="0.01" min="0" placeholder="18.00" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">扣费日 (1-28) *</label>
                <input id="form-billing-day" type="number" min="1" max="28" placeholder="5" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">货币</label>
                <input id="form-currency-balance" type="text" list="currency-datalist" placeholder="如 CNY, HKD..." class="glass-input w-full px-3 py-2 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
            </div>
          </div>

          <!-- Section 5: Dates & Reminders -->
          <div class="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3.5">
            <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-regular fa-calendar-check text-sky-400 text-xs"></i> 周期与提醒配置
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="field-expire">
                <label class="text-xs text-slate-400 mb-1 block">到期日期 <span class="text-red-400">*</span></label>
                <input id="form-expire" type="date" min="2020-01-01" max="2035-12-31" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" lang="zh-CN">
              </div>
              <div id="field-cycle">
                <label class="text-xs text-slate-400 mb-1 block">保号 / 续费周期 (天)</label>
                <input id="form-cycle" type="number" min="1" placeholder="如: 180" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 mb-2 block">提前提醒时间 (支持多选)</label>
              <div class="flex flex-wrap gap-2" id="remind-checkboxes">
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="30" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">30天前</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="15" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">15天前</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="7" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">7天前</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="3" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">3天前</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="1" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">1天前</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="0" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">当天</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 6: URLs & Remarks & Status -->
          <div class="space-y-3.5">
            <div id="field-url" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-link text-sky-400 text-xs"></i>
                <span>服务链接 (官网 / 控制台)</span>
              </label>
              <input id="form-url" type="url" placeholder="https://example.com" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="text-xs text-slate-400 mb-1.5 block">备注信息 (可选)</label>
                <input id="form-remark" type="text" placeholder="记录套餐说明、PIN/PUK、续费规则..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1.5 block">状态</label>
                <select id="form-status" class="glass-input w-full px-3 py-2.5 rounded-xl text-sm">
                  <option value="active">🟢 启用中</option>
                  <option value="paused">⏸️ 已暂停</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Global Currency Datalist -->
          <datalist id="currency-datalist"></datalist>
        </div>

        <!-- Modal Footer (Fixed) -->
        <div class="flex-shrink-0 px-5 py-4 sm:px-6 sm:py-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md flex items-center gap-3">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform">
            <i class="fa-solid fa-check"></i>
            <span>保存</span>
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-semibold text-slate-300 text-sm border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all">
            取消
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========== SETTINGS MODAL ========== -->
  <div id="settings-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-2 sm:p-4">
    <div class="glass modal-box rounded-2xl md:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-white/15 fade-in overflow-hidden">
      
      <!-- Settings Header (Fixed) -->
      <div class="flex-shrink-0 px-5 py-4 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center flex-shrink-0 text-sm sm:text-base">
            <i class="fa-solid fa-sliders"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-bold text-white truncate">偏好与预设管理</h3>
            <p class="text-[11px] sm:text-xs text-slate-400 truncate">配置货币汇率、常用分类与账号区域</p>
          </div>
        </div>
        <button type="button" onclick="closeSettings()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Settings Tabs & Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
        <!-- Settings Tabs -->
        <div class="flex flex-wrap gap-2 pb-2 border-b border-white/10">
          <button onclick="setSettingsTab('currency')" id="stab-btn-currency" class="settings-tab-btn tab-active px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all">
            <i class="fa-solid fa-coins mr-1.5 text-amber-400"></i>货币与汇率
          </button>
          <button onclick="setSettingsTab('category')" id="stab-btn-category" class="settings-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
            <i class="fa-solid fa-layer-group mr-1.5 text-sky-400"></i>预设分类
          </button>
          <button onclick="setSettingsTab('region')" id="stab-btn-region" class="settings-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
            <i class="fa-solid fa-globe mr-1.5 text-emerald-400"></i>预设区域
          </button>
        </div>

        <!-- Tab 1: Currency & Rates -->
        <div id="stab-content-currency" class="space-y-4">
          <div class="bg-white/5 rounded-xl p-4 border border-white/10">
            <label class="text-sm font-semibold text-white mb-1.5 block">统计基准货币 (Base Currency)</label>
            <p class="text-xs text-slate-400 mb-3">全币种总支出折算时，所有外币均按此基准币种进行折算</p>
            <select id="settings-base-currency" onchange="onBaseCurrencyChange()" class="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-sky-300"></select>
          </div>

          <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div>
              <div class="text-sm font-semibold text-white">各币种汇率管理 (1 外币 = X 基准货币)</div>
              <div class="text-xs text-slate-400">支持一键同步最新公网实时汇率，也可针对特定渠道手动微调</div>
            </div>
            <div class="flex gap-2">
              <button type="button" onclick="syncLiveRates()" id="sync-rates-btn" class="px-3 py-1.5 rounded-xl text-xs font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center gap-1.5">
                <i class="fa-solid fa-rotate mr-1"></i>同步实时汇率
              </button>
              <button type="button" onclick="resetDefaultRates()" class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">
                恢复默认
              </button>
            </div>
          </div>

          <div class="relative">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input id="settings-rate-search" type="text" placeholder="搜索货币代码 (如 USD)、中文名 (如 美元)、符号..." oninput="filterRateList()" class="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs">
          </div>

          <div id="settings-rate-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1"></div>
        </div>

        <!-- Tab 2: Categories -->
        <div id="stab-content-category" class="space-y-4 hidden">
          <div>
            <div class="text-sm font-semibold text-white mb-1">常用分类预设</div>
            <div class="text-xs text-slate-400 mb-3">在录入订阅服务时作为下拉建议提供。支持随时增删自定义分类。</div>
            <div id="settings-category-tags" class="flex flex-wrap gap-2 mb-4"></div>
          </div>
          <div class="flex gap-2">
            <input id="settings-new-category" type="text" placeholder="输入新分类名称 (如: 游戏内购 / 会员)..." class="glass-input flex-1 px-4 py-2.5 rounded-xl text-sm" onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomCategory();}">
            <button type="button" onclick="addCustomCategory()" class="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 flex-shrink-0">
              <i class="fa-solid fa-plus"></i> 添加
            </button>
          </div>
          <div class="pt-2">
            <button type="button" onclick="resetDefaultCategories()" class="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              恢复默认预设分类
            </button>
          </div>
        </div>

        <!-- Tab 3: Regions -->
        <div id="stab-content-region" class="space-y-4 hidden">
          <div>
            <div class="text-sm font-semibold text-white mb-1">常用区域 / 国家预设</div>
            <div class="text-xs text-slate-400 mb-3">方便跨区订阅快速选填。支持从全球国家列表中快速检索并添加。</div>
            <div id="settings-region-tags" class="flex flex-wrap gap-2 mb-4"></div>
          </div>
          
          <!-- Quick Country Search -->
          <div class="bg-white/5 p-3 rounded-xl border border-white/10 mb-3">
            <label class="text-xs text-slate-300 font-semibold mb-1.5 block"><i class="fa-solid fa-magnifying-glass mr-1 text-emerald-400"></i>全球国家/地区检索快速填充：</label>
            <input id="settings-country-search" type="text" list="settings-country-datalist" placeholder="输入国家名称或代码检索 (如: 土耳其 / TR / 埃及 / 阿根廷 / 日本)..." oninput="onSelectCountryPreset(this.value)" class="glass-input w-full px-4 py-2.5 rounded-xl text-sm" autocomplete="off">
            <datalist id="settings-country-datalist"></datalist>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input id="settings-new-region-code" type="text" placeholder="代码(如 TR)" class="glass-input sm:col-span-3 px-4 py-2.5 rounded-xl text-sm uppercase">
            <input id="settings-new-region-name" type="text" placeholder="名称(如 土耳其)" class="glass-input sm:col-span-4 px-4 py-2.5 rounded-xl text-sm">
            <input id="settings-new-region-flag" type="text" placeholder="旗帜(如 🇹🇷)" class="glass-input sm:col-span-2 px-4 py-2.5 rounded-xl text-sm text-center">
            <button type="button" onclick="addCustomRegion()" class="btn-primary sm:col-span-3 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plus"></i> 添加区域
            </button>
          </div>
          <div class="pt-2">
            <button type="button" onclick="resetDefaultRegions()" class="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              恢复默认预设区域
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Footer (Fixed) -->
      <div class="flex-shrink-0 px-5 py-4 sm:px-6 sm:py-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md flex gap-3">
        <button type="button" onclick="saveSettingsToServer()" id="save-settings-btn" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform">
          <i class="fa-solid fa-floppy-disk"></i> 保存设置
        </button>
        <button type="button" onclick="closeSettings()" class="flex-1 py-3 rounded-xl font-semibold text-slate-300 border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all">
          取消
        </button>
      </div>
    </div>
  </div>

  <!-- ========== QR CODE MODAL ========== -->
  <div id="qr-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in text-center">
      <div class="flex justify-between items-center mb-4">
        <h3 id="qr-title" class="text-lg font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-qrcode text-cyan-400"></i> eSIM 安装二维码
        </h3>
        <button onclick="closeQrModal()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div id="qr-container" class="flex items-center justify-center p-4 bg-white rounded-2xl mb-4 shadow-inner">
        <!-- SVG QR Code rendered here -->
      </div>
      <div class="text-left bg-white/5 rounded-xl p-3 mb-4 space-y-2 text-xs font-mono">
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400 font-sans">SM-DP+:</span>
          <span id="qr-smdp-val" class="truncate max-w-[180px]"></span>
        </div>
        <div class="flex justify-between items-center text-slate-300">
          <span class="text-slate-400 font-sans">激活码:</span>
          <span id="qr-act-val" class="truncate max-w-[180px]"></span>
        </div>
        <div id="qr-conf-row" class="flex justify-between items-center text-slate-300 hidden">
          <span class="text-slate-400 font-sans">确认码:</span>
          <span id="qr-conf-val" class="truncate max-w-[180px]"></span>
        </div>
      </div>
      <div class="space-y-2">
        <button onclick="copyLpaString()" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-copy"></i> 复制完整 LPA 激活代码
        </button>
        <div class="flex gap-2">
          <button onclick="copyText(document.getElementById('qr-smdp-val').textContent, 'SM-DP+ 地址')" class="flex-1 py-2 rounded-lg text-xs text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">复制 SM-DP+</button>
          <button onclick="copyText(document.getElementById('qr-act-val').textContent, '激活码')" class="flex-1 py-2 rounded-lg text-xs text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">复制激活码</button>
        </div>
      </div>
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
      <div id="history-filters" class="flex flex-wrap gap-2 mb-4">
        <button onclick="filterHistory('all')" data-hfilter="all" class="hfilter-tab tab-active px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all">全部</button>
        <button onclick="filterHistory('create')" data-hfilter="create" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus mr-1"></i>新增</button>
        <button onclick="filterHistory('update')" data-hfilter="update" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-pen mr-1"></i>更新</button>
        <button onclick="filterHistory('delete')" data-hfilter="delete" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-trash mr-1"></i>删除</button>
        <button onclick="filterHistory('renew')" data-hfilter="renew" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-rotate mr-1"></i>续期</button>
        <button onclick="filterHistory('recharge')" data-hfilter="recharge" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus-circle mr-1"></i>充值</button>
        <button onclick="filterHistory('deduct')" data-hfilter="deduct" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-minus-circle mr-1"></i>扣费</button>
        <button onclick="filterHistory('import')" data-hfilter="import" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-upload mr-1"></i>导入</button>
      </div>
      <div id="history-content" class="space-y-2"></div>
    </div>
  </div>

  <!-- ========== RECHARGE MODAL ========== -->
  <div id="recharge-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in">
      <h3 class="text-lg font-bold text-white mb-4">充值</h3>
      <p id="recharge-info" class="text-sm text-slate-400 mb-4"></p>
      <form id="recharge-form">
        <div class="space-y-3">
          <div>
            <label class="text-sm text-slate-400 mb-1 block">充值金额（负数为校正扣减）</label>
            <input id="recharge-amount" type="number" step="0.01" required placeholder="50.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">备注（可选）</label>
            <input id="recharge-note" type="text" placeholder="如：微信充值" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>确认充值</button>
          <button type="button" onclick="document.getElementById('recharge-overlay').classList.add('hidden');document.getElementById('recharge-overlay').classList.remove('flex');" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">取消</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========== RENEW MODAL ========== -->
  <div id="renew-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in">
      <h3 id="renew-title" class="text-lg font-bold text-white mb-4">续期</h3>
      <p id="renew-info" class="text-sm text-slate-400 mb-4"></p>
      <form id="renew-form">
        <div id="renew-balance-fields" class="space-y-3">
          <div class="bg-white/5 rounded-xl p-3">
            <label class="text-sm text-slate-400 mb-1 block">本次余额变动（可选）</label>
            <input id="renew-balance-delta" type="number" step="0.01" placeholder="负数=扣费，正数=充值，留空=仅续期" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">备注（可选）</label>
            <input id="renew-balance-note" type="text" placeholder="如：年费续期扣款" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button id="renew-submit" type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-rotate mr-1"></i>确认续期</button>
          <button type="button" onclick="document.getElementById('renew-overlay').classList.add('hidden');document.getElementById('renew-overlay').classList.remove('flex');" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">取消</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========== TOAST ========== -->
  <div id="toast-container" class="toast-container"></div>

  <!-- ========== DROPDOWN (body level, escapes all stacking contexts) ========== -->
  <div id="dropdown-menu" class="hidden fixed glass rounded-xl p-2 min-w-[160px]" style="z-index:99999">
    <button onclick="openSettings()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-sliders mr-2 text-violet-400"></i>偏好设置
    </button>
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
${getClientScript()}
</script>
</body>
</html>`;
}
