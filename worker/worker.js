// src/utils/response.js
var CORS_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
var CORS_REQUEST_HEADERS = "Content-Type, Authorization";
function buildCorsHeaders(request, env = null) {
  const allowed = (env?.ALLOWED_ORIGIN || "").trim();
  let origin = "";
  try {
    origin = request?.headers?.get("Origin") || "";
  } catch {
  }
  if (allowed) {
    const origins = allowed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    origin = origins.includes(origin) ? origin : origins[0];
  } else if (!origin) {
    origin = "*";
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_REQUEST_HEADERS
  };
}
var SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};
function jsonResponse(data, status = 200, request = null, env = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...buildCorsHeaders(request, env), ...SECURITY_HEADERS }
  });
}
function htmlResponse(html, request = null, env = null) {
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8", ...buildCorsHeaders(request, env), ...SECURITY_HEADERS }
  });
}
function textResponse(text, contentType = "text/plain;charset=UTF-8", request = null, env = null) {
  return new Response(text, {
    headers: { "Content-Type": contentType, ...buildCorsHeaders(request, env), ...SECURITY_HEADERS }
  });
}
function svgResponse(svg, request = null, env = null) {
  return textResponse(svg, "image/svg+xml;charset=UTF-8", request, env);
}
function binaryResponse(body, contentType, cacheControl = "public, max-age=86400", request = null, env = null) {
  return new Response(body, {
    headers: {
      ...buildCorsHeaders(request, env),
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": cacheControl
    }
  });
}
function errorResponse(message, status = 400, request = null, env = null) {
  return jsonResponse({ success: false, message }, status, request, env);
}
function successResponse(data = null, request = null, env = null) {
  const res = { success: true };
  if (data) Object.assign(res, data);
  return jsonResponse(res, 200, request, env);
}
function downloadResponse(body, contentType, filename, request = null, env = null) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=${filename}`,
      ...buildCorsHeaders(request, env),
      ...SECURITY_HEADERS
    }
  });
}
function corsPreFlight(request = null, env = null) {
  return new Response(null, { status: 204, headers: { ...buildCorsHeaders(request, env), ...SECURITY_HEADERS } });
}

// src/data/store.js
var ITEMS_KEY = "items";
var HISTORY_KEY = "history";
var HISTORY_LIMIT = 100;
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
  if (idx === -1) return null;
  items[idx] = updater(items[idx]);
  await saveAllItems(db, items);
  return items[idx];
}
async function deleteItem(db, id) {
  const items = await getAllItems(db);
  const deleted = items.find((item) => item.id === id);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  await saveAllItems(db, filtered);
  return deleted;
}
async function getConfig(db, key) {
  return await db.get(key);
}
async function setConfig(db, key, value, options) {
  await db.put(key, value, options);
}
async function getHistory(db, limit = HISTORY_LIMIT) {
  try {
    const history = await db.get(HISTORY_KEY, { type: "json" });
    return (history || []).slice(0, limit);
  } catch {
    return [];
  }
}
async function addHistory(db, entry) {
  const history = await getHistory(db, HISTORY_LIMIT);
  const next = [
    {
      id: crypto.randomUUID(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    },
    ...history
  ].slice(0, HISTORY_LIMIT);
  await db.put(HISTORY_KEY, JSON.stringify(next));
  return next[0];
}
async function clearHistory(db) {
  await db.put(HISTORY_KEY, JSON.stringify([]));
}

// src/services/telegram.js
function escapeTelegramHTML(value) {
  return value == null ? "" : String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function sendTelegram(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
  return res.ok;
}

// src/services/notify.js
var CHANNELS = ["telegram", "bark", "wecom", "webhook"];
async function config(env, key) {
  if (env[key]) return env[key];
  try {
    return await getConfig(env.DB, key);
  } catch {
    return "";
  }
}
function stripHTML(value) {
  return String(value == null ? "" : value).replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.ok;
}
async function sendBark(env, title, text) {
  const barkUrl = await config(env, "BARK_URL");
  const barkKey = await config(env, "BARK_KEY");
  const barkServer = await config(env, "BARK_SERVER") || "https://api.day.app";
  const endpoint = barkUrl || (barkKey ? `${barkServer.replace(/\/$/, "")}/${encodeURIComponent(barkKey)}` : "");
  if (!endpoint) return null;
  return {
    channel: "bark",
    ok: await postJSON(endpoint, {
      title,
      body: stripHTML(text),
      group: "Sub-Tracker"
    })
  };
}
async function sendWeCom(env, title, text) {
  const webhook = await config(env, "WECOM_WEBHOOK_URL") || await config(env, "WECHAT_WORK_WEBHOOK_URL");
  if (!webhook) return null;
  return {
    channel: "wecom",
    ok: await postJSON(webhook, {
      msgtype: "text",
      text: { content: `${title}

${stripHTML(text)}` }
    })
  };
}
async function sendGenericWebhook(env, title, text) {
  const webhook = await config(env, "WEBHOOK_URL");
  if (!webhook) return null;
  return {
    channel: "webhook",
    ok: await postJSON(webhook, {
      source: "sub-tracker",
      title,
      text: stripHTML(text),
      html: text,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    })
  };
}
async function sendTelegramIfConfigured(env, text) {
  const token = await config(env, "TG_BOT_TOKEN");
  const chatId = await config(env, "TG_CHAT_ID");
  if (!token || !chatId) return null;
  return {
    channel: "telegram",
    ok: await sendTelegram(token, chatId, text)
  };
}
function normalizeChannel(value, { allowAll = false } = {}) {
  const raw = String(value || "").trim().toLowerCase();
  if (allowAll && raw === "all") return "all";
  const aliases = {
    tg: "telegram",
    telegram: "telegram",
    bark: "bark",
    wecom: "wecom",
    wechat: "wecom",
    wechat_work: "wecom",
    wechatwork: "wecom",
    qywx: "wecom",
    webhook: "webhook"
  };
  const channel = aliases[raw] || "";
  return CHANNELS.includes(channel) ? channel : "";
}
async function getDefaultNotificationMode(env) {
  return normalizeChannel(await config(env, "DEFAULT_NOTIFY_CHANNEL"), { allowAll: true }) || "all";
}
async function getTargetChannels(env, requestedChannel) {
  const requested = normalizeChannel(requestedChannel, { allowAll: true });
  const mode = requested || await getDefaultNotificationMode(env);
  if (mode === "all") {
    return {
      channels: await getConfiguredNotificationChannels(env),
      explicit: false
    };
  }
  return {
    channels: [mode],
    explicit: true
  };
}
var SENDERS = {
  telegram: (env, title, text) => sendTelegramIfConfigured(env, text),
  bark: (env, title, text) => sendBark(env, title, text),
  wecom: (env, title, text) => sendWeCom(env, title, text),
  webhook: (env, title, text) => sendGenericWebhook(env, title, text)
};
async function getConfiguredNotificationChannels(env) {
  const channels = [];
  if (await config(env, "TG_BOT_TOKEN") && await config(env, "TG_CHAT_ID")) channels.push("telegram");
  if (await config(env, "BARK_URL") || await config(env, "BARK_KEY")) channels.push("bark");
  if (await config(env, "WECOM_WEBHOOK_URL") || await config(env, "WECHAT_WORK_WEBHOOK_URL")) channels.push("wecom");
  if (await config(env, "WEBHOOK_URL")) channels.push("webhook");
  return channels;
}
async function getAuthNotificationChannel(env) {
  const authChannel = normalizeChannel(await config(env, "AUTH_NOTIFY_CHANNEL"));
  if (authChannel) return authChannel;
  const defaultMode = await getDefaultNotificationMode(env);
  if (defaultMode !== "all") return defaultMode;
  const configured = await getConfiguredNotificationChannels(env);
  return configured.includes("telegram") ? "telegram" : configured[0] || "";
}
async function sendNotifications(env, text, options = {}) {
  const title = options.title || "Sub-Tracker";
  const { channels, explicit } = await getTargetChannels(env, options.channel);
  const results = [];
  for (const channel of channels) {
    try {
      const result = await SENDERS[channel](env, title, text);
      if (result) results.push(result);
      else if (explicit) results.push({ channel, ok: false, message: "\u901A\u77E5\u6E20\u9053\u672A\u914D\u7F6E" });
    } catch (err) {
      results.push({ channel, ok: false, message: err.message });
    }
  }
  return results;
}

// src/handlers/auth.js
var OTP_SEND_COOLDOWN_KEY = "admin_auth_send_cooldown";
async function handleAuth(request, env, path) {
  if (request.method === "OPTIONS") {
    return corsPreFlight(request);
  }
  if (path === "/api/auth/send" && request.method === "POST") {
    return await sendOTP(env);
  }
  if (path === "/api/auth/verify" && request.method === "POST") {
    return await verifyOTP(request, env);
  }
  if (path === "/api/auth/logout" && request.method === "POST") {
    return await logoutSession(request, env);
  }
  if (path === "/api/auth/check" && request.method === "GET") {
    return checkSession(request, env);
  }
  return null;
}
function generateOTP() {
  const range = 9e5;
  const max = 4294967295;
  const limit = max - max % range;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return String(1e5 + values[0] % range);
}
function channelLabel(channel) {
  return {
    telegram: "Telegram",
    bark: "Bark",
    wecom: "\u4F01\u4E1A\u5FAE\u4FE1",
    webhook: "Webhook"
  }[channel] || "\u901A\u77E5";
}
function channelRequirements(channel) {
  return {
    telegram: "TG_BOT_TOKEN \u548C TG_CHAT_ID",
    bark: "BARK_KEY \u6216 BARK_URL",
    wecom: "WECOM_WEBHOOK_URL",
    webhook: "WEBHOOK_URL"
  }[channel] || "Telegram\u3001Bark\u3001\u4F01\u4E1A\u5FAE\u4FE1\u6216 Webhook \u4E2D\u7684\u4E00\u79CD";
}
async function sendOTP(env) {
  const cooldown = await getConfig(env.DB, OTP_SEND_COOLDOWN_KEY);
  if (cooldown) {
    return errorResponse("\u9A8C\u8BC1\u7801\u53D1\u9001\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5", 429, null, env);
  }
  const channel = await getAuthNotificationChannel(env);
  if (!channel) {
    return errorResponse(
      `\u672A\u914D\u7F6E\u53EF\u7528\u7684\u767B\u5F55\u9A8C\u8BC1\u7801\u901A\u9053\u3002\u8BF7\u81F3\u5C11\u914D\u7F6E Telegram\u3001Bark\u3001\u4F01\u4E1A\u5FAE\u4FE1\u6216 Webhook \u4E2D\u7684\u4E00\u79CD\u3002
