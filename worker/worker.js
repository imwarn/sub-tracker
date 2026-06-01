// src/utils/response.js
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
function htmlResponse(html) {
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8", ...CORS_HEADERS }
  });
}
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}
function successResponse(data = null) {
  const res = { success: true };
  if (data)
    Object.assign(res, data);
  return jsonResponse(res);
}
function corsPreFlight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// src/data/store.js
var ITEMS_KEY = "items";
async function getAllItems(db) {
  try {
    const items = await db.get(ITEMS_KEY, { type: "json" });
    return items || [];
  } catch {
    return [];
  }
}
async function saveAllItems(db, items) {
  await db.put(ITEMS_KEY, JSON.stringify(items));
}
async function addItem(db, item) {
  const items = await getAllItems(db);
  items.push(item);
  await saveAllItems(db, items);
  return item;
}
async function updateItem(db, id, updater) {
  const items = await getAllItems(db);
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1)
    return null;
  items[idx] = updater(items[idx]);
  await saveAllItems(db, items);
  return items[idx];
}
async function deleteItem(db, id) {
  const items = await getAllItems(db);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length)
    return false;
  await saveAllItems(db, filtered);
  return true;
}
async function getConfig(db, key) {
  return await db.get(key);
}
async function setConfig(db, key, value, options) {
  await db.put(key, value, options);
}

// src/handlers/auth.js
async function handleAuth(request, env, path) {
  if (request.method === "OPTIONS") {
    return corsPreFlight();
  }
  if (path === "/api/auth/send" && request.method === "POST") {
    return await sendOTP(env);
  }
  if (path === "/api/auth/verify" && request.method === "POST") {
    return await verifyOTP(request, env);
  }
  if (path === "/api/auth/check" && request.method === "GET") {
    return checkSession(request, env);
  }
  return null;
}
async function getTGConfig(env) {
  let token = env.TG_BOT_TOKEN;
  let chatId = env.TG_CHAT_ID;
  try {
    if (!token)
      token = await getConfig(env.DB, "TG_BOT_TOKEN");
    if (!chatId)
      chatId = await getConfig(env.DB, "TG_CHAT_ID");
  } catch {
  }
  return { token, chatId };
}
async function sendOTP(env) {
  const { token, chatId } = await getTGConfig(env);
  if (!token || !chatId) {
    const missing = [];
    if (!token)
      missing.push("TG_BOT_TOKEN");
    if (!chatId)
      missing.push("TG_CHAT_ID");
    return errorResponse(
      `\u73AF\u5883\u7F3A\u5931\uFF1A\u7F3A\u5C11 ${missing.join(" \u548C ")}\u3002\u8BF7\u524D\u5F80 Cloudflare \u7684 KV \u6570\u636E\u5E93\u4E2D\u624B\u52A8\u6DFB\u52A0\u8FD9\u4E24\u4E2A\u952E\u503C\u5BF9\uFF01`,
      500
    );
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  await setConfig(env.DB, "admin_auth_code", code, { expirationTtl: 300 });
  await setConfig(env.DB, "admin_auth_attempts", "0", { expirationTtl: 300 });
  const text = [
    "\u{1F510} <b>\u3010Sub-Tracker \u5B89\u5168\u9A8C\u8BC1\u3011</b>",
    "",
    "\u6709\u4EBA\u6B63\u5728\u5C1D\u8BD5\u767B\u5F55\u60A8\u7684\u770B\u677F\u3002",
    "",
    `\u60A8\u7684\u52A8\u6001\u9A8C\u8BC1\u7801\u662F\uFF1A<code>${code}</code>`,
    "",
    "<i>(\u9A8C\u8BC1\u7801 5 \u5206\u949F\u5185\u6709\u6548\uFF0C\u8FDE\u7EED\u8F93\u9519 5 \u6B21\u5C06\u81EA\u52A8\u4F5C\u5E9F)</i>"
  ].join("\n");
  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(tgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
  if (res.ok) {
    return successResponse();
  }
  return errorResponse("TG \u6D88\u606F\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 Bot Token \u662F\u5426\u6709\u6548\u3001\u662F\u5426\u5DF2\u6FC0\u6D3B", 500);
}
async function verifyOTP(request, env) {
  try {
    const { code } = await request.json();
    const storedCode = await getConfig(env.DB, "admin_auth_code");
    let attempts = parseInt(await getConfig(env.DB, "admin_auth_attempts")) || 0;
    if (attempts >= 5) {
      await env.DB.delete("admin_auth_code");
      return errorResponse("\u9519\u8BEF\u6B21\u6570\u8FC7\u591A\uFF0C\u9A8C\u8BC1\u7801\u5DF2\u4F5C\u5E9F\u3002\u8BF7\u91CD\u65B0\u83B7\u53D6\uFF01", 403);
    }
    if (!storedCode) {
      return errorResponse("\u8BF7\u5148\u83B7\u53D6\u9A8C\u8BC1\u7801\u6216\u9A8C\u8BC1\u7801\u5DF2\u8FC7\u671F", 400);
    }
    if (code && storedCode === code.toString()) {
      const token = crypto.randomUUID();
      await setConfig(env.DB, `session_token_${token}`, "valid", { expirationTtl: 2592e3 });
      await env.DB.delete("admin_auth_code");
      await env.DB.delete("admin_auth_attempts");
      return successResponse({ token });
    }
    attempts++;
    await setConfig(env.DB, "admin_auth_attempts", attempts.toString(), { expirationTtl: 300 });
    await new Promise((r) => setTimeout(r, 1e3));
    return errorResponse(`\u9A8C\u8BC1\u7801\u9519\u8BEF\uFF01\u5269\u4F59\u5C1D\u8BD5\u6B21\u6570: ${5 - attempts} \u6B21`, 401);
  } catch {
    return errorResponse("\u6821\u9A8C\u5931\u8D25", 500);
  }
}
async function checkSession(request, env) {
  const token = request.headers.get("Authorization");
  if (!token)
    return errorResponse("\u672A\u767B\u5F55", 401);
  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid)
    return errorResponse("\u4F1A\u8BDD\u5DF2\u8FC7\u671F", 401);
  return successResponse();
}
async function requireAuth(request, env) {
  const token = request.headers.get("Authorization");
  if (!token)
    return errorResponse("Unauthorized: Missing Token", 401);
  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid)
    return errorResponse("Unauthorized: Invalid or Expired Token", 401);
  return null;
}

