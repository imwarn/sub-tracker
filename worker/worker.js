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
async function getItemById(db, id) {
  const items = await getAllItems(db);
  return items.find((item) => item.id === id) || null;
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
      `\u73AF\u5883\u7F3A\u5931\uFF1A\u7F3A\u5C11 ${missing.join(" \u548C ")}\u3002\u53EF\u901A\u8FC7\u4EE5\u4E0B\u65B9\u5F0F\u914D\u7F6E\uFF1A
1. Cloudflare Dashboard \u2192 Workers \u2192 Settings \u2192 Variables (\u63A8\u8350)
2. KV \u6570\u636E\u5E93\u4E2D\u624B\u52A8\u6DFB\u52A0\u8FD9\u4E24\u4E2A\u952E\u503C\u5BF9`,
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
    region: data.region || "",
    subId: data.subId || "",
    price: data.price || null,
    billing: data.billing || "monthly",
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
    for (const key of ["category", "region", "subId", "price", "billing", "currency", "autoRenew", "remindDays", "url"]) {
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
function daysUntil(expireDate) {
  const today = todayMidnight();
  const exp = /* @__PURE__ */ new Date(expireDate + "T00:00:00Z");
  return Math.ceil((exp - today) / 864e5);
}
function addDays(dateStr, days) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}
function getStatusText(days) {
  if (days < 0)
    return `\u5DF2\u8FC7\u671F ${Math.abs(days)} \u5929`;
  if (days === 0)
    return "\u4ECA\u5929\u5230\u671F";
  return `\u5269\u4F59 ${days} \u5929`;
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

// src/handlers/items.js
async function handleItems(request, env, path) {
  if (request.method === "OPTIONS")
    return corsPreFlight();
  const authErr = await requireAuth(request, env);
  if (authErr)
    return authErr;
  if (path === "/api/items/export/json" && request.method === "GET") {
    return await exportJSON(env);
  }
  if (path === "/api/items/export/csv" && request.method === "GET") {
    return await exportCSV(env);
  }
  if (path === "/api/items/import/json" && request.method === "POST") {
    return await importJSON(request, env);
  }
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
    if (request.method === "POST" && action === "/test-notify") {
      return await testNotify(env, id);
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
async function exportJSON(env) {
  const items = await getAllItems(env.DB);
  const exportData = {
    version: "1.0.0",
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    count: items.length,
    items: items.map(({ id, createdAt, ...rest }) => rest)
    // strip id/createdAt for clean import
  };
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=sub-tracker-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`
    }
  });
}
async function exportCSV(env) {
  const items = await getAllItems(env.DB);
  const headers = ["\u7C7B\u578B", "\u540D\u79F0", "\u53F7\u7801", "\u5206\u7C7B", "\u5230\u671F\u65E5\u671F", "\u5468\u671F(\u5929)", "\u8D39\u7528", "\u8D27\u5E01", "\u81EA\u52A8\u7EED\u8D39", "\u72B6\u6001", "\u5907\u6CE8"];
  const rows = items.map((item) => {
    const typeLabel = item.type === "esim" ? "eSIM" : "\u8BA2\u9605";
    return [
      typeLabel,
      csvEscape(item.name),
      csvEscape(item.number || ""),
      csvEscape(item.category || ""),
      item.expireDate || "",
      item.cycle || "",
      item.price || "",
      item.currency || "CNY",
      item.autoRenew ? "\u662F" : "\u5426",
      item.status === "active" ? "\u542F\u7528" : "\u505C\u7528",
      csvEscape(item.remark || "")
    ].join(",");
  });
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=sub-tracker-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`
    }
  });
}
function csvEscape(s) {
  if (!s)
    return "";
  s = String(s);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
async function importJSON(request, env) {
  try {
    const body = await request.json();
    const importedItems = body.items || body;
    if (!Array.isArray(importedItems)) {
      return errorResponse("\u6570\u636E\u683C\u5F0F\u9519\u8BEF\uFF1A\u9700\u8981 items \u6570\u7EC4");
    }
    const existing = await getAllItems(env.DB);
    let added = 0;
    for (const raw of importedItems) {
      const type = raw.type || "esim";
      if (!["esim", "subscription"].includes(type))
        continue;
      const item = createItem(type, raw);
      existing.push(item);
      added++;
    }
    await saveAllItems(env.DB, existing);
    return successResponse({ added, total: existing.length });
  } catch {
    return errorResponse("\u5BFC\u5165\u5931\u8D25\uFF1AJSON \u89E3\u6790\u9519\u8BEF", 400);
  }
}
async function testNotify(env, id) {
  const item = await getItemById(env.DB, id);
  if (!item)
    return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404);
  let tgToken = env.TG_BOT_TOKEN;
  let tgChat = env.TG_CHAT_ID;
  try {
    if (!tgToken)
      tgToken = await getConfig(env.DB, "TG_BOT_TOKEN");
    if (!tgChat)
      tgChat = await getConfig(env.DB, "TG_CHAT_ID");
  } catch {
  }
  if (!tgToken || !tgChat) {
    const missing = [];
    if (!tgToken)
      missing.push("TG_BOT_TOKEN");
    if (!tgChat)
      missing.push("TG_CHAT_ID");
    return errorResponse(`TG \u5BC6\u94A5\u672A\u914D\u7F6E: \u7F3A\u5C11 ${missing.join(", ")}\u3002\u8BF7\u5728 Workers \u2192 Settings \u2192 Variables \u4E2D\u6DFB\u52A0`);
  }
  const diff = daysUntil(item.expireDate);
  const statusText = getStatusText(diff);
  const emoji = diff <= 0 ? "\u{1F6A8}" : diff <= 15 ? "\u26A0\uFE0F" : "\u{1F4E2}";
  const typeLabel = item.type === "esim" ? "eSIM \u4FDD\u53F7" : "\u8BA2\u9605\u7EED\u8D39";
  const msg = [
    `${emoji} <b>\u3010${typeLabel} \xB7 \u6D4B\u8BD5\u901A\u77E5\u3011</b>`,
    "",
    `\u{1F4E6} \u540D\u79F0: ${item.name}`,
    item.number ? `\u{1F4DE} \u53F7\u7801: ${item.number}` : "",
    item.category ? `\u{1F3F7}\uFE0F \u5206\u7C7B: ${item.category}` : "",
    `\u{1F4C5} \u5230\u671F: ${item.expireDate}`,
    `\u23F3 \u72B6\u6001: ${statusText}`,
    item.remark ? `\u{1F4DD} \u5907\u6CE8: ${item.remark}` : "",
    "",
    "<i>\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u901A\u77E5\uFF0C\u786E\u8BA4\u901A\u77E5\u529F\u80FD\u6B63\u5E38\u3002</i>"
  ].filter(Boolean).join("\n");
  const ok = await sendTelegram(tgToken, tgChat, msg);
  if (ok)
    return successResponse();
  return errorResponse("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 TG \u914D\u7F6E");
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
      <div class="flex items-center gap-2 flex-wrap justify-center">
        <span class="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full" id="today-display"></span>
        <button onclick="openModal('esim')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> \u8BA2\u9605
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
          <i class="fa-solid fa-globe mr-1"></i>\u5168\u90E8
        </button>
        <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-sim-card mr-1"></i>eSIM
        </button>
        <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-credit-card mr-1"></i>\u8BA2\u9605
        </button>
      </div>
      <div class="flex gap-1 glass rounded-lg p-1">
        <button onclick="setView('grid')" data-view="grid" class="view-tab tab-active px-3 py-1.5 rounded-md text-xs transition-all" title="\u5361\u7247\u89C6\u56FE">
          <i class="fa-solid fa-grip"></i>
        </button>
        <button onclick="setView('list')" data-view="list" class="view-tab px-3 py-1.5 rounded-md text-xs transition-all text-slate-400" title="\u5217\u8868\u89C6\u56FE">
          <i class="fa-solid fa-list"></i>
        </button>
        <button onclick="setView('calendar')" data-view="calendar" class="view-tab px-3 py-1.5 rounded-md text-xs transition-all text-slate-400" title="\u65E5\u5386\u89C6\u56FE">
          <i class="fa-solid fa-calendar"></i>
        </button>
      </div>
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

    <!-- Content area -->
    <div id="content-area"></div>
    <div id="empty-state" class="hidden text-center py-16 text-slate-500">
      <i class="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
      <p class="text-lg mb-1">\u6682\u65E0\u6570\u636E</p>
      <p class="text-sm mb-6">\u6DFB\u52A0\u4F60\u7684\u7B2C\u4E00\u4E2A eSIM \u5361\u6216\u8BA2\u9605\u670D\u52A1</p>
      <div class="flex gap-3 justify-center">
        <button onclick="openModal('esim')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> \u6DFB\u52A0 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> \u6DFB\u52A0\u8BA2\u9605
        </button>
      </div>
    </div>
  </div>

  <!-- ========== MODAL ========== -->
  <div id="modal-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4" onclick="if(event.target===this)closeModal()">
    <div class="glass rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto fade-in">
      <div class="flex justify-between items-center mb-6">
        <h3 id="modal-title" class="text-xl font-bold text-white">\u6DFB\u52A0</h3>
        <button onclick="closeModal()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="item-form" onsubmit="saveItem(event)">
        <input type="hidden" id="form-id">
        <input type="hidden" id="form-type">
        <div class="space-y-4">
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u540D\u79F0 *</label>
            <input id="form-name" type="text" required placeholder="\u5982: T-Mobile eSIM / Netflix" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div id="field-number" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u53F7\u7801</label>
            <input id="form-number" type="text" placeholder="+8613800138000" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div id="field-category" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u5206\u7C7B</label>
            <select id="form-category" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">\u672A\u5206\u7C7B</option>
              <option value="AI">AI \u670D\u52A1</option>
              <option value="VPN">VPN</option>
              <option value="Cloud">\u4E91\u670D\u52A1</option>
              <option value="Streaming">\u6D41\u5A92\u4F53</option>
              <option value="Domain">\u57DF\u540D/SSL</option>
              <option value="VPS">VPS/\u670D\u52A1\u5668</option>
              <option value="Software">\u8F6F\u4EF6\u8BA2\u9605</option>
              <option value="Game">\u6E38\u620F</option>
              <option value="Other">\u5176\u4ED6</option>
            </select>
          </div>
          <div id="field-region" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u8D26\u53F7\u533A\u57DF</label>
            <select id="form-region" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="">\u672A\u8BBE\u7F6E</option>
              <option value="CN">\u{1F1E8}\u{1F1F3} \u5927\u9646</option>
              <option value="HK">\u{1F1ED}\u{1F1F0} \u9999\u6E2F</option>
              <option value="TW">\u{1F1F9}\u{1F1FC} \u53F0\u6E7E</option>
              <option value="US">\u{1F1FA}\u{1F1F8} \u7F8E\u533A</option>
              <option value="JP">\u{1F1EF}\u{1F1F5} \u65E5\u533A</option>
              <option value="KR">\u{1F1F0}\u{1F1F7} \u97E9\u533A</option>
              <option value="TR">\u{1F1F9}\u{1F1F7} \u571F\u8033\u5176</option>
              <option value="NG">\u{1F1F3}\u{1F1EC} \u5C3C\u65E5\u5229\u4E9A</option>
              <option value="IN">\u{1F1EE}\u{1F1F3} \u5370\u5EA6</option>
              <option value="BR">\u{1F1E7}\u{1F1F7} \u5DF4\u897F</option>
              <option value="AR">\u{1F1E6}\u{1F1F7} \u963F\u6839\u5EF7</option>
              <option value="PH">\u{1F1F5}\u{1F1ED} \u83F2\u5F8B\u5BBE</option>
              <option value="MY">\u{1F1F2}\u{1F1FE} \u9A6C\u6765\u897F\u4E9A</option>
              <option value="SG">\u{1F1F8}\u{1F1EC} \u65B0\u52A0\u5761</option>
              <option value="EU">\u{1F1EA}\u{1F1FA} \u6B27\u6D32</option>
              <option value="OTHER">\u{1F30D} \u5176\u4ED6</option>
            </select>
          </div>
          <div id="field-sub-id" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u8BA2\u9605 ID / \u8D26\u53F7</label>
            <input id="form-sub-id" type="text" placeholder="\u8D26\u53F7\u90AE\u7BB1\u6216\u8BA2\u9605ID" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5230\u671F\u65E5\u671F *</label>
            <input id="form-expire" type="date" required min="2020-01-01" max="2035-12-31" class="glass-input w-full px-4 py-3 rounded-xl text-sm" lang="zh-CN">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u4FDD\u53F7/\u7EED\u8D39\u5468\u671F (\u5929)</label>
            <input id="form-cycle" type="number" min="1" placeholder="\u5982: 180" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-2 block">\u63D0\u9192\u65F6\u95F4\uFF08\u53EF\u591A\u9009\uFF09</label>
            <div class="flex flex-wrap gap-2" id="remind-checkboxes">
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="30" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">30\u5929\u524D</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="15" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">15\u5929\u524D</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="7" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">7\u5929\u524D</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="3" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">3\u5929\u524D</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="1" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">1\u5929\u524D</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" value="0" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">\u5F53\u5929</span>
              </label>
            </div>
          </div>
          <div id="field-price" class="hidden">
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u8D39\u7528</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u8D27\u5E01</label>
                <select id="form-currency" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                  <option value="CNY">\u{1F1E8}\u{1F1F3} CNY \xA5</option>
                  <option value="USD">\u{1F1FA}\u{1F1F8} USD $</option>
                  <option value="EUR">\u{1F1EA}\u{1F1FA} EUR \u20AC</option>
                  <option value="GBP">\u{1F1EC}\u{1F1E7} GBP \xA3</option>
                  <option value="JPY">\u{1F1EF}\u{1F1F5} JPY \xA5</option>
                  <option value="HKD">\u{1F1ED}\u{1F1F0} HKD $</option>
                  <option value="TWD">\u{1F1F9}\u{1F1FC} TWD $</option>
                  <option value="KRW">\u{1F1F0}\u{1F1F7} KRW \u20A9</option>
                  <option value="TRY">\u{1F1F9}\u{1F1F7} TRY \u20BA</option>
                  <option value="THB">\u{1F1F9}\u{1F1ED} THB \u0E3F</option>
                  <option value="NGN">\u{1F1F3}\u{1F1EC} NGN \u20A6</option>
                  <option value="INR">\u{1F1EE}\u{1F1F3} INR \u20B9</option>
                  <option value="PHP">\u{1F1F5}\u{1F1ED} PHP \u20B1</option>
                  <option value="MYR">\u{1F1F2}\u{1F1FE} MYR RM</option>
                  <option value="SGD">\u{1F1F8}\u{1F1EC} SGD $</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u8BA1\u8D39\u5468\u671F</label>
                <select id="form-billing" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
                  <option value="monthly">\u6708\u4ED8</option>
                  <option value="yearly">\u5E74\u4ED8</option>
                  <option value="once">\u4E00\u6B21\u6027</option>
                </select>
              </div>
            </div>
          </div>
          <div id="field-url" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u670D\u52A1\u94FE\u63A5</label>
            <input id="form-url" type="url" placeholder="https://..." class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5907\u6CE8</label>
            <textarea id="form-remark" rows="2" placeholder="\u53EF\u9009\u5907\u6CE8..." class="glass-input w-full px-4 py-3 rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>\u4FDD\u5B58</button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u53D6\u6D88</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========== DROPDOWN (body level, escapes all stacking contexts) ========== -->
  <div id="dropdown-menu" class="hidden fixed glass rounded-xl p-2 min-w-[160px]" style="z-index:99999">
    <button onclick="exportJSON()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-download mr-2 text-emerald-400"></i>\u5BFC\u51FA JSON
    </button>
    <button onclick="exportCSV()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-file-csv mr-2 text-emerald-400"></i>\u5BFC\u51FA CSV
    </button>
    <button onclick="document.getElementById('import-file').click()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-upload mr-2 text-amber-400"></i>\u5BFC\u5165 JSON
    </button>
    <input type="file" id="import-file" accept=".json" class="hidden" onchange="importJSON(this)">
    <hr class="border-white/10 my-1">
    <button onclick="logout()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-right-from-bracket mr-2"></i>\u9000\u51FA\u767B\u5F55
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
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u53D1\u9001\u4E2D...';
  const res = await api('POST', '/api/auth/send');
  const data = await res.json();
  if (data.success) { btn.innerHTML = '<i class="fa-solid fa-check"></i> \u5DF2\u53D1\u9001'; btn.classList.add('text-green-400'); showLoginMsg(''); }
  else { showLoginMsg(data.message || '\u53D1\u9001\u5931\u8D25'); btn.innerHTML = '<i class="fa-brands fa-telegram"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801'; }
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-brands fa-telegram"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801'; btn.classList.remove('text-green-400'); }, 5000);
}

async function verifyOTP() {
  const code = document.getElementById('otp-input').value.trim();
  if (!code || code.length !== 6) return showLoginMsg('\u8BF7\u8F93\u5165 6 \u4F4D\u9A8C\u8BC1\u7801');
  const res = await api('POST', '/api/auth/verify', { code });
  const data = await res.json();
  if (data.success) { TOKEN = data.token; localStorage.setItem('token', TOKEN); enterDashboard(); }
  else showLoginMsg(data.message || '\u9A8C\u8BC1\u5931\u8D25');
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
    { label:'\u8BA2\u9605', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10' },
    { label:'\u5373\u5C06\u5230\u671F', value:urgentCount, icon:'fa-clock', color:'text-amber-400', bg:'bg-amber-500/10' },
    { label:'\u6708\u5EA6\u652F\u51FA', value:sym+monthlyCost.toFixed(0), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
    { label:'\u5E74\u5EA6\u9884\u7B97', value:sym+yearlyCost.toFixed(0), icon:'fa-chart-pie', color:'text-rose-400', bg:'bg-rose-500/10' },
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
  const tl = isEsim ? 'eSIM' : (item.category||'\u8BA2\u9605');

  let body = '';
  if (isEsim) {
    const flag = getFlag(item.number);
    body = (flag ? '<div class="text-2xl mb-2">'+flag+'</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">'+esc(item.number)+'</div>' : '');
  } else {
    const ps = item.price ? (item.billing==='yearly' ? currSym(item.currency)+item.price+'/\u5E74' : item.billing==='once' ? currSym(item.currency)+item.price+'(\u4E00\u6B21\u6027)' : currSym(item.currency)+item.price+'/\u6708') : '';
    const regionFlags = {'CN':'\u{1F1E8}\u{1F1F3}','HK':'\u{1F1ED}\u{1F1F0}','TW':'\u{1F1F9}\u{1F1FC}','US':'\u{1F1FA}\u{1F1F8}','JP':'\u{1F1EF}\u{1F1F5}','KR':'\u{1F1F0}\u{1F1F7}','TR':'\u{1F1F9}\u{1F1F7}','NG':'\u{1F1F3}\u{1F1EC}','IN':'\u{1F1EE}\u{1F1F3}','BR':'\u{1F1E7}\u{1F1F7}','AR':'\u{1F1E6}\u{1F1F7}','PH':'\u{1F1F5}\u{1F1ED}','MY':'\u{1F1F2}\u{1F1FE}','SG':'\u{1F1F8}\u{1F1EC}','EU':'\u{1F1EA}\u{1F1FA}'};
    const regionStr = item.region ? (regionFlags[item.region]||'\u{1F30D}')+' '+item.region : '';
    const catStr = item.category ? esc(item.category) : '';
    const metaLine = [catStr, regionStr].filter(Boolean).join(' \xB7 ');
    body = (metaLine ? '<div class="text-xs text-slate-400 mb-1">'+metaLine+'</div>' : '') +
      (ps ? '<div class="text-sm text-emerald-400 font-semibold">'+esc(ps)+'</div>' : '') +
      (item.subId ? '<div class="text-xs text-slate-500 mt-1 truncate"><i class="fa-solid fa-id-card mr-1"></i>'+esc(item.subId)+'</div>' : '');
    if (item.url) body += '<a href="'+esc(item.url)+'" target="_blank" class="text-xs text-sky-400 hover:underline mt-1 inline-block"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>\u8BBF\u95EE</a>';
  }

  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-sky-500/10 transition-colors"><i class="fa-solid fa-rotate"></i> \u7EED\u671F</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">' +
    '<div class="'+tb+' w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid '+ti+' '+tc+' text-sm"></i></div>' +
    '<span class="text-xs '+tc+' opacity-70">'+esc(tl)+'</span></div>' +
    '<span class="text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'\u5DF2\u6682\u505C':st.text)+'</span></div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">'+esc(item.name)+'</h3>' +
    body +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>\u5230\u671F: '+item.expireDate+'</div>' : '') +
    (item.cycle ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>\u5468\u671F: '+item.cycle+'\u5929</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>'+esc(item.remark)+'</div>' : '') +
    '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">' +
    renewBtn +
    '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs px-2 py-1 rounded-lg transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'\u542F\u7528':'\u6682\u505C')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
    '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors" title="\u6D4B\u8BD5\u901A\u77E5"><i class="fa-solid fa-bell"></i></button>' +
    '<button onclick="editItem(\\''+item.id+'\\')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
    '<button onclick="deleteItem(\\''+item.id+'\\')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
    '</div></div>';
}

// -- List view --
function renderList(items, area) {
  let html = '<div class="glass rounded-xl overflow-hidden">';
  html += '<div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-400 border-b border-white/10 bg-white/5">' +
    '<div class="col-span-4">\u540D\u79F0</div><div class="col-span-2 hidden sm:block">\u7C7B\u578B/\u53F7\u7801</div>' +
    '<div class="col-span-2">\u5230\u671F</div><div class="col-span-2 hidden sm:block">\u72B6\u6001</div>' +
    '<div class="col-span-2 text-right">\u64CD\u4F5C</div></div>';
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
  const priceStr = !isEsim && item.price ? ' \xB7 '+currSym(item.currency)+item.price : '';

  return '<div class="list-row grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5">' +
    '<div class="col-span-4 flex items-center gap-2 min-w-0">' +
      '<i class="fa-solid '+(isEsim?'fa-sim-card text-cyan-400':'fa-credit-card text-violet-400')+' text-sm flex-shrink-0"></i>' +
      '<span class="truncate text-sm font-medium text-white">'+esc(item.name)+priceStr+'</span></div>' +
    '<div class="col-span-2 hidden sm:block text-xs text-slate-400 truncate">'+flag+esc(sub)+'</div>' +
    '<div class="col-span-2 text-xs text-slate-300">'+(item.expireDate||'-')+'</div>' +
    '<div class="col-span-2 hidden sm:block text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'\u5DF2\u6682\u505C':st.text)+'</div>' +
    '<div class="col-span-2 flex justify-end gap-1">' +
      (isEsim && item.cycle ? '<button onclick="renewItem(\\''+item.id+'\\')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="\u7EED\u671F"><i class="fa-solid fa-rotate"></i></button>' : '') +
      '<button onclick="toggleStatus(\\''+item.id+'\\')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'\u542F\u7528':'\u6682\u505C')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
      '<button onclick="testNotify(\\''+item.id+'\\')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="\u6D4B\u8BD5\u901A\u77E5"><i class="fa-solid fa-bell"></i></button>' +
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

  const monthName = calYear + '\u5E74' + (calMonth+1) + '\u6708';
  const weekDays = ['\u65E5','\u4E00','\u4E8C','\u4E09','\u56DB','\u4E94','\u516D'];

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
  if (diff === null) return { cls:'text-slate-400', text:'\u672A\u8BBE\u7F6E' };
  if (diff < 0) return { cls:'status-expired', text:'\u5DF2\u8FC7\u671F '+Math.abs(diff)+'\u5929' };
  if (diff === 0) return { cls:'status-danger', text:'\u4ECA\u5929\u5230\u671F' };
  if (diff <= 15) return { cls:'status-warning', text:'\u5269\u4F59 '+diff+'\u5929' };
  return { cls:'status-active', text:'\u5269\u4F59 '+diff+'\u5929' };
}

const FLAG_MAP = {'1':'\u{1F1FA}\u{1F1F8}','7':'\u{1F1F7}\u{1F1FA}','20':'\u{1F1EA}\u{1F1EC}','27':'\u{1F1FF}\u{1F1E6}','30':'\u{1F1EC}\u{1F1F7}','31':'\u{1F1F3}\u{1F1F1}','32':'\u{1F1E7}\u{1F1EA}','33':'\u{1F1EB}\u{1F1F7}','34':'\u{1F1EA}\u{1F1F8}','36':'\u{1F1ED}\u{1F1FA}','39':'\u{1F1EE}\u{1F1F9}','40':'\u{1F1F7}\u{1F1F4}','41':'\u{1F1E8}\u{1F1ED}','43':'\u{1F1E6}\u{1F1F9}','44':'\u{1F1EC}\u{1F1E7}','45':'\u{1F1E9}\u{1F1F0}','46':'\u{1F1F8}\u{1F1EA}','47':'\u{1F1F3}\u{1F1F4}','48':'\u{1F1F5}\u{1F1F1}','49':'\u{1F1E9}\u{1F1EA}','51':'\u{1F1F5}\u{1F1EA}','52':'\u{1F1F2}\u{1F1FD}','53':'\u{1F1E8}\u{1F1FA}','54':'\u{1F1E6}\u{1F1F7}','55':'\u{1F1E7}\u{1F1F7}','56':'\u{1F1E8}\u{1F1F1}','57':'\u{1F1E8}\u{1F1F4}','58':'\u{1F1FB}\u{1F1EA}','60':'\u{1F1F2}\u{1F1FE}','61':'\u{1F1E6}\u{1F1FA}','62':'\u{1F1EE}\u{1F1E9}','63':'\u{1F1F5}\u{1F1ED}','64':'\u{1F1F3}\u{1F1FF}','65':'\u{1F1F8}\u{1F1EC}','66':'\u{1F1F9}\u{1F1ED}','81':'\u{1F1EF}\u{1F1F5}','82':'\u{1F1F0}\u{1F1F7}','84':'\u{1F1FB}\u{1F1F3}','86':'\u{1F1E8}\u{1F1F3}','90':'\u{1F1F9}\u{1F1F7}','91':'\u{1F1EE}\u{1F1F3}','92':'\u{1F1F5}\u{1F1F0}','93':'\u{1F1E6}\u{1F1EB}','94':'\u{1F1F1}\u{1F1F0}','95':'\u{1F1F2}\u{1F1F2}','98':'\u{1F1EE}\u{1F1F7}','212':'\u{1F1F2}\u{1F1E6}','213':'\u{1F1E9}\u{1F1FF}','216':'\u{1F1F9}\u{1F1F3}','218':'\u{1F1F1}\u{1F1FE}','220':'\u{1F1EC}\u{1F1F2}','221':'\u{1F1F8}\u{1F1F3}','223':'\u{1F1F2}\u{1F1F1}','224':'\u{1F1EC}\u{1F1F3}','225':'\u{1F1E8}\u{1F1EE}','226':'\u{1F1E7}\u{1F1EB}','227':'\u{1F1F3}\u{1F1EA}','228':'\u{1F1F9}\u{1F1EC}','229':'\u{1F1E7}\u{1F1EF}','230':'\u{1F1F2}\u{1F1FA}','231':'\u{1F1F1}\u{1F1F7}','233':'\u{1F1EC}\u{1F1ED}','234':'\u{1F1F3}\u{1F1EC}','235':'\u{1F1F9}\u{1F1E9}','237':'\u{1F1E8}\u{1F1F2}','242':'\u{1F1E8}\u{1F1EC}','243':'\u{1F1E8}\u{1F1E9}','244':'\u{1F1E6}\u{1F1F4}','249':'\u{1F1F8}\u{1F1E9}','250':'\u{1F1F7}\u{1F1FC}','251':'\u{1F1EA}\u{1F1F9}','252':'\u{1F1F8}\u{1F1F4}','253':'\u{1F1E9}\u{1F1EF}','254':'\u{1F1F0}\u{1F1EA}','255':'\u{1F1F9}\u{1F1FF}','256':'\u{1F1FA}\u{1F1EC}','257':'\u{1F1E7}\u{1F1EE}','258':'\u{1F1F2}\u{1F1FF}','260':'\u{1F1FF}\u{1F1F2}','261':'\u{1F1F2}\u{1F1EC}','263':'\u{1F1FF}\u{1F1FC}','264':'\u{1F1F3}\u{1F1E6}','265':'\u{1F1F2}\u{1F1FC}','266':'\u{1F1F1}\u{1F1F8}','267':'\u{1F1E7}\u{1F1FC}','268':'\u{1F1F8}\u{1F1FF}','269':'\u{1F1F0}\u{1F1F2}','297':'\u{1F1E6}\u{1F1FC}','299':'\u{1F1EC}\u{1F1F1}','350':'\u{1F1EC}\u{1F1EE}','351':'\u{1F1F5}\u{1F1F9}','352':'\u{1F1F1}\u{1F1FA}','353':'\u{1F1EE}\u{1F1EA}','354':'\u{1F1EE}\u{1F1F8}','355':'\u{1F1E6}\u{1F1F1}','356':'\u{1F1F2}\u{1F1F9}','357':'\u{1F1E8}\u{1F1FE}','358':'\u{1F1EB}\u{1F1EE}','359':'\u{1F1E7}\u{1F1EC}','370':'\u{1F1F1}\u{1F1F9}','371':'\u{1F1F1}\u{1F1FB}','372':'\u{1F1EA}\u{1F1EA}','373':'\u{1F1F2}\u{1F1E9}','374':'\u{1F1E6}\u{1F1F2}','375':'\u{1F1E7}\u{1F1FE}','376':'\u{1F1E6}\u{1F1E9}','377':'\u{1F1F2}\u{1F1E8}','380':'\u{1F1FA}\u{1F1E6}','381':'\u{1F1F7}\u{1F1F8}','382':'\u{1F1F2}\u{1F1EA}','385':'\u{1F1ED}\u{1F1F7}','386':'\u{1F1F8}\u{1F1EE}','387':'\u{1F1E7}\u{1F1E6}','389':'\u{1F1F2}\u{1F1F0}','850':'\u{1F1F0}\u{1F1F5}','852':'\u{1F1ED}\u{1F1F0}','853':'\u{1F1F2}\u{1F1F4}','855':'\u{1F1F0}\u{1F1ED}','856':'\u{1F1F1}\u{1F1E6}','880':'\u{1F1E7}\u{1F1E9}','886':'\u{1F1F9}\u{1F1FC}','960':'\u{1F1F2}\u{1F1FB}','961':'\u{1F1F1}\u{1F1E7}','962':'\u{1F1EF}\u{1F1F4}','964':'\u{1F1EE}\u{1F1F6}','965':'\u{1F1F0}\u{1F1FC}','966':'\u{1F1F8}\u{1F1E6}','967':'\u{1F1FE}\u{1F1EA}','968':'\u{1F1F4}\u{1F1F2}','971':'\u{1F1E6}\u{1F1EA}','972':'\u{1F1EE}\u{1F1F1}','973':'\u{1F1E7}\u{1F1ED}','974':'\u{1F1F6}\u{1F1E6}','975':'\u{1F1E7}\u{1F1F9}','976':'\u{1F1F2}\u{1F1F3}','977':'\u{1F1F3}\u{1F1F5}','992':'\u{1F1F9}\u{1F1EF}','994':'\u{1F1E6}\u{1F1FF}','995':'\u{1F1EC}\u{1F1EA}','996':'\u{1F1F0}\u{1F1EC}','998':'\u{1F1FA}\u{1F1FF}'};
function getFlag(num) {
  if (!num) return '';
  let digits = num.replace(/[^d]/g, '');
  if (digits.startsWith('00')) digits = digits.substring(2);
  for (const len of [3, 2, 1]) {
    if (digits.length >= len) {
      const prefix = digits.substring(0, len);
      if (FLAG_MAP[prefix]) return FLAG_MAP[prefix];
    }
  }
  return '\u{1F30D}';
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

const CURRENCY_SYMBOLS = {'CNY':'\xA5','USD':'$','EUR':'\u20AC','GBP':'\xA3','JPY':'\xA5','HKD':'$','TWD':'$','KRW':'\u20A9','TRY':'\u20BA','THB':'\u0E3F','NGN':'\u20A6','INR':'\u20B9','PHP':'\u20B1','MYR':'RM','SGD':'$'};
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '\xA5'; }

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
  document.getElementById('modal-title').textContent = (item ? '\u7F16\u8F91' : '\u6DFB\u52A0') + (type === 'esim' ? ' eSIM' : ' \u8BA2\u9605');
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
  if (data.success) { closeModal(); await loadItems(); } else alert(data.message || '\u4FDD\u5B58\u5931\u8D25');
}

// ==================== ACTIONS ====================
function editItem(id) { const item = allItems.find(i => i.id === id); if (item) openModal(item.type, item); }

async function deleteItem(id) {
  if (!confirm('\u786E\u5B9A\u5220\u9664\u6B64\u8BB0\u5F55\uFF1F')) return;
  const res = await api('DELETE', '/api/items/'+id);
  const data = await res.json();
  if (data.success) await loadItems();
}

async function renewItem(id) {
  const res = await api('POST', '/api/items/'+id+'/renew');
  const data = await res.json();
  if (data.success) await loadItems(); else alert(data.message || '\u7EED\u671F\u5931\u8D25');
}

async function testNotify(id) {
  const res = await api('POST', '/api/items/'+id+'/test-notify');
  const data = await res.json();
  if (data.success) alert('\u2705 \u6D4B\u8BD5\u901A\u77E5\u5DF2\u53D1\u9001\uFF0C\u8BF7\u68C0\u67E5 Telegram');
  else alert('\u274C ' + (data.message || '\u53D1\u9001\u5931\u8D25'));
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
      alert('\u5BFC\u5165\u6210\u529F\uFF01\u65B0\u589E ' + result.added + ' \u6761\uFF0C\u5171 ' + result.total + ' \u6761');
      await loadItems();
    } else {
      alert(result.message || '\u5BFC\u5165\u5931\u8D25');
    }
  } catch (e) {
    alert('JSON \u89E3\u6790\u5931\u8D25: ' + e.message);
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

// src/services/reminder.js
var DEFAULT_REMIND_DAYS = [3, 1, 0];
var CURRENCY_SYMBOLS = { "CNY": "\xA5", "USD": "$", "EUR": "\u20AC", "GBP": "\xA3", "JPY": "\xA5", "HKD": "$", "TWD": "$", "KRW": "\u20A9", "TRY": "\u20BA", "THB": "\u0E3F", "NGN": "\u20A6", "INR": "\u20B9", "PHP": "\u20B1", "MYR": "RM", "SGD": "$" };
function currSym(code) {
  return CURRENCY_SYMBOLS[code] || code || "\xA5";
}
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
  if (!tgToken || !tgChat)
    return;
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
    const remindDays = Array.isArray(item.remindDays) && item.remindDays.length > 0 ? item.remindDays : DEFAULT_REMIND_DAYS;
    if (!remindDays.includes(diffDays))
      continue;
    const cycleText = item.cycle ? `${item.cycle}\u5929` : "\u672A\u8BBE\u7F6E";
    const remarkText = item.remark ? `
\u{1F4DD} \u5907\u6CE8: ${item.remark}` : "";
    const typeLabel = item.type === "esim" ? "eSIM \u4FDD\u53F7" : "\u8BA2\u9605\u7EED\u8D39";
    const typeEmoji = item.type === "esim" ? "\u{1F4F1}" : "\u{1F4E6}";
    const priceText = item.price ? `
\u{1F4B0} \u8D39\u7528: ${currSym(item.currency)}${item.price}/${item.billing === "yearly" ? "\u5E74" : item.billing === "once" ? "\u6B21" : "\u6708"}` : "";
    let urgency;
    if (diffDays < 0)
      urgency = "\u274C";
    else if (diffDays === 0)
      urgency = "\u{1F6A8}";
    else if (diffDays <= 3)
      urgency = "\u26A0\uFE0F";
    else
      urgency = "\u{1F4E2}";
    const statusText = diffDays < 0 ? `\u5DF2\u8FC7\u671F ${Math.abs(diffDays)} \u5929` : diffDays === 0 ? "\u4ECA\u5929\u5230\u671F\uFF01" : `\u5269\u4F59 ${diffDays} \u5929`;
    messages.push(
      `${urgency} \u3010${typeLabel}\u63D0\u9192\u3011
${typeEmoji} \u540D\u79F0: ${item.name}
` + (item.number ? `\u{1F4DE} \u53F7\u7801: ${item.number}
` : "") + priceText + `
\u{1F504} \u5468\u671F: ${cycleText}
\u{1F4C5} \u5230\u671F: ${item.expireDate}
\u23F3 ${statusText}${remarkText}
` + (diffDays > 0 ? `\u{1F449} \u8BF7\u5C3D\u5FEB\u5904\u7406\uFF01` : "")
    );
  }
  if (messages.length > 0) {
    const text = messages.join("\n\n---\n\n");
    await sendTelegram(tgToken, tgChat, text);
  }
}

// src/index.js
var src_default = {
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