1. Cloudflare Dashboard \u2192 Workers \u2192 Settings \u2192 Variables (\u63A8\u8350)
2. KV \u6570\u636E\u5E93\u4E2D\u624B\u52A8\u6DFB\u52A0\u5BF9\u5E94\u952E\u503C\u5BF9`,
      500,
      null,
      env
    );
  }
  const code = generateOTP();
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
  const results = await sendNotifications(env, text, {
    title: "Sub-Tracker \u5B89\u5168\u9A8C\u8BC1",
    channel
  });
  if (results.some((result) => result.ok)) {
    await setConfig(env.DB, OTP_SEND_COOLDOWN_KEY, "1", { expirationTtl: 60 });
    return successResponse({ channel }, null, env);
  }
  await env.DB.delete("admin_auth_code");
  await env.DB.delete("admin_auth_attempts");
  const failure = results.find((result) => result.channel === channel);
  const detail = failure?.message ? `\uFF08${failure.message}\uFF09` : "";
  return errorResponse(
    `${channelLabel(channel)} \u9A8C\u8BC1\u7801\u53D1\u9001\u5931\u8D25${detail}\uFF0C\u8BF7\u68C0\u67E5 ${channelRequirements(channel)} \u914D\u7F6E`,
    500,
    null,
    env
  );
}
async function verifyOTP(request, env) {
  try {
    const { code } = await request.json();
    const storedCode = await getConfig(env.DB, "admin_auth_code");
    let attempts = parseInt(await getConfig(env.DB, "admin_auth_attempts")) || 0;
    if (attempts >= 5) {
      await env.DB.delete("admin_auth_code");
      await env.DB.delete("admin_auth_attempts");
      return errorResponse("\u9519\u8BEF\u6B21\u6570\u8FC7\u591A\uFF0C\u9A8C\u8BC1\u7801\u5DF2\u4F5C\u5E9F\u3002\u8BF7\u91CD\u65B0\u83B7\u53D6\uFF01", 403, request, env);
    }
    if (!storedCode) {
      return errorResponse("\u8BF7\u5148\u83B7\u53D6\u9A8C\u8BC1\u7801\u6216\u9A8C\u8BC1\u7801\u5DF2\u8FC7\u671F", 400, request, env);
    }
    if (code && storedCode === code.toString()) {
      const token = crypto.randomUUID();
      await setConfig(env.DB, `session_token_${token}`, "valid", { expirationTtl: 2592e3 });
      await env.DB.delete("admin_auth_code");
      await env.DB.delete("admin_auth_attempts");
      return successResponse({ token }, request, env);
    }
    attempts++;
    await setConfig(env.DB, "admin_auth_attempts", attempts.toString(), { expirationTtl: 300 });
    await new Promise((r) => setTimeout(r, 1e3));
    return errorResponse(`\u9A8C\u8BC1\u7801\u9519\u8BEF\uFF01\u5269\u4F59\u5C1D\u8BD5\u6B21\u6570: ${5 - attempts} \u6B21`, 401, request, env);
  } catch {
    return errorResponse("\u6821\u9A8C\u5931\u8D25", 500, request, env);
  }
}
async function logoutSession(request, env) {
  const token = request.headers.get("Authorization");
  if (token) {
    await env.DB.delete(`session_token_${token}`);
  }
  return successResponse(null, request, env);
}
async function checkSession(request, env) {
  const token = request.headers.get("Authorization");
  if (!token) return errorResponse("\u672A\u767B\u5F55", 401, request, env);
  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid) return errorResponse("\u4F1A\u8BDD\u5DF2\u8FC7\u671F", 401, request, env);
  return successResponse(null, request, env);
}
async function requireAuth(request, env) {
  const token = request.headers.get("Authorization");
  if (!token) return errorResponse("Unauthorized: Missing Token", 401, request, env);
  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid) return errorResponse("Unauthorized: Invalid or Expired Token", 401, request, env);
  return null;
}

// src/handlers/history.js
async function handleHistory(request, env, path) {
  if (request.method === "OPTIONS") return corsPreFlight(request);
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;
  if (path === "/api/history" && request.method === "GET") {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    return jsonResponse(await getHistory(env.DB, limit), 200, request, env);
  }
  if (path === "/api/history" && request.method === "DELETE") {
    await clearHistory(env.DB);
    return successResponse(null, request, env);
  }
  return errorResponse("Not Found", 404, request, env);
}

// src/data/constants.js
var ITEM_TYPES = ["esim", "subscription", "balance"];
var STATUSES = ["active", "paused"];
var BILLING_TYPES = ["monthly", "yearly", "once"];
var DEFAULT_REMIND_DAYS = [3, 1, 0];
var REMIND_DAY_OPTIONS = [30, 15, 7, 3, 1, 0];
var CURRENCY_SYMBOLS = {
  CNY: "\xA5",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\xA3",
  JPY: "\xA5",
  HKD: "$",
  TWD: "$",
  KRW: "\u20A9",
  TRY: "\u20BA",
  THB: "\u0E3F",
  NGN: "\u20A6",
  INR: "\u20B9",
  PHP: "\u20B1",
  MYR: "RM",
  SGD: "$"
};
var CURRENCY_CODES = Object.keys(CURRENCY_SYMBOLS);

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
  if (days < 0) return `\u5DF2\u8FC7\u671F ${Math.abs(days)} \u5929`;
  if (days === 0) return "\u4ECA\u5929\u5230\u671F";
  return `\u5269\u4F59 ${days} \u5929`;
}
function calcSuspendDate(balance, monthlyFee, billingDay, now = /* @__PURE__ */ new Date()) {
  const tzNow = new Date(now.getTime() + TZ_OFFSET * 36e5);
  const y = tzNow.getUTCFullYear();
  const m = tzNow.getUTCMonth();
  const d = tzNow.getUTCDate();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const thisMonthBD = Math.min(billingDay, daysInMonth);
  const N = monthlyFee > 0 ? Math.max(0, Math.floor(balance / monthlyFee)) : 0;
  let baseYear, baseMonth;
  if (d <= thisMonthBD) {
    baseYear = y;
    baseMonth = m;
  } else {
    baseYear = m === 11 ? y + 1 : y;
    baseMonth = (m + 1) % 12;
  }
  let suspMonth = baseMonth + N;
  let suspYear = baseYear + Math.floor(suspMonth / 12);
  suspMonth = suspMonth % 12;
  const daysInSuspMonth = new Date(suspYear, suspMonth + 1, 0).getDate();
  const suspDay = Math.min(billingDay, daysInSuspMonth);
  const mm = String(suspMonth + 1).padStart(2, "0");
  const dd = String(suspDay).padStart(2, "0");
  return `${suspYear}-${mm}-${dd}`;
}

// src/data/schema.js
var DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
function asString(value, fallback = "") {
  return value == null ? fallback : String(value).trim();
}
function asNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function asInteger(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}
function normalizeRemindDays(value) {
  const raw = Array.isArray(value) ? value : value == null || value === "" ? DEFAULT_REMIND_DAYS : [value];
  const days = raw.map((day) => Number(day)).filter((day) => Number.isInteger(day) && REMIND_DAY_OPTIONS.includes(day));
  return [...new Set(days)].sort((a, b) => b - a);
}
function isValidDateString(value) {
  if (!DATE_RE.test(value)) return false;
  const d = /* @__PURE__ */ new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}
function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function createItem(type, data) {
  const status = STATUSES.includes(data.status) ? data.status : "active";
  const base = {
    id: crypto.randomUUID(),
    type,
    name: asString(data.name),
    expireDate: asString(data.expireDate),
    cycle: asInteger(data.cycle),
    remark: asString(data.remark),
    status,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (type === "esim") {
    return {
      ...base,
      number: asString(data.number)
    };
  }
  if (type === "balance") {
    const balance = asNumber(data.balance, 0);
    const monthlyFee = asNumber(data.monthlyFee, 0);
    const billingDay = asInteger(data.billingDay, 1);
    return {
      ...base,
      number: asString(data.number),
      balance,
      monthlyFee,
      billingDay,
      currency: CURRENCY_CODES.includes(data.currency) ? data.currency : "CNY",
      remindDays: normalizeRemindDays(data.remindDays),
      predictedSuspendDate: calcSuspendDate(balance, monthlyFee, billingDay)
    };
  }
  return {
    ...base,
    category: asString(data.category),
    region: asString(data.region),
    subId: asString(data.subId),
    price: data.price === "" || data.price == null ? null : asString(data.price),
    billing: BILLING_TYPES.includes(data.billing) ? data.billing : "monthly",
    currency: CURRENCY_CODES.includes(data.currency) ? data.currency : "CNY",
    autoRenew: Boolean(data.autoRenew),
    remindDays: normalizeRemindDays(data.remindDays),
    url: asString(data.url)
  };
}
function validateItem(type, data) {
  if (!ITEM_TYPES.includes(type)) return "\u65E0\u6548\u7684\u7C7B\u578B";
  const name = asString(data.name);
  if (!name) return "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A";
  if (name.length > 120) return "\u540D\u79F0\u4E0D\u80FD\u8D85\u8FC7 120 \u4E2A\u5B57\u7B26";
  const status = data.status || "active";
  if (!STATUSES.includes(status)) return "\u72B6\u6001\u53EA\u80FD\u662F active \u6216 paused";
  const cycle = data.cycle;
  if (cycle != null && cycle !== "") {
    const n = Number(cycle);
    if (!Number.isInteger(n) || n < 1) return "\u5468\u671F\u987B\u4E3A\u6B63\u6574\u6570";
  }
  if (type !== "balance") {
    if (!data.expireDate) return "\u5230\u671F\u65E5\u671F\u4E0D\u80FD\u4E3A\u7A7A";
    if (!isValidDateString(data.expireDate)) return "\u5230\u671F\u65E5\u671F\u683C\u5F0F\u4E0D\u6B63\u786E";
  }
  if (type === "balance") {
    if (data.balance != null && data.balance !== "" && !Number.isFinite(Number(data.balance))) {
      return "\u4F59\u989D\u683C\u5F0F\u4E0D\u6B63\u786E";
    }
    if (!data.monthlyFee && data.monthlyFee !== 0) return "\u6708\u79DF\u4E0D\u80FD\u4E3A\u7A7A";
    if (!Number.isFinite(Number(data.monthlyFee)) || Number(data.monthlyFee) < 0) return "\u6708\u79DF\u683C\u5F0F\u4E0D\u6B63\u786E";
    if (!data.billingDay) return "\u6263\u8D39\u65E5\u4E0D\u80FD\u4E3A\u7A7A";
    const bd = Number(data.billingDay);
    if (!Number.isInteger(bd)) return "\u6263\u8D39\u65E5\u987B\u4E3A\u6574\u6570";
    if (bd < 1 || bd > 28) return "\u6263\u8D39\u65E5\u987B\u4E3A 1-28";
  }
  if (type === "subscription") {
    if (data.price != null && data.price !== "") {
      const price = Number(data.price);
      if (!Number.isFinite(price) || price < 0) return "\u4EF7\u683C\u683C\u5F0F\u4E0D\u6B63\u786E";
    }
    if (data.billing && !BILLING_TYPES.includes(data.billing)) return "\u8BA1\u8D39\u5468\u671F\u4E0D\u6B63\u786E";
    if (!isValidHttpUrl(asString(data.url))) return "\u94FE\u63A5\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934";
  }
  if (data.currency && !CURRENCY_CODES.includes(data.currency)) return "\u8D27\u5E01\u7C7B\u578B\u4E0D\u652F\u6301";
  const remindDays = normalizeRemindDays(data.remindDays);
  if (remindDays.length === 0) return "\u63D0\u9192\u65F6\u95F4\u4E0D\u80FD\u4E3A\u7A7A";
  return null;
}
function mergeUpdate(existing, data) {
  const updated = { ...existing };
  for (const key of ["name", "expireDate", "cycle", "remark", "status"]) {
    if (data[key] !== void 0) {
      if (key === "cycle") updated[key] = asInteger(data[key]);
      else if (key === "name" || key === "remark" || key === "expireDate") updated[key] = asString(data[key]);
      else updated[key] = data[key];
    }
  }
  if (existing.type === "esim") {
    if (data.number !== void 0) updated.number = asString(data.number);
  }
  if (existing.type === "subscription") {
    for (const key of ["category", "region", "subId", "price", "billing", "currency", "autoRenew", "remindDays", "url"]) {
      if (data[key] !== void 0) {
        if (["category", "region", "subId", "url"].includes(key)) updated[key] = asString(data[key]);
        else if (key === "price") updated[key] = data[key] === "" || data[key] == null ? null : asString(data[key]);
        else if (key === "autoRenew") updated[key] = Boolean(data[key]);
        else if (key === "remindDays") updated[key] = normalizeRemindDays(data[key]);
        else updated[key] = data[key];
      }
    }
  }
  if (existing.type === "balance") {
    for (const key of ["number", "balance", "monthlyFee", "billingDay", "currency", "remindDays"]) {
      if (data[key] !== void 0) {
        if (key === "balance" || key === "monthlyFee") updated[key] = asNumber(data[key], 0);
        else if (key === "billingDay") updated[key] = asInteger(data[key], 1);
        else if (key === "number") updated[key] = asString(data[key]);
        else if (key === "remindDays") updated[key] = normalizeRemindDays(data[key]);
        else updated[key] = data[key];
      }
    }
    updated.predictedSuspendDate = calcSuspendDate(updated.balance, updated.monthlyFee, updated.billingDay);
  }
  return updated;
}

// src/handlers/items.js
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function tg(s) {
  return escapeTelegramHTML(s);
}
function validImportId(id) {
  return typeof id === "string" && UUID_RE.test(id.trim()) ? id.trim() : "";
}
async function recordHistory(env, action, item, details = {}) {
  try {
    await addHistory(env.DB, {
      action,
      itemId: item?.id || "",
      itemName: item?.name || "",
      itemType: item?.type || "",
      details
    });
  } catch (err) {
    console.error("History write failed:", err);
  }
}
async function handleItems(request, env, path) {
  if (request.method === "OPTIONS") return corsPreFlight(request);
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;
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
    if (request.method === "POST" && action === "/recharge") {
      return await rechargeItem(request, env, id);
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
  return jsonResponse(items, 200, request, env);
}
async function createNewItem(request, env) {
  try {
    const body = await request.json();
    const type = body.type || "esim";
    if (!ITEM_TYPES.includes(type)) {
      return errorResponse("\u65E0\u6548\u7684\u7C7B\u578B", 400, request, env);
    }
    const err = validateItem(type, body);
    if (err) return errorResponse(err, 400, request, env);
    const item = createItem(type, body);
    await addItem(env.DB, item);
    await recordHistory(env, "create", item);
    return successResponse({ id: item.id }, request, env);
  } catch {
    return errorResponse("\u53C2\u6570\u9519\u8BEF", 400, request, env);
  }
}
async function updateExistingItem(request, env, id) {
  try {
    const body = await request.json();
    const result = await updateItem(env.DB, id, (existing) => {
      const updated = mergeUpdate(existing, body);
      const err = validateItem(updated.type, updated);
      if (err) throw new Error(err);
      return updated;
    });
    if (!result) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, request, env);
    await recordHistory(env, "update", result);
    return successResponse(null, request, env);
  } catch (e) {
    return errorResponse(e.message || "\u66F4\u65B0\u5931\u8D25", 400, request, env);
  }
}
async function deleteExistingItem(env, id) {
  const deleted = await deleteItem(env.DB, id);
  if (!deleted) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, null, env);
  await recordHistory(env, "delete", deleted);
  return successResponse(null, null, env);
}
async function renewItem(env, id) {
  try {
    const result = await updateItem(env.DB, id, (existing) => {
      if (existing.type !== "esim" && existing.type !== "subscription") {
        throw new Error("\u4EC5 eSIM \u548C\u8BA2\u9605\u7C7B\u578B\u652F\u6301\u4E00\u952E\u7EED\u671F");
      }
      if (!existing.cycle) {
        throw new Error("\u672A\u8BBE\u7F6E\u7EED\u8D39\u5468\u671F\uFF0C\u65E0\u6CD5\u7EED\u671F");
      }
      const newExpire = addDays(existing.expireDate, existing.cycle);
      return { ...existing, expireDate: newExpire, status: "active" };
    });
    if (!result) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, null, env);
    await recordHistory(env, "renew", result, { newExpireDate: result.expireDate });
    return successResponse({ newExpireDate: result.expireDate }, null, env);
  } catch (e) {
    return errorResponse(e.message || "\u7EED\u671F\u5931\u8D25", 400, null, env);
  }
}
async function rechargeItem(request, env, id) {
  try {
    const body = await request.json();
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount === 0) {
      return errorResponse("\u91D1\u989D\u4E0D\u80FD\u4E3A\u7A7A\u6216\u4E3A\u96F6", 400, request, env);
    }
    const result = await updateItem(env.DB, id, (existing) => {
      if (existing.type !== "balance") {
        throw new Error("\u4EC5\u8BDD\u8D39\u7C7B\u578B\u652F\u6301\u5145\u503C");
      }
      const newBalance = Math.round((existing.balance + amount) * 100) / 100;
      const newSuspendDate = calcSuspendDate(newBalance, existing.monthlyFee, existing.billingDay);
      return {
        ...existing,
        balance: newBalance,
        lastRecharge: { amount, date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], note: body.note || "" },
        predictedSuspendDate: newSuspendDate
      };
    });
    if (!result) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, request, env);
    await recordHistory(env, "recharge", result, {
      amount,
      newBalance: result.balance,
      predictedSuspendDate: result.predictedSuspendDate
    });
    return successResponse({
      newBalance: result.balance,
      predictedSuspendDate: result.predictedSuspendDate
    }, request, env);
  } catch (e) {
    return errorResponse(e.message || "\u5145\u503C\u5931\u8D25", 400, request, env);
  }
}
async function exportJSON(env) {
  const items = await getAllItems(env.DB);
  const exportData = {
    version: "1.0.0",
    exportDate: (/* @__PURE__ */ new Date()).toISOString(),
    count: items.length,
    items: items.map(({ createdAt, ...rest }) => rest)
    // strip createdAt, keep id for dedup
  };
  return downloadResponse(
    JSON.stringify(exportData, null, 2),
    "application/json",
    `sub-tracker-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`,
    null,
    env
  );
}
async function exportCSV(env) {
  const items = await getAllItems(env.DB);
  const headers = ["ID", "\u7C7B\u578B", "\u540D\u79F0", "\u53F7\u7801", "\u5206\u7C7B", "\u5230\u671F\u65E5\u671F", "\u5468\u671F(\u5929)", "\u8D39\u7528/\u4F59\u989D", "\u8D27\u5E01", "\u81EA\u52A8\u7EED\u8D39/\u6708\u79DF", "\u6263\u8D39\u65E5", "\u72B6\u6001", "\u5907\u6CE8"];
  const rows = items.map((item) => {
    const typeLabel = item.type === "esim" ? "eSIM" : item.type === "balance" ? "\u8BDD\u8D39" : "\u8BA2\u9605";
    const priceOrBalance = item.type === "balance" ? item.balance != null ? item.balance : "" : item.price || "";
    const autoRenewOrFee = item.type === "balance" ? item.monthlyFee || "" : item.autoRenew ? "\u662F" : "\u5426";
    const billingDay = item.type === "balance" ? item.billingDay || "" : "";
    return [
      item.id || "",
      typeLabel,
      csvEscape(item.name),
      csvEscape(item.number || ""),
      csvEscape(item.category || ""),
      item.expireDate || "",
      item.cycle || "",
      priceOrBalance,
      item.currency || "CNY",
      autoRenewOrFee,
      billingDay,
      item.status === "active" ? "\u542F\u7528" : "\u505C\u7528",
      csvEscape(item.remark || "")
    ].join(",");
  });
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\n");
  return downloadResponse(
    csv,
    "text/csv; charset=utf-8",
    `sub-tracker-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`,
    null,
    env
  );
}
function csvEscape(s) {
  if (!s) return "";
  s = String(s);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
async function importJSON(request, env) {
  try {
    const body = await request.json();
    const importedItems = body.items || body;
    if (!Array.isArray(importedItems)) {
      return errorResponse("\u6570\u636E\u683C\u5F0F\u9519\u8BEF\uFF1A\u9700\u8981 items \u6570\u7EC4", 400, request, env);
    }
    if (importedItems.length > 500) {
      return errorResponse("\u5355\u6B21\u5BFC\u5165\u4E0D\u80FD\u8D85\u8FC7 500 \u6761\u8BB0\u5F55", 400, request, env);
    }
    const existing = await getAllItems(env.DB);
    const existingIds = new Set(existing.map((i) => i.id));
    let added = 0;
    let skipped = 0;
    const errors = [];
    for (const [index, raw] of importedItems.entries()) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        skipped++;
        errors.push({ index, message: "\u8BB0\u5F55\u5FC5\u987B\u662F\u5BF9\u8C61" });
        continue;
      }
      const type = raw.type || "esim";
      if (!ITEM_TYPES.includes(type)) {
        skipped++;
        errors.push({ index, message: "\u65E0\u6548\u7684\u7C7B\u578B" });
        continue;
      }
      const err = validateItem(type, raw);
      if (err) {
        skipped++;
        errors.push({ index, name: raw.name || "", message: err });
        continue;
      }
      const importId = validImportId(raw.id);
      if (importId && existingIds.has(importId)) {
        skipped++;
        errors.push({ index, name: raw.name || "", message: "ID \u5DF2\u5B58\u5728\uFF0C\u5DF2\u8DF3\u8FC7" });
        continue;
      }
      const item = createItem(type, raw);
      if (importId) item.id = importId;
      existing.push(item);
      existingIds.add(item.id);
      added++;
    }
    await saveAllItems(env.DB, existing);
    await recordHistory(env, "import", null, { added, skipped, total: existing.length });
    return successResponse({ added, skipped, total: existing.length, errors: errors.slice(0, 10) }, request, env);
  } catch {
    return errorResponse("\u5BFC\u5165\u5931\u8D25\uFF1AJSON \u89E3\u6790\u9519\u8BEF", 400, request, env);
  }
}
async function testNotify(env, id) {
  const item = await getItemById(env.DB, id);
  if (!item) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, null, env);
  const channels = await getConfiguredNotificationChannels(env);
  if (!channels.length) {
    return errorResponse("\u672A\u914D\u7F6E\u901A\u77E5\u6E20\u9053\u3002\u8BF7\u81F3\u5C11\u914D\u7F6E Telegram\u3001Bark\u3001\u4F01\u4E1A\u5FAE\u4FE1\u6216 Webhook \u4E2D\u7684\u4E00\u79CD", 400, null, env);
  }
  if (item.type === "balance") {
    const suspendDate = item.predictedSuspendDate || "\u672A\u8BA1\u7B97";
    const sym = CURRENCY_SYMBOLS[item.currency] || item.currency || "\xA5";
    const monthsLeft = item.monthlyFee > 0 ? Math.max(0, Math.floor(item.balance / item.monthlyFee)) : 0;
    const msg2 = [
      `\u26A0\uFE0F <b>\u3010Sub-Tracker \u8BDD\u8D39\u505C\u673A \xB7 \u6D4B\u8BD5\u901A\u77E5\u3011</b>`,
      "",
      `\u{1F4F1} \u540D\u79F0: ${tg(item.name)}`,
      item.number ? `\u{1F4DE} \u53F7\u7801: ${tg(item.number)}` : "",
      `\u{1F4B0} \u4F59\u989D: ${sym}${item.balance}`,
      `\u{1F4B8} \u6708\u79DF: ${sym}${item.monthlyFee}/\u6708`,
      `\u{1F4C5} \u6BCF\u6708${item.billingDay}\u65E5\u6263\u8D39`,
      `\u{1F50B} \u53EF\u6491 ${monthsLeft} \u4E2A\u6708`,
      `\u{1F4C6} \u9884\u8BA1\u505C\u673A: ${suspendDate}`,
      item.remark ? `\u{1F4DD} \u5907\u6CE8: ${tg(item.remark)}` : "",
      "",
      "<i>\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u901A\u77E5\uFF0C\u786E\u8BA4\u901A\u77E5\u529F\u80FD\u6B63\u5E38\u3002</i>"
    ].filter(Boolean).join("\n");
    const results2 = await sendNotifications(env, msg2, { title: "Sub-Tracker \u6D4B\u8BD5\u901A\u77E5" });
    if (results2.some((r) => r.ok)) return successResponse({ channels: results2 }, null, env);
    return errorResponse("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u901A\u77E5\u914D\u7F6E", 400, null, env);
  }
  const diff = daysUntil(item.expireDate);
  const statusText = getStatusText(diff);
  const emoji = diff <= 0 ? "\u{1F6A8}" : diff <= 15 ? "\u26A0\uFE0F" : "\u{1F4E2}";
  const typeLabel = item.type === "esim" ? "eSIM \u4FDD\u53F7" : "\u8BA2\u9605\u7EED\u8D39";
  const msg = [
    `${emoji} <b>\u3010Sub-Tracker ${typeLabel} \xB7 \u6D4B\u8BD5\u901A\u77E5\u3011</b>`,
    "",
    `\u{1F4E6} \u540D\u79F0: ${tg(item.name)}`,
    item.number ? `\u{1F4DE} \u53F7\u7801: ${tg(item.number)}` : "",
    item.category ? `\u{1F3F7}\uFE0F \u5206\u7C7B: ${tg(item.category)}` : "",
    `\u{1F4C5} \u5230\u671F: ${item.expireDate}`,
    `\u23F3 \u72B6\u6001: ${statusText}`,
    item.remark ? `\u{1F4DD} \u5907\u6CE8: ${tg(item.remark)}` : "",
    "",
    "<i>\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u901A\u77E5\uFF0C\u786E\u8BA4\u901A\u77E5\u529F\u80FD\u6B63\u5E38\u3002</i>"
  ].filter(Boolean).join("\n");
  const results = await sendNotifications(env, msg, { title: "Sub-Tracker \u6D4B\u8BD5\u901A\u77E5" });
  if (results.some((r) => r.ok)) return successResponse({ channels: results }, null, env);
  return errorResponse("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u901A\u77E5\u914D\u7F6E", 400, null, env);
}

// src/utils/country.js
var COUNTRY_MAP = {
  // 1-digit
  "1": { name: "\u7F8E\u56FD/\u52A0\u62FF\u5927", code: "US" },
  "7": { name: "\u4FC4\u7F57\u65AF", code: "RU" },
  // 2-digit: Zone 2 (Africa)
  "20": { name: "\u57C3\u53CA", code: "EG" },
  "27": { name: "\u5357\u975E", code: "ZA" },
  // 2-digit: Zone 3 (Europe)
  "30": { name: "\u5E0C\u814A", code: "GR" },
  "31": { name: "\u8377\u5170", code: "NL" },
  "32": { name: "\u6BD4\u5229\u65F6", code: "BE" },
  "33": { name: "\u6CD5\u56FD", code: "FR" },
  "34": { name: "\u897F\u73ED\u7259", code: "ES" },
  "36": { name: "\u5308\u7259\u5229", code: "HU" },
  "39": { name: "\u610F\u5927\u5229", code: "IT" },
  // 2-digit: Zone 4 (Europe)
  "40": { name: "\u7F57\u9A6C\u5C3C\u4E9A", code: "RO" },
  "41": { name: "\u745E\u58EB", code: "CH" },
  "43": { name: "\u5965\u5730\u5229", code: "AT" },
  "44": { name: "\u82F1\u56FD", code: "GB" },
  "45": { name: "\u4E39\u9EA6", code: "DK" },
  "46": { name: "\u745E\u5178", code: "SE" },
  "47": { name: "\u632A\u5A01", code: "NO" },
  "48": { name: "\u6CE2\u5170", code: "PL" },
  "49": { name: "\u5FB7\u56FD", code: "DE" },
  // 2-digit: Zone 5 (Americas)
  "51": { name: "\u79D8\u9C81", code: "PE" },
  "52": { name: "\u58A8\u897F\u54E5", code: "MX" },
  "53": { name: "\u53E4\u5DF4", code: "CU" },
  "54": { name: "\u963F\u6839\u5EF7", code: "AR" },
  "55": { name: "\u5DF4\u897F", code: "BR" },
  "56": { name: "\u667A\u5229", code: "CL" },
  "57": { name: "\u54E5\u4F26\u6BD4\u4E9A", code: "CO" },
  "58": { name: "\u59D4\u5185\u745E\u62C9", code: "VE" },
  // 2-digit: Zone 6 (Southeast Asia / Oceania)
  "60": { name: "\u9A6C\u6765\u897F\u4E9A", code: "MY" },
  "61": { name: "\u6FB3\u5927\u5229\u4E9A", code: "AU" },
  "62": { name: "\u5370\u5C3C", code: "ID" },
  "63": { name: "\u83F2\u5F8B\u5BBE", code: "PH" },
  "64": { name: "\u65B0\u897F\u5170", code: "NZ" },
  "65": { name: "\u65B0\u52A0\u5761", code: "SG" },
  "66": { name: "\u6CF0\u56FD", code: "TH" },
  // 2-digit: Zone 8 (East Asia)
  "81": { name: "\u65E5\u672C", code: "JP" },
  "82": { name: "\u97E9\u56FD", code: "KR" },
  "84": { name: "\u8D8A\u5357", code: "VN" },
  "86": { name: "\u4E2D\u56FD", code: "CN" },
  // 2-digit: Zone 9 (West/South/Central Asia)
  "90": { name: "\u571F\u8033\u5176", code: "TR" },
  "91": { name: "\u5370\u5EA6", code: "IN" },
  "92": { name: "\u5DF4\u57FA\u65AF\u5766", code: "PK" },
  "93": { name: "\u963F\u5BCC\u6C57", code: "AF" },
  "94": { name: "\u65AF\u91CC\u5170\u5361", code: "LK" },
  "95": { name: "\u7F05\u7538", code: "MM" },
  "98": { name: "\u4F0A\u6717", code: "IR" },
  // 3-digit: Zone 2 (Africa cont.)
  "212": { name: "\u6469\u6D1B\u54E5", code: "MA" },
  "213": { name: "\u963F\u5C14\u53CA\u5229\u4E9A", code: "DZ" },
  "216": { name: "\u7A81\u5C3C\u65AF", code: "TN" },
  "218": { name: "\u5229\u6BD4\u4E9A", code: "LY" },
  "220": { name: "\u5188\u6BD4\u4E9A", code: "GM" },
  "221": { name: "\u585E\u5185\u52A0\u5C14", code: "SN" },
  "222": { name: "\u6BDB\u91CC\u5854\u5C3C\u4E9A", code: "MR" },
  "223": { name: "\u9A6C\u91CC", code: "ML" },
  "224": { name: "\u51E0\u5185\u4E9A", code: "GN" },
  "225": { name: "\u79D1\u7279\u8FEA\u74E6", code: "CI" },
  "226": { name: "\u5E03\u57FA\u7EB3\u6CD5\u7D22", code: "BF" },
  "227": { name: "\u5C3C\u65E5\u5C14", code: "NE" },
  "228": { name: "\u591A\u54E5", code: "TG" },
  "229": { name: "\u8D1D\u5B81", code: "BJ" },
  "230": { name: "\u6BDB\u91CC\u6C42\u65AF", code: "MU" },
  "231": { name: "\u5229\u6BD4\u91CC\u4E9A", code: "LR" },
  "232": { name: "\u585E\u62C9\u5229\u6602", code: "SL" },
  "233": { name: "\u52A0\u7EB3", code: "GH" },
  "234": { name: "\u5C3C\u65E5\u5229\u4E9A", code: "NG" },
  "235": { name: "\u4E4D\u5F97", code: "TD" },
  "236": { name: "\u4E2D\u975E", code: "CF" },
  "237": { name: "\u5580\u9EA6\u9686", code: "CM" },
  "238": { name: "\u4F5B\u5F97\u89D2", code: "CV" },
  "239": { name: "\u5723\u591A\u7F8E", code: "ST" },
  "240": { name: "\u8D64\u9053\u51E0\u5185\u4E9A", code: "GQ" },
  "241": { name: "\u52A0\u84EC", code: "GA" },
  "242": { name: "\u521A\u679C(\u5E03)", code: "CG" },
  "243": { name: "\u521A\u679C(\u91D1)", code: "CD" },
  "244": { name: "\u5B89\u54E5\u62C9", code: "AO" },
  "245": { name: "\u51E0\u5185\u4E9A\u6BD4\u7ECD", code: "GW" },
  "246": { name: "\u8FEA\u6208\u52A0\u897F\u4E9A", code: "IO" },
  "247": { name: "\u963F\u68EE\u677E\u5C9B", code: "AC" },
  "248": { name: "\u585E\u820C\u5C14", code: "SC" },
  "249": { name: "\u82CF\u4E39", code: "SD" },
  "250": { name: "\u5362\u65FA\u8FBE", code: "RW" },
  "251": { name: "\u57C3\u585E\u4FC4\u6BD4\u4E9A", code: "ET" },
  "252": { name: "\u7D22\u9A6C\u91CC", code: "SO" },
  "253": { name: "\u5409\u5E03\u63D0", code: "DJ" },
  "254": { name: "\u80AF\u5C3C\u4E9A", code: "KE" },
  "255": { name: "\u5766\u6851\u5C3C\u4E9A", code: "TZ" },
  "256": { name: "\u4E4C\u5E72\u8FBE", code: "UG" },
  "257": { name: "\u5E03\u9686\u8FEA", code: "BI" },
  "258": { name: "\u83AB\u6851\u6BD4\u514B", code: "MZ" },
  "260": { name: "\u8D5E\u6BD4\u4E9A", code: "ZM" },
  "261": { name: "\u9A6C\u8FBE\u52A0\u65AF\u52A0", code: "MG" },
  "262": { name: "\u7559\u5C3C\u6C6A", code: "RE" },
  "263": { name: "\u6D25\u5DF4\u5E03\u97E6", code: "ZW" },
  "264": { name: "\u7EB3\u7C73\u6BD4\u4E9A", code: "NA" },
  "265": { name: "\u9A6C\u62C9\u7EF4", code: "MW" },
  "266": { name: "\u83B1\u7D22\u6258", code: "LS" },
  "267": { name: "\u535A\u8328\u74E6\u7EB3", code: "BW" },
  "268": { name: "\u65AF\u5A01\u58EB\u5170", code: "SZ" },
  "269": { name: "\u79D1\u6469\u7F57", code: "KM" },
  "290": { name: "\u5723\u8D6B\u52D2\u62FF", code: "SH" },
  "291": { name: "\u5384\u7ACB\u7279\u91CC\u4E9A", code: "ER" },
  "297": { name: "\u963F\u9C81\u5DF4", code: "AW" },
  "298": { name: "\u6CD5\u7F57\u7FA4\u5C9B", code: "FO" },
  "299": { name: "\u683C\u9675\u5170", code: "GL" },
  // 3-digit: Zone 3 (Europe cont.)
  "350": { name: "\u76F4\u5E03\u7F57\u9640", code: "GI" },
  "351": { name: "\u8461\u8404\u7259", code: "PT" },
  "352": { name: "\u5362\u68EE\u5821", code: "LU" },
  "353": { name: "\u7231\u5C14\u5170", code: "IE" },
  "354": { name: "\u51B0\u5C9B", code: "IS" },
  "355": { name: "\u963F\u5C14\u5DF4\u5C3C\u4E9A", code: "AL" },
  "356": { name: "\u9A6C\u8033\u4ED6", code: "MT" },
  "357": { name: "\u585E\u6D66\u8DEF\u65AF", code: "CY" },
  "358": { name: "\u82AC\u5170", code: "FI" },
  "359": { name: "\u4FDD\u52A0\u5229\u4E9A", code: "BG" },
  "370": { name: "\u7ACB\u9676\u5B9B", code: "LT" },
  "371": { name: "\u62C9\u8131\u7EF4\u4E9A", code: "LV" },
  "372": { name: "\u7231\u6C99\u5C3C\u4E9A", code: "EE" },
  "373": { name: "\u6469\u5C14\u591A\u74E6", code: "MD" },
  "374": { name: "\u4E9A\u7F8E\u5C3C\u4E9A", code: "AM" },
  "375": { name: "\u767D\u4FC4\u7F57\u65AF", code: "BY" },
  "376": { name: "\u5B89\u9053\u5C14", code: "AD" },
  "377": { name: "\u6469\u7EB3\u54E5", code: "MC" },
  "378": { name: "\u5723\u9A6C\u529B\u8BFA", code: "SM" },
  "380": { name: "\u4E4C\u514B\u5170", code: "UA" },
  "381": { name: "\u585E\u5C14\u7EF4\u4E9A", code: "RS" },
  "382": { name: "\u9ED1\u5C71", code: "ME" },
  "383": { name: "\u79D1\u7D22\u6C83", code: "XK" },
  "385": { name: "\u514B\u7F57\u5730\u4E9A", code: "HR" },
  "386": { name: "\u65AF\u6D1B\u6587\u5C3C\u4E9A", code: "SI" },
  "387": { name: "\u6CE2\u9ED1", code: "BA" },
  "389": { name: "\u5317\u9A6C\u5176\u987F", code: "MK" },
  // 3-digit: Zone 8 (East Asia cont.)
  "850": { name: "\u671D\u9C9C", code: "KP" },
  "852": { name: "\u9999\u6E2F", code: "HK" },
  "853": { name: "\u6FB3\u95E8", code: "MO" },
  "855": { name: "\u67EC\u57D4\u5BE8", code: "KH" },
  "856": { name: "\u8001\u631D", code: "LA" },
  "880": { name: "\u5B5F\u52A0\u62C9", code: "BD" },
  "886": { name: "\u53F0\u6E7E", code: "TW" },
  // 3-digit: Zone 9 (West/South/Central Asia cont.)
  "960": { name: "\u9A6C\u5C14\u4EE3\u592B", code: "MV" },
  "961": { name: "\u9ECE\u5DF4\u5AE9", code: "LB" },
  "962": { name: "\u7EA6\u65E6", code: "JO" },
  "963": { name: "\u53D9\u5229\u4E9A", code: "SY" },
  "964": { name: "\u4F0A\u62C9\u514B", code: "IQ" },
  "965": { name: "\u79D1\u5A01\u7279", code: "KW" },
  "966": { name: "\u6C99\u7279", code: "SA" },
  "967": { name: "\u4E5F\u95E8", code: "YE" },
  "968": { name: "\u963F\u66FC", code: "OM" },
  "970": { name: "\u5DF4\u52D2\u65AF\u5766", code: "PS" },
  "971": { name: "\u963F\u8054\u914B", code: "AE" },
  "972": { name: "\u4EE5\u8272\u5217", code: "IL" },
  "973": { name: "\u5DF4\u6797", code: "BH" },
  "974": { name: "\u5361\u5854\u5C14", code: "QA" },
  "975": { name: "\u4E0D\u4E39", code: "BT" },
  "976": { name: "\u8499\u53E4", code: "MN" },
  "977": { name: "\u5C3C\u6CCA\u5C14", code: "NP" },
  "992": { name: "\u5854\u5409\u514B\u65AF\u5766", code: "TJ" },
  "993": { name: "\u571F\u5E93\u66FC\u65AF\u5766", code: "TM" },
  "994": { name: "\u963F\u585E\u62DC\u7586", code: "AZ" },
  "995": { name: "\u683C\u9C81\u5409\u4E9A", code: "GE" },
  "996": { name: "\u5409\u5C14\u5409\u65AF\u65AF\u5766", code: "KG" },
  "998": { name: "\u4E4C\u5179\u522B\u514B\u65AF\u5766", code: "UZ" }
};
var PREFIXES_3 = [];
var PREFIXES_2 = [];
var PREFIXES_1 = [];
for (const code of Object.keys(COUNTRY_MAP)) {
  if (code.length === 3) PREFIXES_3.push(code);
  else if (code.length === 2) PREFIXES_2.push(code);
  else PREFIXES_1.push(code);
}
function getCountryMap() {
  return COUNTRY_MAP;
}

// src/ui/client-script.js
function getFrontendFlagMap() {
  return Object.fromEntries(
    Object.entries(getCountryMap()).map(([prefix, info]) => [prefix, info.code])
  );
}
function getClientScript() {
  const flagMap = getFrontendFlagMap();
  return `let TOKEN = localStorage.getItem('token') || '';