// src/data/schema.js
function createItem(type, data) {
  const base = {
    id: Date.now().toString(),
    type,
    name: data.name || "",
    expireDate: data.expireDate || "",
    cycle: data.cycle || null,
    remark: data.remark || "",
    status: data.status || "active",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (type === "esim") {
    return {
      ...base,
      number: data.number || ""
    };
  }
  return {
    ...base,
    category: data.category || "",
    price: data.price || null,
    currency: data.currency || "CNY",
    autoRenew: data.autoRenew || false,
    remindDays: data.remindDays ?? 3,
    url: data.url || ""
  };
}
function validateItem(type, data) {
  if (!data.name)
    return "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A";
  if (!data.expireDate)
    return "\u5230\u671F\u65E5\u671F\u4E0D\u80FD\u4E3A\u7A7A";
  if (type === "subscription" && data.price && isNaN(parseFloat(data.price))) {
    return "\u4EF7\u683C\u683C\u5F0F\u4E0D\u6B63\u786E";
  }
  return null;
}
function mergeUpdate(existing, data) {
  const updated = { ...existing };
  for (const key of ["name", "expireDate", "cycle", "remark", "status"]) {
    if (data[key] !== void 0)
      updated[key] = data[key];
  }
  if (existing.type === "esim") {
    if (data.number !== void 0)
      updated.number = data.number;
  }
  if (existing.type === "subscription") {
    for (const key of ["category", "price", "currency", "autoRenew", "remindDays", "url"]) {
      if (data[key] !== void 0)
        updated[key] = data[key];
    }
  }
  return updated;
}

// src/utils/date.js
var TZ_OFFSET = 8;
function todayMidnight() {
  const now = /* @__PURE__ */ new Date();
  const local = new Date(now.getTime() + TZ_OFFSET * 36e5);
  local.setUTCHours(0, 0, 0, 0);
  return local;
}
function addDays(dateStr, days) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// src/handlers/items.js
async function handleItems(request, env, path) {
  if (request.method === "OPTIONS")
    return corsPreFlight();
  const authErr = await requireAuth(request, env);
  if (authErr)
    return authErr;
  if (path === "/api/items" && request.method === "GET") {
    return await listItems(request, env);
  }
  if (path === "/api/items" && request.method === "POST") {
    return await createNewItem(request, env);
  }
  const idMatch = path.match(/^\/api\/items\/([^/]+)(\/.*)?$/);
  if (idMatch) {
    const id = idMatch[1];
    const action = idMatch[2] || "";
    if (request.method === "PUT" && action === "") {
      return await updateExistingItem(request, env, id);
    }
    if (request.method === "DELETE" && action === "") {
      return await deleteExistingItem(env, id);
    }
    if (request.method === "POST" && action === "/renew") {
      return await renewItem(env, id);
    }
  }
  return null;
}
async function listItems(request, env) {
  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type");
  let items = await getAllItems(env.DB);
  if (typeFilter) {
    items = items.filter((i) => i.type === typeFilter);
  }
  return jsonResponse(items);
}
async function createNewItem(request, env) {
  try {
    const body = await request.json();
    const type = body.type || "esim";
    if (!["esim", "subscription"].includes(type)) {
      return errorResponse("\u65E0\u6548\u7684\u7C7B\u578B");
    }
    const err = validateItem(type, body);
    if (err)
      return errorResponse(err);
    const item = createItem(type, body);
    await addItem(env.DB, item);
    return successResponse({ id: item.id });
  } catch {
    return errorResponse("\u53C2\u6570\u9519\u8BEF", 400);
  }
}
async function updateExistingItem(request, env, id) {
  try {
    const body = await request.json();
    const result = await updateItem(env.DB, id, (existing) => {
      return mergeUpdate(existing, body);
    });
    if (!result)
      return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404);
    return successResponse();
  } catch {
    return errorResponse("\u66F4\u65B0\u5931\u8D25", 400);
  }
}
async function deleteExistingItem(env, id) {
  const ok = await deleteItem(env.DB, id);
  if (!ok)
    return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404);
  return successResponse();
}
async function renewItem(env, id) {
  const result = await updateItem(env.DB, id, (existing) => {
    if (!existing.cycle) {
      throw new Error("\u672A\u8BBE\u7F6E\u4FDD\u53F7\u5468\u671F\uFF0C\u65E0\u6CD5\u7EED\u671F");
    }
    const newExpire = addDays(existing.expireDate, existing.cycle);
    return { ...existing, expireDate: newExpire, status: "active" };
  });
  if (!result)
    return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404);
  return successResponse({ newExpireDate: result.expireDate });
}

