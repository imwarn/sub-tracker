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
\t  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet" crossorigin="anonymous">
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
            <input id="form-number" type="text" placeholder="+861****8000" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
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
          <div>
            <label class="text-sm text-slate-400 mb-1 block">状态</label>
            <select id="form-status" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="active">启用</option>
              <option value="paused">暂停</option>
            </select>
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
	      <div id="history-filters" class="flex flex-wrap gap-2 mb-4">
	        <button onclick="filterHistory('all')" data-hfilter="all" class="hfilter-tab tab-active px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all">全部</button>
	        <button onclick="filterHistory('create')" data-hfilter="create" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus mr-1"></i>新增</button>
	        <button onclick="filterHistory('update')" data-hfilter="update" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-pen mr-1"></i>更新</button>
	        <button onclick="filterHistory('delete')" data-hfilter="delete" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-trash mr-1"></i>删除</button>
	        <button onclick="filterHistory('renew')" data-hfilter="renew" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-rotate mr-1"></i>续期</button>
	        <button onclick="filterHistory('recharge')" data-hfilter="recharge" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus-circle mr-1"></i>充值</button>
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
\t            <label class="text-sm text-slate-400 mb-1 block">备注（可选）</label>
\t            <input id="recharge-note" type="text" placeholder="如：微信充值" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
\t          </div>
\t        </div>
\t        <div class="flex gap-3 mt-5">
\t          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>确认充值</button>
\t          <button type="button" onclick="document.getElementById('recharge-overlay').classList.add('hidden');document.getElementById('recharge-overlay').classList.remove('flex');" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">取消</button>
\t        </div>
\t      </form>
\t    </div>
\t  </div>


\t  <!-- ========== TOAST ========== -->
\t  <div id="toast-container" class="toast-container"></div>

\t  <!-- ========== DROPDOWN (body level, escapes all stacking contexts) ========== -->
\t  <div id="dropdown-menu" class="hidden fixed glass rounded-xl p-2 min-w-[160px]" style="z-index:99999">
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