let allItems = [];
let currentFilter = 'all';
let currentView = 'grid';
let calYear, calMonth;
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

const API = '';
const DEFAULT_REMIND_DAYS_CLIENT = ${JSON.stringify(DEFAULT_REMIND_DAYS)};

// ==================== API ====================
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (TOKEN) opts.headers['Authorization'] = TOKEN;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  // Auto-logout on session expiry
  if (res.status === 401 && TOKEN) {
    TOKEN = ''; localStorage.removeItem('token');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    showLoginMsg('\u4F1A\u8BDD\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55');
  }
  return res;
}

// ==================== AUTH ====================
async function sendOTP() {
  const btn = document.getElementById('send-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u53D1\u9001\u4E2D...';
  const res = await api('POST', '/api/auth/send');
  const data = await res.json();
  if (data.success) { btn.innerHTML = '<i class="fa-solid fa-check"></i> \u5DF2\u53D1\u9001'; btn.classList.add('text-green-400'); showLoginMsg(''); }
  else { showLoginMsg(data.message || '\u53D1\u9001\u5931\u8D25'); btn.innerHTML = '<i class="fa-solid fa-key"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801'; }
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-key"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801'; btn.classList.remove('text-green-400'); }, 5000);
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
  const today = new Date(); today.setHours(0,0,0,0);
  let urgentCount = 0;
  allItems.forEach(i => {
    if (i.type === 'balance') {
      if (i.predictedSuspendDate) { const exp = new Date(i.predictedSuspendDate+'T00:00:00'); const diff = Math.ceil((exp-today)/86400000); if (diff <= 15) urgentCount++; }
    } else if (i.expireDate) { const exp = new Date(i.expireDate+'T00:00:00'); const diff = Math.ceil((exp-today)/86400000); if (diff <= 15) urgentCount++; }
  });

  // Cost calculation \u2014 group by currency to avoid mixing
  const monthlyByCur = {};
  const yearlyByCur = {};
  subs.forEach(s => {
    if (!s.price) return;
    const p = parseFloat(s.price);
    const cur = s.currency || 'CNY';
    const billing = s.billing || 'monthly';
    if (billing === 'monthly') { monthlyByCur[cur] = (monthlyByCur[cur]||0) + p; yearlyByCur[cur] = (yearlyByCur[cur]||0) + p * 12; }
    else if (billing === 'yearly') { monthlyByCur[cur] = (monthlyByCur[cur]||0) + p / 12; yearlyByCur[cur] = (yearlyByCur[cur]||0) + p; }
    else { yearlyByCur[cur] = (yearlyByCur[cur]||0) + p; }
  });

  // Balance: add monthly fees to cost
  balances.forEach(b => {
    if (!b.monthlyFee) return;
    const cur = b.currency || 'CNY';
    monthlyByCur[cur] = (monthlyByCur[cur]||0) + parseFloat(b.monthlyFee);
    yearlyByCur[cur] = (yearlyByCur[cur]||0) + parseFloat(b.monthlyFee) * 12;
  });

  // Total balance (grouped)
  const balanceByCur = {};
  balances.forEach(b => {
    if (b.balance == null) return;
    const cur = b.currency || 'CNY';
    balanceByCur[cur] = (balanceByCur[cur]||0) + b.balance;
  });

  // Format: show primary currency, append others if mixed
  const allCurs = [...new Set([...Object.keys(monthlyByCur), ...Object.keys(balanceByCur)])].sort();
  const primaryCur = allCurs[0] || 'CNY';
  const sym = currSym(primaryCur);

  function fmtCost(bucket) {
    if (!allCurs.length) return sym + '0';
    const parts = allCurs.filter(c => bucket[c] > 0).map(c => currSym(c) + Math.round(bucket[c]));
    return parts.length ? parts[0] + (parts.length > 1 ? ' +' : '') : sym + '0';
  }

  function fmtBalance() {
    if (!allCurs.length) return '0';
    const parts = allCurs.filter(c => balanceByCur[c] > 0).map(c => currSym(c) + Math.round(balanceByCur[c]));
    return parts.length ? parts[0] + (parts.length > 1 ? ' +' : '') : '0';
  }

  const stats = [
    { label:'eSIM', value:esims.length, icon:'fa-sim-card', color:'text-cyan-400', bg:'bg-cyan-500/10', filter:'esim' },
    { label:'\u8BA2\u9605', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10', filter:'subscription' },
    { label:'\u8BDD\u8D39', value:balances.length ? fmtBalance() : '0', icon:'fa-wallet', color:'text-amber-400', bg:'bg-amber-500/10', filter:'balance' },
    { label:'\u5373\u5C06\u5230\u671F', value:urgentCount, icon:'fa-clock', color:'text-rose-400', bg:'bg-rose-500/10', filter:'urgent' },
    { label:'\u6708\u5EA6\u652F\u51FA', value:fmtCost(monthlyByCur), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map(s =>
    '<div class="glass-card rounded-xl p-4' + (s.filter ? ' cursor-pointer' : '') + '"' +
    (s.filter ? ' onclick="setFilter(\\''+s.filter+'\\')" role="button" tabindex="0" aria-label="\u7B5B\u9009'+s.label+'"' : '') + '><div class="flex items-center gap-3">' +
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
      const cat = item.category || '\u672A\u5206\u7C7B';
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
      const key = '\u8BDD\u8D39|' + cur;
      categories[key] = { category: '\u8BDD\u8D39', currency: cur, monthly: (categories[key]?.monthly || 0) + fee, yearly: (categories[key]?.yearly || 0) + fee * 12 };
    }
  });

  const currencies = Object.keys(monthly).sort();
  if (!currencies.length) { panel.innerHTML = ''; return; }

  const currencyHTML = currencies.map(cur =>
    '<div class="glass-card rounded-xl p-4">' +
      '<div class="text-xs text-slate-400 mb-1">'+cur+'</div>' +
      '<div class="text-lg font-bold text-white">'+fmtMoney(cur, monthly[cur])+'<span class="text-xs text-slate-500 font-normal"> / \u6708</span></div>' +
      '<div class="text-xs text-slate-400 mt-1">'+fmtMoney(cur, yearly[cur] || 0)+' / \u5E74</div>' +
    '</div>'
  ).join('');

  const categoryRows = Object.values(categories)
    .sort((a,b) => b.yearly - a.yearly)
    .slice(0, 6)
    .map(c =>
      '<div class="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">' +
        '<div class="min-w-0"><div class="text-sm text-white truncate">'+esc(c.category)+'</div><div class="text-xs text-slate-500">'+c.currency+'</div></div>' +
        '<div class="text-right flex-shrink-0"><div class="text-sm text-slate-200">'+fmtMoney(c.currency, c.monthly)+'/\u6708</div><div class="text-xs text-slate-500">'+fmtMoney(c.currency, c.yearly)+'/\u5E74</div></div>' +
      '</div>'
    ).join('');

  panel.innerHTML =
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-chart-simple text-emerald-400 mr-2"></i>\u6309\u8D27\u5E01\u7EDF\u8BA1</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+currencyHTML+'</div></div>' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-layer-group text-violet-400 mr-2"></i>\u6309\u5206\u7C7B\u7EDF\u8BA1</div>'+categoryRows+'</div>' +
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
  // Clear tab-active from all if filter is not a standard type
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
  const today = new Date(); today.setHours(0,0,0,0);
  const sortBy = document.getElementById('sort-select')?.value || 'expire';
  items.sort((a,b) => {
    if (sortBy === 'name') return (a.name||'').localeCompare(b.name||'', 'zh');
    if (sortBy === 'price') {
      const pa = a.type === 'balance' ? (a.monthlyFee||0) : parseFloat(a.price)||0;
      const pb = b.type === 'balance' ? (b.monthlyFee||0) : parseFloat(b.price)||0;
      return pb - pa; // high to low
    }
    // Default: sort by expiry date (nearest first)
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
  if (!items.length) {
    area.innerHTML = '';
    const search = (document.getElementById('search-input').value || '').trim();
    if (search || currentFilter !== 'all') {
      empty.querySelector('p.text-lg').textContent = '\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55';
      empty.querySelector('p.text-sm').textContent = '\u5C1D\u8BD5\u8C03\u6574\u641C\u7D22\u5173\u952E\u8BCD\u6216\u7B5B\u9009\u6761\u4EF6';
      empty.querySelector('.flex.gap-3')?.classList.add('hidden');
    } else {
      empty.querySelector('p.text-lg').textContent = '\u6682\u65E0\u6570\u636E';
      empty.querySelector('p.text-sm').textContent = '\u6DFB\u52A0\u4F60\u7684\u7B2C\u4E00\u4E2A eSIM \u5361\u3001\u8BA2\u9605\u670D\u52A1\u6216\u8BDD\u8D39\u7BA1\u7406';
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
  if (isBalance) { tc = 'text-amber-400'; tb = 'bg-amber-500/10'; ti = 'fa-wallet'; tl = '\u8BDD\u8D39'; }
  else if (isEsim) { tc = 'text-cyan-400'; tb = 'bg-cyan-500/10'; ti = 'fa-sim-card'; tl = 'eSIM'; }
  else { tc = 'text-violet-400'; tb = 'bg-violet-500/10'; ti = 'fa-credit-card'; tl = (item.category||'\u8BA2\u9605'); }

  let body = '';
  if (isBalance) {
    const sym = currSym(item.currency);
    const monthsLeft = item.monthlyFee > 0 ? Math.max(0, Math.floor(item.balance / item.monthlyFee)) : 0;
    const suspendStr = item.predictedSuspendDate || '\u672A\u8BA1\u7B97';
    body = (item.number ? '<div class="text-sm text-slate-300 font-mono mb-1">'+esc(item.number)+'</div>' : '') +
      '<div class="text-lg text-emerald-400 font-bold">'+sym+esc(item.balance)+'</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-receipt mr-1"></i>\u6708\u79DF '+sym+esc(item.monthlyFee)+'/\u6708 \xB7 \u6BCF\u6708'+esc(item.billingDay)+'\u65E5\u6263</div>' +
      '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-battery-half mr-1"></i>\u53EF\u6491 '+monthsLeft+' \u4E2A\u6708</div>' +
      (item.lastRecharge ? '<div class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-plus-circle mr-1"></i>\u4E0A\u6B21 '+((item.lastRecharge.amount>0)?'+':'')+esc(item.lastRecharge.amount)+' ('+esc(item.lastRecharge.date)+')</div>' : '');
  } else if (isEsim) {
    const iso = getFlag(item.number);
    body = (iso ? '<div class="text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded mb-2 inline-block">'+esc(iso)+'</div>' : '') +
      (item.number ? '<div class="text-sm text-slate-300 font-mono">'+esc(item.number)+'</div>' : '');
  } else {
    const ps = item.price ? (item.billing==='yearly' ? currSym(item.currency)+item.price+'/\u5E74' : item.billing==='once' ? currSym(item.currency)+item.price+'(\u4E00\u6B21\u6027)' : currSym(item.currency)+item.price+'/\u6708') : '';
    const regionStr = item.region ? esc(item.region) : '';
    const catStr = item.category ? esc(item.category) : '';
    const metaLine = [catStr, regionStr].filter(Boolean).join(' \xB7 ');
    body = (metaLine ? '<div class="text-xs text-slate-400 mb-1">'+metaLine+'</div>' : '') +
      (ps ? '<div class="text-sm text-emerald-400 font-semibold">'+esc(ps)+'</div>' : '') +
      (item.subId ? '<div class="text-xs text-slate-500 mt-1 truncate"><i class="fa-solid fa-id-card mr-1"></i>'+esc(item.subId)+'</div>' : '');
    if (item.url) body += '<a href="'+safeHref(item.url)+'" target="_blank" rel="noopener noreferrer" class="text-xs text-sky-400 hover:underline mt-1 inline-block"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>\u8BBF\u95EE</a>';
  }

  const idArg = jsArg(item.id);
  const renewBtn = isEsim && item.cycle ?
    '<button onclick="renewItem('+idArg+')" class="text-xs btn-touch text-sky-400 hover:text-sky-300 px-2 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors"><i class="fa-solid fa-rotate"></i> \u7EED\u671F</button>' : '';
  const rechargeBtn = isBalance ?
    '<button onclick="rechargeItem('+idArg+')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors"><i class="fa-solid fa-plus-circle"></i> \u5145\u503C</button>' : '';

  return '<div class="glass-card rounded-xl p-5">' +
    '<div class="flex justify-between items-start mb-3"><div class="flex items-center gap-2">' +
    '<div class="'+tb+' w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid '+ti+' '+tc+' text-sm"></i></div>' +
    '<span class="text-xs '+tc+' opacity-70">'+esc(tl)+'</span></div>' +
    '<span class="text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'\u5DF2\u6682\u505C':st.text)+'</span></div>' +
    '<h3 class="text-lg font-bold text-white mb-1 truncate">'+esc(item.name)+'</h3>' +
    body +
    (isBalance && item.predictedSuspendDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-solid fa-triangle-exclamation mr-1"></i>\u9884\u8BA1\u505C\u673A: '+esc(item.predictedSuspendDate)+'</div>' : '') +
    (item.expireDate ? '<div class="text-xs text-slate-400 mt-2"><i class="fa-regular fa-calendar mr-1"></i>\u5230\u671F: '+esc(item.expireDate)+'</div>' : '') +
    (item.cycle ? '<div class="text-xs text-slate-400 mt-1"><i class="fa-solid fa-arrows-rotate mr-1"></i>\u5468\u671F: '+esc(item.cycle)+'\u5929</div>' : '') +
    (item.remark ? '<div class="text-xs text-slate-500 mt-2 truncate"><i class="fa-regular fa-note-sticky mr-1"></i>'+esc(item.remark)+'</div>' : '') +
    '<div class="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">' +
    rechargeBtn +
    renewBtn +
    '<button onclick="toggleStatus('+idArg+')" class="text-xs btn-touch px-2 py-1.5 rounded-lg transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'\u542F\u7528':'\u6682\u505C')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
    '<button onclick="testNotify('+idArg+')" class="text-xs btn-touch text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" title="\u6D4B\u8BD5\u901A\u77E5"><i class="fa-solid fa-bell"></i></button>' +
    '<button onclick="editItem('+idArg+')" class="text-xs btn-touch text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
    '<button onclick="deleteItem('+idArg+')" class="text-xs btn-touch text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
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
    '<div class="col-span-4">\u540D\u79F0</div><div class="col-span-2">\u7C7B\u578B/\u53F7\u7801</div>' +
    '<div class="col-span-2">\u5230\u671F</div><div class="col-span-2">\u72B6\u6001</div>' +
    '<div class="col-span-2 text-right">\u64CD\u4F5C</div></div>';
  html += items.map(i => listRowHTML(i)).join('');
  html += '</div>';
  area.innerHTML = html;
}

function listRowMobileHTML(item) {
  const diff = getDiff(item);
  const isBalance = item.type === 'balance';
  const st = isBalance ? statusInfoBalance(diff) : statusInfo(diff);
  const isEsim = item.type === 'esim';
  const idArg = jsArg(item.id);
  let tc, ti;
  if (isBalance) { tc = 'text-amber-400'; ti = 'fa-wallet'; }
  else if (isEsim) { tc = 'text-cyan-400'; ti = 'fa-sim-card'; }
  else { tc = 'text-violet-400'; ti = 'fa-credit-card'; }
  const statusText = item.status==='paused' ? '\u5DF2\u6682\u505C' : (st.text || '\u672A\u8BBE\u7F6E');
  const statusCls = item.status==='paused' ? 'text-slate-500' : st.cls;

  const sym = currSym(item.currency);
  const balanceInfo = isBalance ? sym+esc(item.balance)+' \xB7 \u6708\u79DF'+sym+esc(item.monthlyFee) : '';

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
        (!isBalance && item.expireDate ? '<i class="fa-regular fa-calendar mr-1"></i>'+esc(item.expireDate) : '') +
        (item.number ? '<span class="ml-2 font-mono">'+esc(item.number)+'</span>' : '') +
        (item.category ? '<span class="ml-1">'+esc(item.category)+'</span>' : '') +
      '</div>' +
      '<div class="flex gap-1 flex-shrink-0">' +
        (isBalance ? '<button onclick="rechargeItem('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="\u5145\u503C"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
        ((isEsim || item.type === 'subscription') && item.cycle ? '<button onclick="renewItem('+idArg+')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="\u7EED\u671F"><i class="fa-solid fa-rotate"></i></button>' : '') +
        '<button onclick="toggleStatus('+idArg+')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'\u542F\u7528':'\u6682\u505C')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
        '<button onclick="testNotify('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="\u6D4B\u8BD5\u901A\u77E5"><i class="fa-solid fa-bell"></i></button>' +
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
  const flag = isEsim ? getFlag(item.number) : '';
  const idArg = jsArg(item.id);
  let sub, priceStr, iconClass;
  if (isBalance) {
    sub = item.number || '-';
    const sym = currSym(item.currency);
    priceStr = ' \xB7 '+sym+esc(item.balance)+' (\u6708\u79DF'+sym+esc(item.monthlyFee)+')';
    iconClass = 'fa-wallet text-amber-400';
  } else if (isEsim) {
    sub = item.number || '-';
    priceStr = '';
    iconClass = 'fa-sim-card text-cyan-400';
  } else {
    sub = item.category || '-';
    priceStr = item.price ? ' \xB7 '+currSym(item.currency)+esc(item.price) : '';
    iconClass = 'fa-credit-card text-violet-400';
  }

  const dateCol = isBalance ? esc(item.predictedSuspendDate || '-') : esc(item.expireDate || '-');

  return '<div class="list-row grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-white/5">' +
    '<div class="col-span-4 sm:col-span-4 flex items-center gap-2 min-w-0">' +
      '<i class="fa-solid '+iconClass+' text-sm flex-shrink-0"></i>' +
      '<span class="truncate text-sm font-medium text-white">'+esc(item.name)+priceStr+'</span></div>' +
    '<div class="col-span-2 hidden sm:block text-xs text-slate-400 truncate">'+flag+esc(sub)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 text-xs text-slate-300">'+dateCol+'</div>' +
    '<div class="col-span-2 hidden sm:block text-xs font-semibold '+(item.status==='paused'?'text-slate-500':st.cls)+'">'+(item.status==='paused'?'\u5DF2\u6682\u505C':st.text)+'</div>' +
    '<div class="col-span-3 sm:col-span-2 flex justify-end gap-1">' +
      (isBalance ? '<button onclick="rechargeItem('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="\u5145\u503C"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
      ((isEsim || item.type === 'subscription') && item.cycle ? '<button onclick="renewItem('+idArg+')" class="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-500/10" title="\u7EED\u671F"><i class="fa-solid fa-rotate"></i></button>' : '') +
      '<button onclick="toggleStatus('+idArg+')" class="text-xs px-2 py-1 rounded transition-colors '+(item.status==='paused'?'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10':'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10')+'" title="'+(item.status==='paused'?'\u542F\u7528':'\u6682\u505C')+'"><i class="fa-solid '+(item.status==='paused'?'fa-play':'fa-pause')+'"></i></button>' +
      '<button onclick="testNotify('+idArg+')" class="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10" title="\u6D4B\u8BD5\u901A\u77E5"><i class="fa-solid fa-bell"></i></button>' +
      '<button onclick="editItem('+idArg+')" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/5"><i class="fa-solid fa-pen"></i></button>' +
      '<button onclick="deleteItem('+idArg+')" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"><i class="fa-solid fa-trash"></i></button>' +
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
      let bg;
      if (e.type === 'balance') bg = 'bg-amber-500/30 text-amber-300';
      else if (e.type === 'esim') bg = 'bg-cyan-500/30 text-cyan-300';
      else bg = 'bg-violet-500/30 text-violet-300';
      html += '<div class="cal-event '+bg+' mb-0.5 cursor-pointer" onclick="editItem('+jsArg(e.id)+')" title="'+esc(e.name)+'\uFF08\u70B9\u51FB\u7F16\u8F91\uFF09">'+esc(e.name)+'</div>';
    });
    html += '</div>';
  }
  if (!Object.keys(events).length) {
    html += '<div class="text-center text-slate-500 py-6 text-sm col-span-7">\u672C\u6708\u65E0\u5230\u671F\u4E8B\u4EF6</div>';
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
  if (diff === null) return { cls:'text-slate-400', text:'\u672A\u8BBE\u7F6E' };
  if (diff < 0) return { cls:'status-expired', text:'\u5DF2\u8FC7\u671F '+Math.abs(diff)+'\u5929' };
  if (diff === 0) return { cls:'status-danger', text:'\u4ECA\u5929\u5230\u671F' };
  if (diff <= 15) return { cls:'status-warning', text:'\u5269\u4F59 '+diff+'\u5929' };
  return { cls:'status-active', text:'\u5269\u4F59 '+diff+'\u5929' };
}

function statusInfoBalance(diff) {
  if (diff === null) return { cls:'text-slate-400', text:'\u672A\u8BBE\u7F6E' };
  if (diff < 0) return { cls:'status-expired', text:'\u5DF2\u505C\u673A '+Math.abs(diff)+'\u5929' };
  if (diff === 0) return { cls:'status-danger', text:'\u5373\u5C06\u505C\u673A' };
  if (diff <= 15) return { cls:'status-warning', text:diff+'\u5929\u540E\u505C\u673A' };
  return { cls:'status-active', text:diff+'\u5929\u540E\u505C\u673A' };
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
function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '\xA5'; }

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
  const typeLabel = type === 'esim' ? ' eSIM' : type === 'balance' ? ' \u8BDD\u8D39' : ' \u8BA2\u9605';
  document.getElementById('modal-title').textContent = (item ? '\u7F16\u8F91' : '\u6DFB\u52A0') + typeLabel;
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
    document.getElementById('form-status').value = item.status || 'active';
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
    status: document.getElementById('form-status').value,
    remindDays: getSelectedRemindDays(),
    balance: document.getElementById('form-balance').value,
    monthlyFee: document.getElementById('form-monthly-fee').value,
    billingDay: document.getElementById('form-billing-day').value,
  };

  // Client-side validation for non-balance types
  if (body.type !== 'balance' && !body.expireDate) {
    showToast('\u5230\u671F\u65E5\u671F\u4E0D\u80FD\u4E3A\u7A7A', 'error'); return;
  }
  // Client-side validation for balance type
  if (body.type === 'balance') {
    if (!body.balance && body.balance !== 0) { showToast('\u8BF7\u8F93\u5165\u5F53\u524D\u4F59\u989D', 'error'); return; }
    if (!body.monthlyFee && body.monthlyFee !== 0) { showToast('\u8BF7\u8F93\u5165\u6708\u79DF', 'error'); return; }
    if (!body.billingDay) { showToast('\u8BF7\u8F93\u5165\u6263\u8D39\u65E5', 'error'); return; }
  }

  const btn = e.target.querySelector('[type="submit"]');
  const origHTML = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>\u4FDD\u5B58\u4E2D...';
  try {
    const res = id ? await api('PUT', '/api/items/'+id, body) : await api('POST', '/api/items', body);
    const data = await res.json();
    if (data.success) { closeModal(); await loadItems(); }
    else if (data.message) showToast(data.message, 'error');
    else showToast('\u4FDD\u5B58\u5931\u8D25', 'error');
  } catch { showToast('\u4FDD\u5B58\u5931\u8D25', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = origHTML; }
}

// ==================== ACTIONS ====================
function editItem(id) { const item = allItems.find(i => i.id === id); if (item) openModal(item.type, item); }

async function deleteItem(id) {
  if (!confirm('\u786E\u5B9A\u5220\u9664\u6B64\u8BB0\u5F55\uFF1F')) return;
  try {
    showToast('\u5220\u9664\u4E2D...', 'info');
    const res = await api('DELETE', '/api/items/'+id);
    const data = await res.json();
    if (data.success) { showToast('\u5DF2\u5220\u9664', 'success'); await loadItems(); }
    else showToast(data.message || '\u5220\u9664\u5931\u8D25', 'error');
  } catch { showToast('\u5220\u9664\u5931\u8D25', 'error'); }
}

async function renewItem(id) {
  if (!confirm('\u786E\u5B9A\u7EED\u671F\uFF1F\u5C06\u81EA\u52A8\u5EF6\u957F\u5230\u671F\u65E5\u671F\u3002')) return;
  try {
    const res = await api('POST', '/api/items/'+id+'/renew');
    const data = await res.json();
    if (data.success) { await loadItems(); showToast('\u7EED\u671F\u6210\u529F', 'success'); }
    else showToast(data.message || '\u7EED\u671F\u5931\u8D25', 'error');
  } catch { showToast('\u7EED\u671F\u5931\u8D25', 'error'); }
}

async function testNotify(id) {
  const res = await api('POST', '/api/items/'+id+'/test-notify');
  const data = await res.json();
  if (data.success) showToast('\u2705 \u6D4B\u8BD5\u901A\u77E5\u5DF2\u53D1\u9001', 'success');
  else showToast(data.message || '\u53D1\u9001\u5931\u8D25', 'error');
}

function rechargeItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const sym = currSym(item.currency);
  const overlay = document.getElementById('recharge-overlay');
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-note').value = '';
  document.getElementById('recharge-info').textContent = '\u5F53\u524D\u4F59\u989D: ' + sym + item.balance;
  document.getElementById('recharge-form').onsubmit = async function(e) {
    e.preventDefault();
    const amount = document.getElementById('recharge-amount').value;
    const note = document.getElementById('recharge-note').value || '';
    if (!amount) return;
    overlay.classList.add('hidden'); overlay.classList.remove('flex');
    try {
      const res = await api('POST', '/api/items/'+id+'/recharge', { amount: parseFloat(amount), note });
      const data = await res.json();
      if (data.success) { await loadItems(); showToast('\u5145\u503C\u6210\u529F\uFF01\u65B0\u4F59\u989D: '+sym+data.newBalance, 'success'); }
      else showToast(data.message || '\u5145\u503C\u5931\u8D25', 'error');
    } catch { showToast('\u5145\u503C\u5931\u8D25', 'error'); }
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
      const skipped = result.skipped ? '\uFF0C\u8DF3\u8FC7 ' + result.skipped + ' \u6761' : '';
      const details = result.errors && result.errors.length
        ? '\\n\u524D\u51E0\u6761\u9519\u8BEF\uFF1A\\n' + result.errors.map(e => '#' + (e.index + 1) + ' ' + (e.name || '') + ' ' + e.message).join('\\n')
        : '';
      showToast('\u5BFC\u5165\u5B8C\u6210\uFF01\u65B0\u589E ' + result.added + ' \u6761' + skipped, 'success');
      await loadItems();
    } else {
      showToast(result.message || '\u5BFC\u5165\u5931\u8D25', 'error');
    }
  } catch (e) {
    showToast('JSON \u89E3\u6790\u5931\u8D25: ' + e.message, 'error');
  }
  input.value = '';
}

let historyData = [];
let historyFilter = 'all';

async function openHistory() {
  hideMenu();
  const overlay = document.getElementById('history-overlay');
  const content = document.getElementById('history-content');
  content.innerHTML = '<div class="text-sm text-slate-400 py-8 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>\u52A0\u8F7D\u4E2D...</div>';
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
    content.innerHTML = '<div class="text-sm text-slate-500 py-10 text-center">' + (historyFilter !== 'all' ? '\u8BE5\u7C7B\u578B\u6682\u65E0\u8BB0\u5F55' : '\u6682\u65E0\u64CD\u4F5C\u5386\u53F2') + '</div>';
    return;
  }
  content.innerHTML = data.map(historyHTML).join('');
}

function historyHTML(entry) {
  const actionMap = {
    create: ['\u65B0\u589E', 'fa-plus', 'text-emerald-400'],
    update: ['\u66F4\u65B0', 'fa-pen', 'text-sky-400'],
    delete: ['\u5220\u9664', 'fa-trash', 'text-red-400'],
    renew: ['\u7EED\u671F', 'fa-rotate', 'text-cyan-400'],
    recharge: ['\u5145\u503C', 'fa-plus-circle', 'text-amber-400'],
    import: ['\u5BFC\u5165', 'fa-upload', 'text-violet-400'],
  };
  const cfg = actionMap[entry.action] || [entry.action || '\u64CD\u4F5C', 'fa-circle-info', 'text-slate-400'];
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('zh-CN', { hour12:false }) : '';
  const itemName = entry.itemName ? esc(entry.itemName) : '\u6279\u91CF\u64CD\u4F5C';
  const typeLabel = entry.itemType === 'esim' ? 'eSIM' : entry.itemType === 'balance' ? '\u8BDD\u8D39' : entry.itemType === 'subscription' ? '\u8BA2\u9605' : '';
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
  if (entry.action === 'renew' && d.newExpireDate) return '\u65B0\u5230\u671F\u65E5\uFF1A' + esc(d.newExpireDate);
  if (entry.action === 'recharge') {
    const parts = [];
    if (d.amount != null) parts.push('\u91D1\u989D\uFF1A' + esc(d.amount));
    if (d.newBalance != null) parts.push('\u65B0\u4F59\u989D\uFF1A' + esc(d.newBalance));
    if (d.predictedSuspendDate) parts.push('\u9884\u8BA1\u505C\u673A\uFF1A' + esc(d.predictedSuspendDate));
    return parts.join(' \xB7 ');
  }
  if (entry.action === 'import') return '\u65B0\u589E ' + (d.added || 0) + ' \u6761\uFF0C\u8DF3\u8FC7 ' + (d.skipped || 0) + ' \u6761\uFF0C\u603B\u8BA1 ' + (d.total || 0) + ' \u6761';
  return '';
}

async function clearHistory() {
  if (!confirm('\u786E\u5B9A\u6E05\u7A7A\u64CD\u4F5C\u5386\u53F2\uFF1F')) return;
  const res = await api('DELETE', '/api/history');
  const data = await res.json();
  if (data.success) openHistory();
  else showToast(data.message || '\u6E05\u7A7A\u5931\u8D25', 'error');
}

function downloadDemo() {
  toggleMenu();
  const demo = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    count: 4,
    items: [
      { type: 'esim', name: '\u7F8E\u56FD\u4FDD\u53F7\u5361', number: '+120****1234', expireDate: '2026-12-31', cycle: 180, remark: 'Ultra Mobile \u4FDD\u53F7', status: 'active' },
      { type: 'esim', name: '\u65E5\u672C IIJmio', number: '+819****4567', expireDate: '2026-09-15', cycle: 365, remark: '', status: 'active' },
      { type: 'subscription', name: 'ChatGPT Plus', category: 'AI \u5DE5\u5177', region: 'US', subId: '', expireDate: '2026-07-20', price: '20', billing: 'monthly', currency: 'USD', autoRenew: true, remindDays: [3, 1, 0], url: 'https://chat.openai.com', remark: '', status: 'active' },
      { type: 'subscription', name: 'YouTube Premium', category: '\u89C6\u9891\u4F1A\u5458', region: 'TR', subId: '', expireDate: '2026-08-01', price: '99.99', billing: 'yearly', currency: 'TRY', autoRenew: false, remindDays: [7, 3, 1], url: 'https://youtube.com/premium', remark: '\u571F\u8033\u5176\u533A', status: 'active' },
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
    const ro = document.getElementById('recharge-overlay');
    if (ro) { ro.classList.add('hidden'); ro.classList.remove('flex'); }
    const menu = document.getElementById('dropdown-menu');
    if (menu) menu.classList.add('hidden');
    return;
  }
  // Skip shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  // / = focus search
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
    if (data.success) { showToast(newStatus === 'paused' ? '\u5DF2\u6682\u505C' : '\u5DF2\u542F\u7528', 'success'); await loadItems(); }
    else showToast(data.message || '\u64CD\u4F5C\u5931\u8D25', 'error');
  } catch { showToast('\u64CD\u4F5C\u5931\u8D25', 'error'); }
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
`;
}

// src/ui/styles.js
function getStyles() {
  return `    * { box-sizing: border-box; }
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
    .toast-container { position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:0.5rem; pointer-events:none; }
    .toast { pointer-events:auto; padding:0.75rem 1.25rem; border-radius:0.75rem; font-size:0.875rem; font-weight:500; color:#fff; backdrop-filter:blur(12px); animation:toastIn 0.3s ease; max-width:24rem; text-align:center; }
    .toast-success { background:rgba(16,185,129,0.9); }
    .toast-error { background:rgba(239,68,68,0.9); }
    .toast-info { background:rgba(56,189,248,0.9); }
    @keyframes toastIn { from{opacity:0;transform:translateY(-1rem)} to{opacity:1;transform:translateY(0)} }
    @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-1rem)} }
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
`;
}

// src/ui/template.js
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
	<head>
	  <meta charset="UTF-8">
	    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">
	    <meta name="apple-mobile-web-app-capable" content="yes">
	  <meta name="theme-color" content="#0ea5e9">
	    <title>Sub-Tracker | eSIM \u4FDD\u53F7 & \u8BA2\u9605\u7BA1\u7406</title>
	  <link rel="manifest" href="/manifest.webmanifest">
	  <link rel="icon" href="/favicon.ico" sizes="any">
	  <link rel="icon" href="/icon.svg" type="image/svg+xml">
	  <link rel="apple-touch-icon" href="/icon-192.png">
	  <script src="https://cdn.tailwindcss.com"><\/script>
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
      <h2 class="text-2xl font-bold text-white mb-2">\u5B89\u5168\u9A8C\u8BC1</h2>
      <p class="text-slate-400 text-sm mb-8">\u5411\u5DF2\u914D\u7F6E\u7684\u767B\u5F55\u901A\u9053\u83B7\u53D6\u9A8C\u8BC1\u7801</p>
      <div class="mb-6">
        <input id="otp-input" type="text" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="\u8F93\u5165 6 \u4F4D\u9A8C\u8BC1\u7801"
          class="glass-input w-full px-4 py-4 rounded-xl text-center text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.5em] font-mono">
      </div>
      <div class="flex flex-col gap-3">
        <button onclick="verifyOTP()" class="btn-primary w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> \u767B\u5F55
        </button>
        <button onclick="sendOTP()" id="send-btn" class="w-full py-3.5 rounded-xl font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2">
          <i class="fa-solid fa-key"></i> \u83B7\u53D6\u9A8C\u8BC1\u7801
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
          <p class="text-slate-400 mt-1 text-xs sm:text-sm">eSIM \u4FDD\u53F7 & \u8BA2\u9605\u8D39\u7528\u7BA1\u7406\u770B\u677F</p>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span class="text-xs sm:text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-full self-start sm:self-auto" id="today-display"></span>
          <div class="flex items-center gap-2">
            <button onclick="openModal('esim')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-sim-card"></i> eSIM
            </button>
            <button onclick="openModal('subscription')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-credit-card"></i> \u8BA2\u9605
            </button>
            <button onclick="openModal('balance')" class="btn-primary px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <i class="fa-solid fa-wallet"></i> \u8BDD\u8D39
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
          <i class="fa-solid fa-globe mr-1"></i>\u5168\u90E8
        </button>
        <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-sim-card mr-1"></i>eSIM
        </button>
        <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-credit-card mr-1"></i>\u8BA2\u9605
        </button>
        <button onclick="setFilter('balance')" data-filter="balance" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
          <i class="fa-solid fa-wallet mr-1"></i>\u8BDD\u8D39
        </button>
      </div>
      <div class="flex gap-1 glass rounded-lg p-1 flex-shrink-0">
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
      <select id="sort-select" onchange="renderItems()" class="glass-input px-3 py-1.5 rounded-lg text-xs flex-shrink-0">
        <option value="expire">\u6309\u5230\u671F\u65E5</option>
        <option value="name">\u6309\u540D\u79F0</option>
        <option value="price">\u6309\u8D39\u7528</option>
      </select>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
        <input id="search-input" type="text" placeholder="\u641C\u7D22\u540D\u79F0\u3001\u53F7\u7801\u3001\u5206\u7C7B\u3001\u533A\u57DF\u3001\u5907\u6CE8..."
          oninput="debouncedRender()"
          class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-sm">
      </div>
    </div>

    <!-- Content area -->
    <div id="content-area"></div>
    <div id="empty-state" class="hidden text-center py-16 text-slate-500">
      <i class="fa-solid fa-inbox text-5xl mb-4 opacity-30"></i>
      <p class="text-lg mb-1">\u6682\u65E0\u6570\u636E</p>
      <p class="text-sm mb-6">\u6DFB\u52A0\u4F60\u7684\u7B2C\u4E00\u4E2A eSIM \u5361\u3001\u8BA2\u9605\u670D\u52A1\u6216\u8BDD\u8D39\u7BA1\u7406</p>
      <div class="flex gap-3 justify-center flex-wrap">
        <button onclick="openModal('esim')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-sim-card"></i> \u6DFB\u52A0 eSIM
        </button>
        <button onclick="openModal('subscription')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-credit-card"></i> \u6DFB\u52A0\u8BA2\u9605
        </button>
        <button onclick="openModal('balance')" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-wallet"></i> \u6DFB\u52A0\u8BDD\u8D39
        </button>
      </div>
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
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u540D\u79F0 *</label>
            <input id="form-name" type="text" required placeholder="\u5982: T-Mobile eSIM / Netflix" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div id="field-number" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u53F7\u7801</label>
            <input id="form-number" type="text" placeholder="+861****8000" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
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
              <option value="CN">\u5927\u9646</option>
              <option value="HK">\u9999\u6E2F</option>
              <option value="TW">\u53F0\u6E7E</option>
              <option value="US">\u7F8E\u533A</option>
              <option value="JP">\u65E5\u533A</option>
              <option value="KR">\u97E9\u533A</option>
              <option value="TR">\u571F\u8033\u5176</option>
              <option value="NG">\u5C3C\u65E5\u5229\u4E9A</option>
              <option value="IN">\u5370\u5EA6</option>
              <option value="BR">\u5DF4\u897F</option>
              <option value="AR">\u963F\u6839\u5EF7</option>
              <option value="PH">\u83F2\u5F8B\u5BBE</option>
              <option value="MY">\u9A6C\u6765\u897F\u4E9A</option>
              <option value="SG">\u65B0\u52A0\u5761</option>
              <option value="EU">\u6B27\u6D32</option>
              <option value="OTHER">\u5176\u4ED6</option>
            </select>
          </div>
          <div id="field-sub-id" class="hidden">
            <label class="text-sm text-slate-400 mb-1 block">\u8BA2\u9605 ID / \u8D26\u53F7</label>
            <input id="form-sub-id" type="text" placeholder="\u8D26\u53F7\u90AE\u7BB1\u6216\u8BA2\u9605ID" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5230\u671F\u65E5\u671F *</label>
            <input id="form-expire" type="date" min="2020-01-01" max="2035-12-31" class="glass-input w-full px-4 py-3 rounded-xl text-sm" lang="zh-CN">
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
          <div id="field-balance" class="hidden">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u5F53\u524D\u4F59\u989D *</label>
                <input id="form-balance" type="number" step="0.01" min="0" placeholder="50.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u6708\u79DF *</label>
                <input id="form-monthly-fee" type="number" step="0.01" min="0" placeholder="18.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u6263\u8D39\u65E5 *</label>
                <input id="form-billing-day" type="number" min="1" max="28" placeholder="5" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              </div>
            </div>
          </div>
          <div id="field-price" class="hidden">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-sm text-slate-400 mb-1 block">\u8D39\u7528</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
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
                  <option value="TWD">TWD $</option>
                  <option value="KRW">KRW \u20A9</option>
                  <option value="TRY">TRY \u20BA</option>
                  <option value="THB">THB \u0E3F</option>
                  <option value="NGN">NGN \u20A6</option>
                  <option value="INR">INR \u20B9</option>
                  <option value="PHP">PHP \u20B1</option>
                  <option value="MYR">MYR RM</option>
                  <option value="SGD">SGD $</option>
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
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u72B6\u6001</label>
            <select id="form-status" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
              <option value="active">\u542F\u7528</option>
              <option value="paused">\u6682\u505C</option>
            </select>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>\u4FDD\u5B58</button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u53D6\u6D88</button>
        </div>
      </form>
    </div>
	  </div>

	  <!-- ========== HISTORY MODAL ========== -->
	  <div id="history-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
	    <div class="glass rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[86vh] overflow-y-auto fade-in">
	      <div class="flex justify-between items-center mb-6 gap-3">
	        <h3 class="text-xl font-bold text-white">\u64CD\u4F5C\u5386\u53F2</h3>
	        <div class="flex items-center gap-2">
	          <button onclick="clearHistory()" class="text-xs text-red-300 hover:text-red-200 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors">\u6E05\u7A7A</button>
	          <button onclick="closeHistory()" class="text-slate-400 hover:text-white text-xl"><i class="fa-solid fa-xmark"></i></button>
	        </div>
	      </div>
	      <div id="history-filters" class="flex flex-wrap gap-2 mb-4">
	        <button onclick="filterHistory('all')" data-hfilter="all" class="hfilter-tab tab-active px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all">\u5168\u90E8</button>
	        <button onclick="filterHistory('create')" data-hfilter="create" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus mr-1"></i>\u65B0\u589E</button>
	        <button onclick="filterHistory('update')" data-hfilter="update" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-pen mr-1"></i>\u66F4\u65B0</button>
	        <button onclick="filterHistory('delete')" data-hfilter="delete" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-trash mr-1"></i>\u5220\u9664</button>
	        <button onclick="filterHistory('renew')" data-hfilter="renew" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-rotate mr-1"></i>\u7EED\u671F</button>
	        <button onclick="filterHistory('recharge')" data-hfilter="recharge" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-plus-circle mr-1"></i>\u5145\u503C</button>
	        <button onclick="filterHistory('import')" data-hfilter="import" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-upload mr-1"></i>\u5BFC\u5165</button>
	      </div>
	      <div id="history-content" class="space-y-2"></div>
	    </div>
	  </div>
	  <!-- ========== RECHARGE MODAL ========== -->
	  <div id="recharge-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
	    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in">
	      <h3 class="text-lg font-bold text-white mb-4">\u5145\u503C</h3>
	      <p id="recharge-info" class="text-sm text-slate-400 mb-4"></p>
	      <form id="recharge-form">
	        <div class="space-y-3">
	          <div>
	            <label class="text-sm text-slate-400 mb-1 block">\u5145\u503C\u91D1\u989D\uFF08\u8D1F\u6570\u4E3A\u6821\u6B63\u6263\u51CF\uFF09</label>
	            <input id="recharge-amount" type="number" step="0.01" required placeholder="50.00" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
	          </div>
	          <div>
	            <label class="text-sm text-slate-400 mb-1 block">\u5907\u6CE8\uFF08\u53EF\u9009\uFF09</label>
	            <input id="recharge-note" type="text" placeholder="\u5982\uFF1A\u5FAE\u4FE1\u5145\u503C" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
	          </div>
	        </div>
	        <div class="flex gap-3 mt-5">
	          <button type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-check mr-1"></i>\u786E\u8BA4\u5145\u503C</button>
	          <button type="button" onclick="document.getElementById('recharge-overlay').classList.add('hidden');document.getElementById('recharge-overlay').classList.remove('flex');" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u53D6\u6D88</button>
	        </div>
	      </form>
	    </div>
	  </div>


	  <!-- ========== TOAST ========== -->
	  <div id="toast-container" class="toast-container"></div>

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
	    <button onclick="downloadDemo()" class="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/10 transition-colors">
	      <i class="fa-solid fa-download mr-2 text-slate-500"></i>\u4E0B\u8F7D\u5BFC\u5165\u793A\u4F8B
	    </button>
	    <button onclick="openHistory()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
	      <i class="fa-solid fa-clock-rotate-left mr-2 text-cyan-400"></i>\u64CD\u4F5C\u5386\u53F2
	    </button>
	    <input type="file" id="import-file" accept=".json" class="hidden" onchange="importJSON(this)">
    <hr class="border-white/10 my-1">
    <button onclick="logout()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-right-from-bracket mr-2"></i>\u9000\u51FA\u767B\u5F55
    </button>
  </div>

<script>
${getClientScript()}
<\/script>
</body>
</html>`;
}