// src/ui/template.js
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sub-Tracker | eSIM \u4FDD\u53F7 & \u8BA2\u9605\u7BA1\u7406</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
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
      <h2 class="text-2xl font-bold text-white mb-2">\u5B89\u5168\u9A8C\u8BC1</h2>
      <p class="text-slate-400 text-sm mb-8">\u5411\u4F60\u7684 Telegram \u673A\u5668\u4EBA\u83B7\u53D6\u9A8C\u8BC1\u7801\u767B\u5F55</p>
      <div class="mb-6">
        <input id="otp-input" type="text" maxlength="6" placeholder="\u8F93\u5165 6 \u4F4D\u9A8C\u8BC1\u7801"
          class="glass-input w-full px-4 py-4 rounded-xl text-center text-2xl tracking-[0.5em] font-mono">
      </div>
      <div class="flex flex-col gap-3">
        <button onclick="verifyOTP()" class="btn-primary w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> \u767B\u5F55
        </button>
        <button onclick="sendOTP()" id="send-btn" class="w-full py-3.5 rounded-xl font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2">
          <i class="fa-brands fa-telegram"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801
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
        <p class="text-slate-400 mt-1 text-sm">eSIM \u4FDD\u53F7 & \u8BA2\u9605\u8D39\u7528\u7BA1\u7406\u770B\u677F</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap justify-center">
        <span class="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full" id="today-display"></span>
        <button onclick="openModal('esim')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> \u6DFB\u52A0 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> \u6DFB\u52A0\u8BA2\u9605
        </button>
        <button onclick="logout()" class="text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors" title="\u9000\u51FA">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="stats-bar"></div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button onclick="setFilter('all')" data-filter="all" class="filter-tab tab-active px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all">
        <i class="fa-solid fa-globe mr-1"></i> \u5168\u90E8
      </button>
      <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
        <i class="fa-solid fa-sim-card mr-1"></i> eSIM
      </button>
      <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-4 py-2 rounded-xl text-sm font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
        <i class="fa-solid fa-credit-card mr-1"></i> \u8BA2\u9605
      </button>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
        <input id="search-input" type="text" placeholder="\u641C\u7D22\u540D\u79F0\u3001\u53F7\u7801\u3001\u5907\u6CE8..."
          oninput="renderItems()"
          class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
      </div>
    </div>

    <!-- Items grid -->
    <div id="items-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    <div id="empty-state" class="hidden text-center py-16 text-slate-500">
      <i class="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
      <p class="text-lg">\u6682\u65E0\u6570\u636E</p>
      <p class="text-sm mt-1">\u70B9\u51FB\u4E0A\u65B9\u6309\u94AE\u6DFB\u52A0\u4F60\u7684\u7B2C\u4E00\u4E2A eSIM \u5361\u6216\u8BA2\u9605</p>
    </div>
  </div>

  <!-- ========== MODAL ========== -->
  <div id="modal-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto fade-in">
      <div class="flex justify-between items-center mb-6">
        <h3 id="modal-title" class="text-xl font-bold text-white">\u6DFB\u52A0</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="item-form" onsubmit="saveItem(event)">
        <input type="hidden" id="form-id">
        <input type="hidden" id="form-type">

        <div class="space-y-4">
          <!-- Name -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u540D\u79F0 *</label>
            <input id="form-name" type="text" required placeholder="\u5982: T-Mobile eSIM / Netflix"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Number (eSIM only) -->
          <div id="field-number" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u53F7\u7801</label>
            <input id="form-number" type="text" placeholder="+8613800138000"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Category (subscription only) -->
          <div id="field-category" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u5206\u7C7B</label>
            <select id="form-category" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">\u672A\u5206\u7C7B</option>
              <option value="VPN">VPN</option>
              <option value="Cloud">\u4E91\u670D\u52A1</option>
              <option value="Streaming">\u6D41\u5A92\u4F53</option>
              <option value="Domain">\u57DF\u540D/SSL</option>
              <option value="VPS">VPS/\u670D\u52A1\u5668</option>
              <option value="Software">\u8F6F\u4EF6\u8BA2\u9605</option>
              <option value="Other">\u5176\u4ED6</option>
            </select>
          </div>

          <!-- Expire Date -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5230\u671F\u65E5\u671F *</label>
            <input id="form-expire" type="date" required
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Cycle -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u4FDD\u53F7/\u7EED\u8D39\u5468\u671F (\u5929)</label>
            <input id="form-cycle" type="number" min="1" placeholder="\u5982: 180"
              class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>

          <!-- Price & Currency (subscription only) -->
          <div id="field-price" class="hidden grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-slate-400 mb-1 block">\u8D39\u7528</label>
              <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99"
                class="glass-input w-full px-4 py-3 rounded-xl text-sm">
            </div>
            <div>
              <label class="text-sm text-slate-400 mb-1 block">\u8D27\u5E01</label>
              <select id="form-currency" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                <option value="CNY">CNY \xA5</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR \u20AC</option>
                <option value="GBP">GBP \xA3</option>
                <option value="JPY">JPY \xA5</option>
                <option value="HKD">HKD $</option>
              </select>
            </div>
          </div>

          <!-- Remark -->
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5907\u6CE8</label>
            <textarea id="form-remark" rows="2" placeholder="\u53EF\u9009\u5907\u6CE8..."
              class="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white">
            <i class="fa-solid fa-check mr-1"></i> \u4FDD\u5B58
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">
            \u53D6\u6D88
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
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u53D1\u9001\u4E2D...';
  const data = await api('POST', '/api/auth/send');
  if (data.success) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> \u5DF2\u53D1\u9001\uFF0C\u8BF7\u67E5\u770B TG';
    btn.classList.add('text-green-400');
    showLoginMsg('');
  } else {
    showLoginMsg(data.message || '\u53D1\u9001\u5931\u8D25');
    btn.innerHTML = '<i class="fa-brands fa-telegram"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801';
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-brands fa-telegram"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801';
    btn.classList.remove('text-green-400');
  }, 5000);
}