// src/ui/brand-assets.js
var ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">\n  <title id="title">Sub-Tracker icon</title>\n  <desc id="desc">A rounded dark app icon with a tracked subscription card, reminder ring, and balance marker.</desc>\n  <defs>\n    <linearGradient id="bg" x1="86" y1="40" x2="438" y2="470" gradientUnits="userSpaceOnUse">\n      <stop stop-color="#082f49"/>\n      <stop offset="0.48" stop-color="#0f766e"/>\n      <stop offset="1" stop-color="#312e81"/>\n    </linearGradient>\n    <linearGradient id="card" x1="154" y1="116" x2="368" y2="386" gradientUnits="userSpaceOnUse">\n      <stop stop-color="#f8fafc"/>\n      <stop offset="1" stop-color="#dbeafe"/>\n    </linearGradient>\n    <linearGradient id="accent" x1="128" y1="111" x2="367" y2="347" gradientUnits="userSpaceOnUse">\n      <stop stop-color="#22d3ee"/>\n      <stop offset="1" stop-color="#2563eb"/>\n    </linearGradient>\n    <linearGradient id="coin" x1="319" y1="298" x2="425" y2="413" gradientUnits="userSpaceOnUse">\n      <stop stop-color="#fde68a"/>\n      <stop offset="1" stop-color="#f59e0b"/>\n    </linearGradient>\n    <filter id="shadow" x="82" y="66" width="360" height="392" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">\n      <feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#020617" flood-opacity="0.32"/>\n    </filter>\n  </defs>\n\n  <rect width="512" height="512" rx="112" fill="url(#bg)"/>\n  <path d="M86 376c74-6 115-42 148-94 51-80 95-136 191-147" fill="none" stroke="#67e8f9" stroke-width="24" stroke-linecap="round" opacity="0.18"/>\n  <path d="M112 138c54-45 121-62 199-51 57 8 96 31 124 61" fill="none" stroke="#bae6fd" stroke-width="12" stroke-linecap="round" opacity="0.22"/>\n\n  <g filter="url(#shadow)">\n    <rect x="130" y="101" width="252" height="310" rx="54" fill="url(#accent)"/>\n    <rect x="158" y="129" width="196" height="254" rx="34" fill="url(#card)"/>\n    <path d="M202 129h108v38c0 13-11 24-24 24h-60c-13 0-24-11-24-24v-38Z" fill="#0ea5e9"/>\n    <path d="M214 244h84M214 292h54" stroke="#0f172a" stroke-width="24" stroke-linecap="round"/>\n    <path d="M214 332h46" stroke="#0284c7" stroke-width="18" stroke-linecap="round" opacity="0.7"/>\n    <path d="M202 202h32M278 202h32" stroke="#38bdf8" stroke-width="20" stroke-linecap="round"/>\n  </g>\n\n  <circle cx="363" cy="356" r="62" fill="url(#coin)"/>\n  <path d="M363 322v68M333 345h60M333 367h60" stroke="#78350f" stroke-width="16" stroke-linecap="round"/>\n  <path d="M382 169c24 19 39 48 39 81 0 19-5 37-14 52" fill="none" stroke="#f8fafc" stroke-width="18" stroke-linecap="round" opacity="0.88"/>\n  <circle cx="394" cy="149" r="22" fill="#22c55e"/>\n  <path d="M385 149l7 7 16-18" fill="none" stroke="#052e16" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>\n</svg>';
var ICON_192_PNG_BASE64 = "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";
var ICON_512_PNG_BASE64 = "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";
var FAVICON_ICO_BASE64 = "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";

// src/ui/pwa.js
function getManifest() {
  return {
    name: "Sub-Tracker",
    short_name: "SubTracker",
    description: "eSIM \u4FDD\u53F7\u3001\u8BA2\u9605\u8D39\u7528\u548C\u8BDD\u8D39\u4F59\u989D\u7BA1\u7406\u770B\u677F",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0ea5e9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
    ]
  };
}
function getIconSVG() {
  return ICON_SVG;
}
function bytesFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function getIconPNG(size) {
  if (size === 192) return bytesFromBase64(ICON_192_PNG_BASE64);
  if (size === 512) return bytesFromBase64(ICON_512_PNG_BASE64);
  return null;
}
function getFaviconICO() {
  return bytesFromBase64(FAVICON_ICO_BASE64);
}
var SW_VERSION = Date.now().toString(36);
function getServiceWorker() {
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
  return new Response('<!doctype html><meta charset="utf-8"><title>Sub-Tracker</title><body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:28rem;padding:2rem;text-align:center"><h1>Sub-Tracker</h1><p>\u5F53\u524D\u79BB\u7EBF\uFF0C\u5DF2\u7F13\u5B58\u7684\u5E94\u7528\u58F3\u4E0D\u53EF\u7528\u3002\u8BF7\u6062\u590D\u7F51\u7EDC\u540E\u5237\u65B0\u3002</p></main></body>', {
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
    return await cache.match(request) || new Response(JSON.stringify({ success:false, message:'\u79BB\u7EBF\u4E14\u6CA1\u6709\u5DF2\u7F13\u5B58\u6570\u636E' }), {
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

// src/router.js
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    return corsPreFlight(request, env);
  }
  if (path === "/manifest.webmanifest") {
    return textResponse(JSON.stringify(getManifest()), "application/manifest+json", request, env);
  }
  if (path === "/sw.js") {
    return textResponse(getServiceWorker(), "application/javascript; charset=utf-8", request, env);
  }
  if (path === "/icon.svg") {
    return svgResponse(getIconSVG(), request, env);
  }
  if (path === "/icon-192.png") {
    return binaryResponse(getIconPNG(192), "image/png", void 0, request, env);
  }
  if (path === "/icon-512.png") {
    return binaryResponse(getIconPNG(512), "image/png", void 0, request, env);
  }
  if (path === "/favicon.ico") {
    return binaryResponse(getFaviconICO(), "image/x-icon", void 0, request, env);
  }
  if (path.startsWith("/api/auth")) {
    const result = await handleAuth(request, env, path);
    if (result) return result;
  }
  if (path.startsWith("/api/items")) {
    const result = await handleItems(request, env, path);
    if (result) return result;
  }
  if (path.startsWith("/api/history")) {
    return await handleHistory(request, env, path);
  }
  if (!path.startsWith("/api/")) {
    return htmlResponse(getHTML(), request, env);
  }
  return errorResponse("Not Found", 404, request, env);
}

// src/services/reminder.js
function currSym(code) {
  return CURRENCY_SYMBOLS[code] || code || "\xA5";
}
function tg2(s) {
  return escapeTelegramHTML(s);
}
async function checkReminders(env) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;
  const today = todayMidnight();
  const messages = [];
  for (const item of items) {
    if (item.status !== "active") continue;
    if (item.type === "balance") {
      if (item.monthlyFee <= 0) continue;
      const suspendDate = calcSuspendDate(item.balance, item.monthlyFee, item.billingDay);
      const expDate2 = /* @__PURE__ */ new Date(suspendDate + "T00:00:00Z");
      expDate2.setUTCHours(0, 0, 0, 0);
      const diffDays2 = Math.ceil((expDate2 - today) / 864e5);
      const remindDays2 = Array.isArray(item.remindDays) && item.remindDays.length > 0 ? item.remindDays : DEFAULT_REMIND_DAYS;
      if (!remindDays2.includes(diffDays2)) continue;
      const monthsLeft = item.monthlyFee > 0 ? Math.max(0, Math.floor(item.balance / item.monthlyFee)) : 0;
      const remarkText2 = item.remark ? `
\u{1F4DD} \u5907\u6CE8: ${tg2(item.remark)}` : "";
      const currSym2 = CURRENCY_SYMBOLS[item.currency] || item.currency || "\xA5";
      let urgency2;
      if (diffDays2 < 0) urgency2 = "\u274C";
      else if (diffDays2 === 0) urgency2 = "\u{1F6A8}";
      else if (diffDays2 <= 3) urgency2 = "\u26A0\uFE0F";
      else urgency2 = "\u{1F4E2}";
      const statusText2 = diffDays2 < 0 ? `\u5DF2\u505C\u673A ${Math.abs(diffDays2)} \u5929` : diffDays2 === 0 ? "\u4ECA\u5929\u6263\u8D39\uFF01\u4F59\u989D\u53EF\u80FD\u4E0D\u8DB3" : `\u9884\u8BA1 ${diffDays2} \u5929\u540E\u505C\u673A`;
      messages.push(
        `${urgency2} \u3010Sub-Tracker \u8BDD\u8D39\u505C\u673A\u63D0\u9192\u3011
\u{1F4F1} \u540D\u79F0: ${tg2(item.name)}
` + (item.number ? `\u{1F4DE} \u53F7\u7801: ${tg2(item.number)}
` : "") + `\u{1F4B0} \u4F59\u989D: ${currSym2}${item.balance}
\u{1F4B8} \u6708\u79DF: ${currSym2}${item.monthlyFee}/\u6708
\u{1F4C5} \u6BCF\u6708${item.billingDay}\u65E5\u6263\u8D39
\u23F3 ${statusText2}
\u{1F50B} \u53EF\u6491 ${monthsLeft} \u4E2A\u6708
\u{1F4C6} \u9884\u8BA1\u505C\u673A: ${suspendDate}${remarkText2}
` + (diffDays2 >= 0 ? `\u{1F449} \u8BF7\u5C3D\u5FEB\u5145\u503C\uFF01` : "")
      );
      continue;
    }
    if (!item.expireDate) continue;
    const expDate = /* @__PURE__ */ new Date(item.expireDate + "T00:00:00Z");
    expDate.setUTCHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / 864e5);
    const remindDays = Array.isArray(item.remindDays) && item.remindDays.length > 0 ? item.remindDays : DEFAULT_REMIND_DAYS;
    if (!remindDays.includes(diffDays)) continue;
    const cycleText = item.cycle ? `${item.cycle}\u5929` : "\u672A\u8BBE\u7F6E";
    const remarkText = item.remark ? `
\u{1F4DD} \u5907\u6CE8: ${tg2(item.remark)}` : "";
    const typeLabel = item.type === "esim" ? "eSIM \u4FDD\u53F7" : "\u8BA2\u9605\u7EED\u8D39";
    const typeEmoji = item.type === "esim" ? "\u{1F4F1}" : "\u{1F4E6}";
    const priceText = item.price ? `
\u{1F4B0} \u8D39\u7528: ${currSym(item.currency)}${item.price}/${item.billing === "yearly" ? "\u5E74" : item.billing === "once" ? "\u6B21" : "\u6708"}` : "";
    let urgency;
    if (diffDays < 0) urgency = "\u274C";
    else if (diffDays === 0) urgency = "\u{1F6A8}";
    else if (diffDays <= 3) urgency = "\u26A0\uFE0F";
    else urgency = "\u{1F4E2}";
    const statusText = diffDays < 0 ? `\u5DF2\u8FC7\u671F ${Math.abs(diffDays)} \u5929` : diffDays === 0 ? "\u4ECA\u5929\u5230\u671F\uFF01" : `\u5269\u4F59 ${diffDays} \u5929`;
    messages.push(
      `${urgency} \u3010Sub-Tracker ${typeLabel}\u63D0\u9192\u3011
${typeEmoji} \u540D\u79F0: ${tg2(item.name)}
` + (item.number ? `\u{1F4DE} \u53F7\u7801: ${tg2(item.number)}
` : "") + priceText + `
\u{1F504} \u5468\u671F: ${cycleText}
\u{1F4C5} \u5230\u671F: ${item.expireDate}
\u23F3 ${statusText}${remarkText}
` + (diffDays > 0 ? `\u{1F449} \u8BF7\u5C3D\u5FEB\u5904\u7406\uFF01` : "")
    );
  }
  if (messages.length > 0) {
    const text = messages.join("\n\n---\n\n");
    await sendNotifications(env, text, { title: "Sub-Tracker \u5230\u671F\u63D0\u9192" });
  }
}

// src/index.js
var index_default = {
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
  index_default as default
};