async function verifyOTP() {
  const code = document.getElementById('otp-input').value.trim();
  if (!code || code.length !== 6) return showLoginMsg('\u8BF7\u8F93\u5165 6 \u4F4D\u9A8C\u8BC1\u7801');
  const data = await api('POST', '/api/auth/verify', { code });
  if (data.success) {
    TOKEN = data.token;
    localStorage.setItem('token', TOKEN);
    enterDashboard();
  } else {
    showLoginMsg(data.message || '\u9A8C\u8BC1\u5931\u8D25');
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
  document.getElementById('today-display').textContent = '\u4ECA\u65E5: ' + new Date().toLocaleDateString('zh-CN');
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
    { label: 'eSIM \u5361', value: esims.length, icon: 'fa-sim-card', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: '\u8BA2\u9605\u670D\u52A1', value: subs.length, icon: 'fa-credit-card', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: '\u5373\u5C06\u5230\u671F', value: urgentCount, icon: 'fa-clock', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: '\u6708\u5EA6\u652F\u51FA', value: '\xA5' + monthlyCost.toFixed(0), icon: 'fa-coins', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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
  let statusText = '\u6B63\u5E38';
  if (diff !== null) {
    if (diff < 0) { statusClass = 'status-expired'; statusText = '\u5DF2\u8FC7\u671F ' + Math.abs(diff) + ' \u5929'; }
    else if (diff === 0) { statusClass = 'status-danger'; statusText = '\u4ECA\u5929\u5230\u671F'; }
    else if (diff <= 15) { statusClass = 'status-warning'; statusText = '\u5269\u4F59 ' + diff + ' \u5929'; }
    else { statusText = '\u5269\u4F59 ' + diff + ' \u5929'; }
  }

  const isEsim = item.type === 'esim';
  const typeIcon = isEsim ? 'fa-sim-card' : 'fa-credit-card';
  const typeColor = isEsim ? 'text-cyan-400' : 'text-violet-400';
  const typeBg = isEsim ? 'bg-cyan-500/10' : 'bg-violet-500/10';
  const typeLabel = isEsim ? 'eSIM' : (item.category || '\u8BA2\u9605');

  // Flag for eSIM
  let flag = '';
  if (isEsim && item.number) {
    const m = item.number.match(/^\\+?(\\d{1,3})/);
    if (m) {
      const flags = {'1':'\u{1F1FA}\u{1F1F8}','7':'\u{1F1F7}\u{1F1FA}','20':'\u{1F1EA}\u{1F1EC}','33':'\u{1F1EB}\u{1F1F7}','34':'\u{1F1EA}\u{1F1F8}','39':'\u{1F1EE}\u{1F1F9}','44':'\u{1F1EC}\u{1F1E7}','49':'\u{1F1E9}\u{1F1EA}','52':'\u{1F1F2}\u{1F1FD}','55':'\u{1F1E7}\u{1F1F7}','60':'\u{1F1F2}\u{1F1FE}','61':'\u{1F1E6}\u{1F1FA}','62':'\u{1F1EE}\u{1F1E9}','63':'\u{1F1F5}\u{1F1ED}','65':'\u{1F1F8}\u{1F1EC}','66':'\u{1F1F9}\u{1F1ED}','81':'\u{1F1EF}\u{1F1F5}','82':'\u{1F1F0}\u{1F1F7}','84':'\u{1F1FB}\u{1F1F3}','86':'\u{1F1E8}\u{1F1F3}','90':'\u{1F1F9}\u{1F1F7}','91':'\u{1F1EE}\u{1F1F3}','852':'\u{1F1ED}\u{1F1F0}','853':'\u{1F1F2}\u{1F1F4}','886':'\u{1F1F9}\u{1F1FC}'};
      flag = flags[m[1]] || '\u{1F30D}';
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

  const cycleStr = item.cycle ? item.cycle + '\u5929' : '';
  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem(\\'' + item.id + '\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-colors" title="\u4E00\u952E\u7EED\u671F"><i class="fa-solid fa-rotate"></i> \u7EED\u671F</button>' : '';

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
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>\u5230\u671F: ' + item.expireDate + '</div>' : '') +
    (cycleStr ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>\u5468\u671F: ' + cycleStr + '</div>' : '') +
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
  document.getElementById('modal-title').textContent = (item ? '\u7F16\u8F91' : '\u6DFB\u52A0') + (type === 'esim' ? ' eSIM' : ' \u8BA2\u9605');

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
    alert(data.message || '\u4FDD\u5B58\u5931\u8D25');
  }
}

// ==================== ACTIONS ====================
function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (item) openModal(item.type, item);
}

async function deleteItem(id) {
  if (!confirm('\u786E\u5B9A\u5220\u9664\u6B64\u8BB0\u5F55\uFF1F')) return;
  const data = await api('DELETE', '/api/items/' + id);
  if (data.success) await loadItems();
}

async function renewItem(id) {
  const data = await api('POST', '/api/items/' + id + '/renew');
  if (data.success) {
    await loadItems();
  } else {
    alert(data.message || '\u7EED\u671F\u5931\u8D25');
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
<\/script>
</body>
</html>`;
}

// src/router.js
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    return corsPreFlight();
  }
  if (path.startsWith("/api/auth")) {
    const result = await handleAuth(request, env, path);
    if (result)
      return result;
  }
  if (path.startsWith("/api/items")) {
    const result = await handleItems(request, env, path);
    if (result)
      return result;
  }
  if (!path.startsWith("/api/")) {
    return htmlResponse(getHTML());
  }
  return errorResponse("Not Found", 404);
}

// src/services/telegram.js
async function sendTelegram(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
  return res.ok;
}

// src/services/reminder.js
async function checkReminders(env) {
  let tgToken = env.TG_BOT_TOKEN;
  let tgChat = env.TG_CHAT_ID;
  try {
    if (!tgToken)
      tgToken = await getConfig(env.DB, "TG_BOT_TOKEN");
    if (!tgChat)
      tgChat = await getConfig(env.DB, "TG_CHAT_ID");
  } catch {
  }
  const items = await getAllItems(env.DB);
  if (!items.length)
    return;
  const today = todayMidnight();
  const messages = [];
  for (const item of items) {
    if (item.status !== "active")
      continue;
    if (!item.expireDate)
      continue;
    const expDate = /* @__PURE__ */ new Date(item.expireDate + "T00:00:00Z");
    expDate.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / 864e5);
    const cycleText = item.cycle ? `${item.cycle}\u5929` : "\u672A\u8BBE\u7F6E";
    const remarkText = item.remark ? `
\u{1F4DD} \u5907\u6CE8: ${item.remark}` : "";
    const typeLabel = item.type === "esim" ? "eSIM \u4FDD\u53F7" : "\u8BA2\u9605\u7EED\u8D39";
    const typeEmoji = item.type === "esim" ? "\u{1F4F1}" : "\u{1F4E6}";
    if (diffDays > 0 && diffDays <= 15) {
      messages.push(
        `\u26A0\uFE0F \u3010${typeLabel}\u63D0\u9192\u3011
${typeEmoji} \u540D\u79F0: ${item.name}
` + (item.number ? `\u{1F4DE} \u53F7\u7801: ${item.number}
` : "") + `\u{1F504} \u5468\u671F: ${cycleText}
\u{1F4C5} \u5230\u671F: ${item.expireDate}
\u23F3 \u5269\u4F59: ${diffDays} \u5929\uFF01${remarkText}
\u{1F449} \u8BF7\u5C3D\u5FEB\u5904\u7406\uFF01`
      );
    }
    if (diffDays === 0) {
      messages.push(
        `\u{1F6A8} \u3010${typeLabel}\u7D27\u6025\u63D0\u9192\u3011
${typeEmoji} ${item.name} \u4ECA\u5929\u5230\u671F\uFF01${remarkText}`
      );
    }
    if (diffDays < 0 && Math.abs(diffDays) % 7 === 0) {
      messages.push(
        `\u274C \u3010${typeLabel}\u505C\u673A\u8B66\u544A\u3011
${typeEmoji} ${item.name} \u5DF2\u8FC7\u671F ${Math.abs(diffDays)} \u5929\u3002${remarkText}`
      );
    }
  }
  if (messages.length > 0 && tgToken && tgChat) {
    const text = messages.join("\n\n---\n\n");
    await sendTelegram(tgToken, tgChat, text);
  }
}

// src/index.js
var src_default = {
  /**
   * Handle HTTP requests
   */
  async fetch(request, env, ctx) {
    try {
      return await route(request, env);
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ success: false, message: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  /**
   * Handle scheduled (cron) triggers
   * Runs daily to check for expiring items and send reminders
   */
  async scheduled(event, env, ctx) {
    try {
      await checkReminders(env);
    } catch (err) {
      console.error("Cron error:", err);
    }
  }
};
export {
  src_default as default
};
