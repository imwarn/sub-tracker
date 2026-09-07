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
  let allowOrigin = "";
  if (allowed) {
    const origins = allowed.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    allowOrigin = origins.includes(origin) ? origin : origins[0];
  } else if (!origin) {
    allowOrigin = "*";
  } else {
    try {
      if (request?.url) {
        const reqUrl = new URL(request.url);
        if (reqUrl.origin === origin) {
          allowOrigin = origin;
        }
      }
    } catch {
    }
  }
  const headers = {
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Headers": CORS_REQUEST_HEADERS
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return headers;
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

// src/data/currencies.js
var ISO_CURRENCIES = [
  // Top Asian / Domestic
  { code: "CNY", name: "\u4EBA\u6C11\u5E01", symbol: "\xA5", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "USD", name: "\u7F8E\u5143", symbol: "$", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "EUR", name: "\u6B27\u5143", symbol: "\u20AC", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "GBP", name: "\u82F1\u9551", symbol: "\xA3", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "JPY", name: "\u65E5\u5143", symbol: "\xA5", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "HKD", name: "\u6E2F\u5E01", symbol: "HK$", flag: "\u{1F1ED}\u{1F1F0}" },
  { code: "TWD", name: "\u65B0\u53F0\u5E01", symbol: "NT$", flag: "\u{1F1F9}\u{1F1FC}" },
  { code: "KRW", name: "\u97E9\u5143", symbol: "\u20A9", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "SGD", name: "\u65B0\u52A0\u5761\u5143", symbol: "S$", flag: "\u{1F1F8}\u{1F1EC}" },
  { code: "MYR", name: "\u9A6C\u6765\u897F\u4E9A\u6797\u5409\u7279", symbol: "RM", flag: "\u{1F1F2}\u{1F1FE}" },
  { code: "THB", name: "\u6CF0\u94E2", symbol: "\u0E3F", flag: "\u{1F1F9}\u{1F1ED}" },
  { code: "PHP", name: "\u83F2\u5F8B\u5BBE\u6BD4\u7D22", symbol: "\u20B1", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "IDR", name: "\u5370\u5C3C\u76FE", symbol: "Rp", flag: "\u{1F1EE}\u{1F1E9}" },
  { code: "VND", name: "\u8D8A\u5357\u76FE", symbol: "\u20AB", flag: "\u{1F1FB}\u{1F1F3}" },
  { code: "INR", name: "\u5370\u5EA6\u5362\u6BD4", symbol: "\u20B9", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "PKR", name: "\u5DF4\u57FA\u65AF\u5766\u5362\u6BD4", symbol: "\u20A8", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "BDT", name: "\u5B5F\u52A0\u62C9\u5854\u5361", symbol: "\u09F3", flag: "\u{1F1E7}\u{1F1E9}" },
  // Popular Low-Cost / Cross-Region Subscription Currencies
  { code: "TRY", name: "\u571F\u8033\u5176\u91CC\u62C9", symbol: "\u20BA", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "NGN", name: "\u5C3C\u65E5\u5229\u4E9A\u5948\u62C9", symbol: "\u20A6", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "ARS", name: "\u963F\u6839\u5EF7\u6BD4\u7D22", symbol: "$", flag: "\u{1F1E6}\u{1F1F7}" },
  { code: "EGP", name: "\u57C3\u53CA\u9551", symbol: "E\xA3", flag: "\u{1F1EA}\u{1F1EC}" },
  { code: "BRL", name: "\u5DF4\u897F\u96F7\u4E9A\u5C14", symbol: "R$", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "KZT", name: "\u54C8\u8428\u514B\u65AF\u5766\u575A\u6208", symbol: "\u20B8", flag: "\u{1F1F0}\u{1F1FF}" },
  { code: "UAH", name: "\u4E4C\u514B\u5170\u683C\u91CC\u592B\u7EB3", symbol: "\u20B4", flag: "\u{1F1FA}\u{1F1E6}" },
  { code: "GHS", name: "\u52A0\u7EB3\u585E\u5730", symbol: "GH\u20B5", flag: "\u{1F1EC}\u{1F1ED}" },
  { code: "KES", name: "\u80AF\u5C3C\u4E9A\u5148\u4EE4", symbol: "KSh", flag: "\u{1F1F0}\u{1F1EA}" },
  { code: "ZAR", name: "\u5357\u975E\u5170\u7279", symbol: "R", flag: "\u{1F1FF}\u{1F1E6}" },
  { code: "COP", name: "\u54E5\u4F26\u6BD4\u4E9A\u6BD4\u7D22", symbol: "COL$", flag: "\u{1F1E8}\u{1F1F4}" },
  { code: "CLP", name: "\u667A\u5229\u6BD4\u7D22", symbol: "CLP$", flag: "\u{1F1E8}\u{1F1F1}" },
  { code: "PEN", name: "\u79D8\u9C81\u7D22\u5C14", symbol: "S/.", flag: "\u{1F1F5}\u{1F1EA}" },
  { code: "MXN", name: "\u58A8\u897F\u54E5\u6BD4\u7D22", symbol: "Mex$", flag: "\u{1F1F2}\u{1F1FD}" },
  // Major Developed Markets
  { code: "CAD", name: "\u52A0\u62FF\u5927\u5143", symbol: "CA$", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "AUD", name: "\u6FB3\u5927\u5229\u4E9A\u5143", symbol: "AU$", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "NZD", name: "\u65B0\u897F\u5170\u5143", symbol: "NZ$", flag: "\u{1F1F3}\u{1F1FF}" },
  { code: "CHF", name: "\u745E\u58EB\u6CD5\u90CE", symbol: "CHF", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "SEK", name: "\u745E\u5178\u514B\u6717", symbol: "kr", flag: "\u{1F1F8}\u{1F1EA}" },
  { code: "NOK", name: "\u632A\u5A01\u514B\u6717", symbol: "kr", flag: "\u{1F1F3}\u{1F1F4}" },
  { code: "DKK", name: "\u4E39\u9EA6\u514B\u6717", symbol: "kr", flag: "\u{1F1E9}\u{1F1F0}" },
  { code: "PLN", name: "\u6CE2\u5170\u5179\u7F57\u63D0", symbol: "z\u0142", flag: "\u{1F1F5}\u{1F1F1}" },
  { code: "CZK", name: "\u6377\u514B\u514B\u6717", symbol: "K\u010D", flag: "\u{1F1E8}\u{1F1FF}" },
  { code: "HUF", name: "\u5308\u7259\u5229\u798F\u6797", symbol: "Ft", flag: "\u{1F1ED}\u{1F1FA}" },
  { code: "RON", name: "\u7F57\u9A6C\u5C3C\u4E9A\u5217\u4F0A", symbol: "lei", flag: "\u{1F1F7}\u{1F1F4}" },
  { code: "BGN", name: "\u4FDD\u52A0\u5229\u4E9A\u5217\u5F17", symbol: "\u043B\u0432", flag: "\u{1F1E7}\u{1F1EC}" },
  { code: "RUB", name: "\u4FC4\u7F57\u65AF\u5362\u5E03", symbol: "\u20BD", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "ILS", name: "\u4EE5\u8272\u5217\u65B0\u8C22\u514B\u5C14", symbol: "\u20AA", flag: "\u{1F1EE}\u{1F1F1}" },
  // Middle East & Others
  { code: "AED", name: "\u963F\u8054\u914B\u8FEA\u62C9\u59C6", symbol: "AED", flag: "\u{1F1E6}\u{1F1EA}" },
  { code: "SAR", name: "\u6C99\u7279\u91CC\u4E9A\u5C14", symbol: "SAR", flag: "\u{1F1F8}\u{1F1E6}" },
  { code: "QAR", name: "\u5361\u5854\u5C14\u91CC\u4E9A\u5C14", symbol: "QR", flag: "\u{1F1F6}\u{1F1E6}" },
  { code: "KWD", name: "\u79D1\u5A01\u7279\u7B2C\u7EB3\u5C14", symbol: "KD", flag: "\u{1F1F0}\u{1F1FC}" },
  { code: "BHD", name: "\u5DF4\u6797\u7B2C\u7EB3\u5C14", symbol: "BD", flag: "\u{1F1E7}\u{1F1ED}" },
  { code: "OMR", name: "\u963F\u66FC\u91CC\u4E9A\u5C14", symbol: "OMR", flag: "\u{1F1F4}\u{1F1F2}" },
  { code: "MAD", name: "\u6469\u6D1B\u54E5\u8FEA\u62C9\u59C6", symbol: "MAD", flag: "\u{1F1F2}\u{1F1E6}" },
  { code: "GEL", name: "\u683C\u9C81\u5409\u4E9A\u62C9\u91CC", symbol: "\u20BE", flag: "\u{1F1EC}\u{1F1EA}" },
  { code: "LKR", name: "\u65AF\u91CC\u5170\u5361\u5362\u6BD4", symbol: "Rs", flag: "\u{1F1F1}\u{1F1F0}" },
  { code: "NPR", name: "\u5C3C\u6CCA\u5C14\u5362\u6BD4", symbol: "Rs", flag: "\u{1F1F3}\u{1F1F5}" },
  { code: "UYU", name: "\u4E4C\u62C9\u572D\u6BD4\u7D22", symbol: "$U", flag: "\u{1F1FA}\u{1F1FE}" },
  { code: "CRC", name: "\u54E5\u65AF\u8FBE\u9ECE\u52A0\u79D1\u6717", symbol: "\u20A1", flag: "\u{1F1E8}\u{1F1F7}" }
];
var CURRENCY_SYMBOLS = Object.fromEntries(
  ISO_CURRENCIES.map((c) => [c.code, c.symbol])
);
var CURRENCY_CODES = ISO_CURRENCIES.map((c) => c.code);
var DEFAULT_EXCHANGE_RATES = {
  CNY: 1,
  USD: 7.25,
  EUR: 7.85,
  GBP: 9.2,
  JPY: 0.048,
  HKD: 0.93,
  TWD: 0.23,
  KRW: 54e-4,
  TRY: 0.22,
  THB: 0.2,
  NGN: 48e-4,
  INR: 0.087,
  PHP: 0.13,
  MYR: 1.62,
  SGD: 5.4,
  ARS: 73e-4,
  BRL: 1.28,
  EGP: 0.15,
  KZT: 0.015,
  VND: 29e-5,
  IDR: 45e-5,
  CAD: 5.35,
  AUD: 4.75,
  NZD: 4.35,
  CHF: 8.2,
  RUB: 0.078,
  ZAR: 0.39,
  AED: 1.97,
  SAR: 1.93,
  PLN: 1.85,
  SEK: 0.7,
  NOK: 0.68,
  DKK: 1.05,
  MXN: 0.36,
  CLP: 76e-4,
  COP: 18e-4,
  PEN: 1.95,
  PKR: 0.026,
  BDT: 0.06,
  CZK: 0.31,
  HUF: 0.02,
  ILS: 1.98,
  RON: 1.58,
  BGN: 4.01,
  GHS: 0.48,
  KES: 0.056,
  UAH: 0.18,
  GEL: 2.65,
  QAR: 1.99,
  KWD: 23.6,
  BHD: 19.2,
  OMR: 18.8,
  MAD: 0.72,
  LKR: 0.024,
  NPR: 0.054,
  UYU: 0.18,
  CRC: 0.014
};

// src/data/constants.js
var ITEM_TYPES = ["esim", "subscription", "balance"];
var STATUSES = ["active", "paused"];
var BILLING_TYPES = ["monthly", "yearly", "once"];
var BILLING_MODES = ["natural", "fixed"];
var DEFAULT_REMIND_DAYS = [3, 1, 0];
var REMIND_DAY_OPTIONS = [30, 15, 7, 3, 1, 0];
var DEFAULT_CATEGORIES = [
  "AI \u670D\u52A1",
  "\u6D41\u5A92\u4F53",
  "VPN / \u8282\u70B9",
  "\u4E91\u670D\u52A1",
  "\u57DF\u540D / SSL",
  "VPS / \u670D\u52A1\u5668",
  "\u8F6F\u4EF6\u8BA2\u9605",
  "\u6E38\u620F / \u5A31\u4E50",
  "\u6548\u7387 / \u5DE5\u5177",
  "\u751F\u6D3B / \u8D2D\u7269",
  "\u5176\u4ED6"
];
var CATEGORY_ALIASES = {
  "AI": "AI \u670D\u52A1",
  "Streaming": "\u6D41\u5A92\u4F53",
  "VPN": "VPN / \u8282\u70B9",
  "Cloud": "\u4E91\u670D\u52A1",
  "Domain": "\u57DF\u540D / SSL",
  "VPS": "VPS / \u670D\u52A1\u5668",
  "Software": "\u8F6F\u4EF6\u8BA2\u9605",
  "Game": "\u6E38\u620F / \u5A31\u4E50",
  "Other": "\u5176\u4ED6"
};
function normalizeCategory(cat) {
  if (!cat) return "";
  const trimmed = String(cat).trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}
var DEFAULT_REGIONS = [
  { code: "CN", name: "\u4E2D\u56FD\u5927\u9646", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "US", name: "\u7F8E\u533A", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "HK", name: "\u9999\u6E2F", flag: "\u{1F1ED}\u{1F1F0}" },
  { code: "TW", name: "\u53F0\u6E7E", flag: "\u{1F1F9}\u{1F1FC}" },
  { code: "JP", name: "\u65E5\u672C", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "KR", name: "\u97E9\u56FD", flag: "\u{1F1F0}\u{1F1F7}" },
  { code: "TR", name: "\u571F\u8033\u5176", flag: "\u{1F1F9}\u{1F1F7}" },
  { code: "NG", name: "\u5C3C\u65E5\u5229\u4E9A", flag: "\u{1F1F3}\u{1F1EC}" },
  { code: "AR", name: "\u963F\u6839\u5EF7", flag: "\u{1F1E6}\u{1F1F7}" },
  { code: "EG", name: "\u57C3\u53CA", flag: "\u{1F1EA}\u{1F1EC}" },
  { code: "IN", name: "\u5370\u5EA6", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "BR", name: "\u5DF4\u897F", flag: "\u{1F1E7}\u{1F1F7}" },
  { code: "PK", name: "\u5DF4\u57FA\u65AF\u5766", flag: "\u{1F1F5}\u{1F1F0}" },
  { code: "PH", name: "\u83F2\u5F8B\u5BBE", flag: "\u{1F1F5}\u{1F1ED}" },
  { code: "MY", name: "\u9A6C\u6765\u897F\u4E9A", flag: "\u{1F1F2}\u{1F1FE}" },
  { code: "SG", name: "\u65B0\u52A0\u5761", flag: "\u{1F1F8}\u{1F1EC}" },
  { code: "GB", name: "\u82F1\u56FD", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "EU", name: "\u6B27\u6D32", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "OTHER", name: "\u5176\u4ED6", flag: "\u{1F310}" }
];

// src/data/store.js
var ITEMS_KEY = "items";
var SETTINGS_KEY = "settings";
var HISTORY_KEY = "history";
var HISTORY_LIMIT = 100;
function getDefaultSettings() {
  return {
    baseCurrency: "CNY",
    exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
    categories: [...DEFAULT_CATEGORIES],
    regions: [...DEFAULT_REGIONS],
    defaultRemindDays: [3, 1, 0]
  };
}
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
async function getSettings(db) {
  const defaults = getDefaultSettings();
  try {
    const custom = await db.get(SETTINGS_KEY, { type: "json" });
    if (!custom || typeof custom !== "object") return defaults;
    return {
      baseCurrency: custom.baseCurrency || defaults.baseCurrency,
      exchangeRates: { ...defaults.exchangeRates, ...custom.exchangeRates || {} },
      categories: Array.isArray(custom.categories) && custom.categories.length > 0 ? custom.categories : defaults.categories,
      regions: Array.isArray(custom.regions) && custom.regions.length > 0 ? custom.regions : defaults.regions,
      defaultRemindDays: Array.isArray(custom.defaultRemindDays) ? custom.defaultRemindDays : defaults.defaultRemindDays
    };
  } catch {
    return defaults;
  }
}
async function saveSettings(db, settings) {
  await db.put(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
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
    return corsPreFlight(request, env);
  }
  if (path === "/api/auth/send" && request.method === "POST") {
    return await sendOTP(request, env);
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
function getClientIp(request) {
  if (!request) return "127.0.0.1";
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}
async function sendOTP(request, env) {
  const ip = getClientIp(request);
  const cooldown = await getConfig(env.DB, OTP_SEND_COOLDOWN_KEY);
  const ipCooldown = await getConfig(env.DB, `admin_auth_ip_cooldown_${ip}`);
  if (cooldown || ipCooldown) {
    return errorResponse("\u9A8C\u8BC1\u7801\u53D1\u9001\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5", 429, request, env);
  }
  const channel = await getAuthNotificationChannel(env);
  if (!channel) {
    return errorResponse(
      `\u672A\u914D\u7F6E\u53EF\u7528\u7684\u767B\u5F55\u9A8C\u8BC1\u7801\u901A\u9053\u3002\u8BF7\u81F3\u5C11\u914D\u7F6E Telegram\u3001Bark\u3001\u4F01\u4E1A\u5FAE\u4FE1\u6216 Webhook \u4E2D\u7684\u4E00\u79CD\u3002
1. Cloudflare Dashboard \u2192 Workers \u2192 Settings \u2192 Variables (\u63A8\u8350)
2. KV \u6570\u636E\u5E93\u4E2D\u624B\u52A8\u6DFB\u52A0\u5BF9\u5E94\u952E\u503C\u5BF9`,
      500,
      request,
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
    await setConfig(env.DB, `admin_auth_ip_cooldown_${ip}`, "1", { expirationTtl: 60 });
    return successResponse({ channel }, request, env);
  }
  await env.DB.delete("admin_auth_code");
  await env.DB.delete("admin_auth_attempts");
  const failure = results.find((result) => result.channel === channel);
  const detail = failure?.message ? `\uFF08${failure.message}\uFF09` : "";
  return errorResponse(
    `${channelLabel(channel)} \u9A8C\u8BC1\u7801\u53D1\u9001\u5931\u8D25${detail}\uFF0C\u8BF7\u68C0\u67E5 ${channelRequirements(channel)} \u914D\u7F6E`,
    500,
    request,
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

// src/utils/date.js
var TZ_OFFSET = 8;
function todayString(now = /* @__PURE__ */ new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET * 36e5);
  return local.toISOString().split("T")[0];
}
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
function addBillingPeriod(dateStr, billing, mode = "natural", cycleDays) {
  if (mode === "fixed") {
    const days = cycleDays || (billing === "yearly" ? 365 : 30);
    return addDays(dateStr, days);
  }
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  if (billing === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().split("T")[0];
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
  if (d < thisMonthBD) {
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
var CURRENCY_RE = /^[A-Z]{3}$/;
function asString(value, fallback = "") {
  return value == null ? fallback : String(value).trim();
}
function asCurrency(value, fallback = "CNY") {
  if (!value) return fallback;
  const upper = String(value).toUpperCase().trim();
  return CURRENCY_RE.test(upper) ? upper : fallback;
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
      number: asString(data.number),
      // eSIM 余额与货币（可选，与续期联动; 缺省无余额）
      balance: data.balance == null || data.balance === "" ? null : asNumber(data.balance, null),
      currency: asCurrency(data.currency, "CNY"),
      // eSIM 激活信息（敏感，LPA = 1$sm-dp+$activationCode$confirmationCode）
      smDp: asString(data.smDp),
      activationCode: asString(data.activationCode),
      confirmationCode: asString(data.confirmationCode),
      // WID / EID（eUICC 标识，只读参考，32位）
      wid: asString(data.wid)
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
      currency: asCurrency(data.currency, "CNY"),
      remindDays: normalizeRemindDays(data.remindDays),
      predictedSuspendDate: calcSuspendDate(balance, monthlyFee, billingDay)
    };
  }
  return {
    ...base,
    category: normalizeCategory(data.category),
    region: asString(data.region),
    subId: asString(data.subId),
    price: data.price === "" || data.price == null ? null : asString(data.price),
    billing: BILLING_TYPES.includes(data.billing) ? data.billing : "monthly",
    billingMode: BILLING_MODES.includes(data.billingMode) ? data.billingMode : "natural",
    cycleDays: asInteger(data.cycleDays),
    currency: asCurrency(data.currency, "CNY"),
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
    if (data.billingMode && !BILLING_MODES.includes(data.billingMode)) return "\u8BA1\u8D39\u6A21\u5F0F\u4E0D\u6B63\u786E";
    if (!isValidHttpUrl(asString(data.url))) return "\u94FE\u63A5\u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934";
  }
  if (data.currency) {
    const cur = String(data.currency).toUpperCase().trim();
    if (!CURRENCY_RE.test(cur)) return "\u8D27\u5E01\u7C7B\u578B\u683C\u5F0F\u4E0D\u6B63\u786E (\u987B\u4E3A 3 \u4F4D ISO \u5B57\u6BCD\u4EE3\u7801)";
  }
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
    for (const key of ["number", "smDp", "activationCode", "confirmationCode", "wid"]) {
      if (data[key] !== void 0) updated[key] = asString(data[key]);
    }
    if (data.balance !== void 0) {
      updated.balance = data.balance === "" || data.balance == null ? null : asNumber(data.balance, null);
    }
    if (data.currency !== void 0) {
      updated.currency = asCurrency(data.currency, "CNY");
    }
  }
  if (existing.type === "subscription") {
    for (const key of ["category", "region", "subId", "price", "billing", "billingMode", "cycleDays", "currency", "autoRenew", "remindDays", "url"]) {
      if (data[key] !== void 0) {
        if (key === "category") updated.category = normalizeCategory(data.category);
        else if (["region", "subId", "url"].includes(key)) updated[key] = asString(data[key]);
        else if (key === "price") updated[key] = data[key] === "" || data[key] == null ? null : asString(data[key]);
        else if (key === "autoRenew") updated[key] = Boolean(data[key]);
        else if (key === "remindDays") updated[key] = normalizeRemindDays(data[key]);
        else if (key === "billingMode") updated[key] = BILLING_MODES.includes(data[key]) ? data[key] : "natural";
        else if (key === "cycleDays") updated[key] = asInteger(data[key]);
        else if (key === "currency") updated[key] = asCurrency(data[key], "CNY");
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
        else if (key === "currency") updated[key] = asCurrency(data[key], "CNY");
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
  if (request.method === "OPTIONS") return corsPreFlight(request, env);
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;
  if (path === "/api/items/export/json" && request.method === "GET") {
    return await exportJSON(request, env);
  }
  if (path === "/api/items/export/csv" && request.method === "GET") {
    return await exportCSV(request, env);
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
  if (path === "/api/items/recompute" && request.method === "POST") {
    return await recomputeBalances(request, env);
  }
  const idMatch = path.match(/^\/api\/items\/([^/]+)(\/.*)?$/);
  if (idMatch) {
    const id = idMatch[1];
    const action = idMatch[2] || "";
    if (request.method === "PUT" && action === "") {
      return await updateExistingItem(request, env, id);
    }
    if (request.method === "DELETE" && action === "") {
      return await deleteExistingItem(request, env, id);
    }
    if (request.method === "POST" && action === "/renew") {
      return await renewItem(request, env, id);
    }
    if (request.method === "POST" && action === "/recharge") {
      return await rechargeItem(request, env, id);
    }
    if (request.method === "POST" && action === "/test-notify") {
      return await testNotify(request, env, id);
    }
  }
  return null;
}
async function recomputeBalances(request, env) {
  try {
    const items = await getAllItems(env.DB);
    let fixed = 0;
    for (const item of items) {
      if (item.type !== "balance") continue;
      if (item.monthlyFee == null || item.billingDay == null) continue;
      const fresh = calcSuspendDate(item.balance, item.monthlyFee, item.billingDay);
      if (fresh !== item.predictedSuspendDate) {
        await updateItem(env.DB, item.id, (existing) => ({
          ...existing,
          predictedSuspendDate: fresh
        }));
        fixed++;
      }
    }
    return successResponse({ scanned: items.length, fixed }, request, env);
  } catch (e) {
    return errorResponse(e.message || "\u91CD\u7B97\u5931\u8D25", 400, request, env);
  }
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
async function deleteExistingItem(request, env, id) {
  const deleted = await deleteItem(env.DB, id);
  if (!deleted) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, request, env);
  await recordHistory(env, "delete", deleted);
  return successResponse(null, request, env);
}
async function renewItem(request, env, id) {
  try {
    const now = request?.headers?.get?.("x-test-now") ? new Date(request.headers.get("x-test-now")) : /* @__PURE__ */ new Date();
    let balanceDelta = null;
    let balanceNote = "";
    try {
      const body = await request.json();
      if (body && body.balanceDelta !== void 0 && body.balanceDelta !== "" && body.balanceDelta != null) {
        const n = Number(body.balanceDelta);
        if (!Number.isFinite(n)) throw new Error("\u4F59\u989D\u53D8\u52A8\u5FC5\u987B\u662F\u6570\u5B57");
        balanceDelta = n;
        balanceNote = body.balanceNote ? String(body.balanceNote).trim() : "";
      }
    } catch {
    }
    const result = await updateItem(env.DB, id, (existing) => {
      if (existing.type !== "esim" && existing.type !== "subscription") {
        throw new Error("\u4EC5 eSIM \u548C\u8BA2\u9605\u7C7B\u578B\u652F\u6301\u4E00\u952E\u7EED\u671F");
      }
      let baseDate;
      if (existing.type === "esim") {
        baseDate = todayString(now);
      } else {
        baseDate = todayString(now) > existing.expireDate ? todayString(now) : existing.expireDate;
      }
      let newExpire;
      if (existing.type === "esim") {
        const days = existing.cycle;
        if (!days) throw new Error("\u672A\u8BBE\u7F6E\u7EED\u8D39\u5468\u671F\uFF0C\u65E0\u6CD5\u7EED\u671F");
        newExpire = addDays(baseDate, days);
      } else {
        if (existing.billing === "once") throw new Error("\u4E00\u6B21\u6027\u8BA2\u9605\u65E0\u9700\u7EED\u671F");
        const mode = existing.billingMode || "natural";
        newExpire = addBillingPeriod(baseDate, existing.billing, mode, existing.cycleDays);
      }
      const updated = { ...existing, expireDate: newExpire, status: "active" };
      if (existing.type === "esim" && balanceDelta !== null) {
        const prev = existing.balance == null ? 0 : existing.balance;
        updated.balance = Math.round((prev + balanceDelta) * 100) / 100;
      }
      return updated;
    });
    if (!result) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, request, env);
    const historyDetails = { newExpireDate: result.expireDate };
    if (result.type === "esim" && balanceDelta !== null) {
      historyDetails.balanceDelta = balanceDelta;
      historyDetails.balanceAfter = result.balance;
      if (balanceNote) historyDetails.note = balanceNote;
    }
    await recordHistory(env, "renew", result, historyDetails);
    const resp = { newExpireDate: result.expireDate };
    if (result.type === "esim" && balanceDelta !== null) resp.newBalance = result.balance;
    return successResponse(resp, request, env);
  } catch (e) {
    return errorResponse(e.message || "\u7EED\u671F\u5931\u8D25", 400, request, env);
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
async function exportJSON(request, env) {
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
    request,
    env
  );
}
async function exportCSV(request, env) {
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
    request,
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
async function testNotify(request, env, id) {
  const item = await getItemById(env.DB, id);
  if (!item) return errorResponse("\u672A\u627E\u5230\u8BB0\u5F55", 404, request, env);
  const channels = await getConfiguredNotificationChannels(env);
  if (!channels.length) {
    return errorResponse("\u672A\u914D\u7F6E\u901A\u77E5\u6E20\u9053\u3002\u8BF7\u81F3\u5C11\u914D\u7F6E Telegram\u3001Bark\u3001\u4F01\u4E1A\u5FAE\u4FE1\u6216 Webhook \u4E2D\u7684\u4E00\u79CD", 400, request, env);
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
    if (results2.some((r) => r.ok)) return successResponse({ channels: results2 }, request, env);
    return errorResponse("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u901A\u77E5\u914D\u7F6E", 400, request, env);
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
  if (results.some((r) => r.ok)) return successResponse({ channels: results }, request, env);
  return errorResponse("\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u901A\u77E5\u914D\u7F6E", 400, request, env);
}

// src/handlers/settings.js
async function handleSettings(request, env, path) {
  if (request.method === "OPTIONS") return corsPreFlight(request, env);
  const authErr = await requireAuth(request, env);
  if (authErr) return authErr;
  if (path === "/api/settings" && request.method === "GET") {
    const settings = await getSettings(env.DB);
    return successResponse(settings, request, env);
  }
  if (path === "/api/settings" && (request.method === "PUT" || request.method === "POST")) {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("\u65E0\u6548\u7684 JSON \u6570\u636E", 400, request, env);
    }
    if (!body || typeof body !== "object") {
      return errorResponse("\u8BF7\u6C42\u53C2\u6570\u683C\u5F0F\u4E0D\u6B63\u786E", 400, request, env);
    }
    const current = await getSettings(env.DB);
    const updated = { ...current };
    if (body.baseCurrency) {
      const cur = String(body.baseCurrency).toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(cur)) {
        return errorResponse("\u57FA\u51C6\u8D27\u5E01\u683C\u5F0F\u4E0D\u6B63\u786E (\u987B\u4E3A 3 \u4F4D\u5B57\u6BCD\u4EE3\u7801)", 400, request, env);
      }
      updated.baseCurrency = cur;
    }
    if (body.exchangeRates && typeof body.exchangeRates === "object") {
      const cleanRates = {};
      for (const [key, val] of Object.entries(body.exchangeRates)) {
        const k = String(key).toUpperCase().trim();
        const v = Number(val);
        if (/^[A-Z]{3}$/.test(k) && Number.isFinite(v) && v > 0) {
          cleanRates[k] = v;
        }
      }
      updated.exchangeRates = { ...updated.exchangeRates, ...cleanRates };
    }
    if (Array.isArray(body.categories)) {
      const cats = body.categories.map((c) => String(c).trim()).filter((c) => c.length > 0 && c.length <= 40);
      updated.categories = [...new Set(cats)];
    }
    if (Array.isArray(body.regions)) {
      updated.regions = body.regions.filter((r) => r && (typeof r === "string" || typeof r === "object")).map((r) => {
        if (typeof r === "string") return { code: r.toUpperCase().trim(), name: r.trim(), flag: "\u{1F310}" };
        return {
          code: String(r.code || "").toUpperCase().trim(),
          name: String(r.name || r.code || "").trim(),
          flag: String(r.flag || "\u{1F310}").trim()
        };
      }).filter((r) => r.code.length > 0);
    }
    if (Array.isArray(body.defaultRemindDays)) {
      const days = body.defaultRemindDays.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 365);
      if (days.length > 0) {
        updated.defaultRemindDays = [...new Set(days)].sort((a, b) => b - a);
      }
    }
    await saveSettings(env.DB, updated);
    try {
      await addHistory(env.DB, {
        action: "update_settings",
        details: { baseCurrency: updated.baseCurrency }
      });
    } catch (err) {
      console.error("History write failed for settings:", err);
    }
    return successResponse(updated, request, env);
  }
  return errorResponse("Not Found", 404, request, env);
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
function isoToFlag(iso) {
  if (!iso || typeof iso !== "string" || iso.length !== 2) return "\u{1F310}";
  const codePoints = iso.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
function getAllCountries() {
  const map = /* @__PURE__ */ new Map();
  map.set("CN", { code: "CN", name: "\u4E2D\u56FD\u5927\u9646", flag: "\u{1F1E8}\u{1F1F3}" });
  map.set("HK", { code: "HK", name: "\u4E2D\u56FD\u9999\u6E2F", flag: "\u{1F1ED}\u{1F1F0}" });
  map.set("MO", { code: "MO", name: "\u4E2D\u56FD\u6FB3\u95E8", flag: "\u{1F1F2}\u{1F1F4}" });
  map.set("TW", { code: "TW", name: "\u4E2D\u56FD\u53F0\u6E7E", flag: "\u{1F1F9}\u{1F1FC}" });
  map.set("US", { code: "US", name: "\u7F8E\u56FD", flag: "\u{1F1FA}\u{1F1F8}" });
  map.set("GB", { code: "GB", name: "\u82F1\u56FD", flag: "\u{1F1EC}\u{1F1E7}" });
  for (const info of Object.values(COUNTRY_MAP)) {
    if (!map.has(info.code)) {
      map.set(info.code, {
        code: info.code,
        name: info.name,
        flag: isoToFlag(info.code)
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
function getCountryMap() {
  return COUNTRY_MAP;
}

// src/utils/stats.js
function countUrgent(items, now = /* @__PURE__ */ new Date()) {
  const DAY_MS = 864e5;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  let count = 0;
  for (const i of items) {
    if (i.status === "paused") continue;
    const dateStr = i.type === "balance" ? i.predictedSuspendDate : i.expireDate;
    if (!dateStr) continue;
    const diff = Math.ceil((/* @__PURE__ */ new Date(dateStr + "T00:00:00") - base) / DAY_MS);
    if (!isNaN(diff) && diff <= 15) count++;
  }
  return count;
}
function sortItemsByPaused(items, sortBy = "expire", now = /* @__PURE__ */ new Date()) {
  const DAY_MS = 864e5;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  items.sort((a, b) => {
    const ap = a.status === "paused" ? 1 : 0;
    const bp = b.status === "paused" ? 1 : 0;
    if (ap !== bp) return ap - bp;
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "", "zh");
    if (sortBy === "price") {
      const pa = a.type === "balance" ? a.monthlyFee || 0 : parseFloat(a.price) || 0;
      const pb = b.type === "balance" ? b.monthlyFee || 0 : parseFloat(b.price) || 0;
      return pb - pa;
    }
    const dateA = a.type === "balance" ? a.predictedSuspendDate : a.expireDate;
    const dateB = b.type === "balance" ? b.predictedSuspendDate : b.expireDate;
    const da = dateA ? Math.ceil((/* @__PURE__ */ new Date(dateA + "T00:00:00") - base) / DAY_MS) : 9999;
    const db = dateB ? Math.ceil((/* @__PURE__ */ new Date(dateB + "T00:00:00") - base) / DAY_MS) : 9999;
    return (isNaN(da) ? 9999 : da) - (isNaN(db) ? 9999 : db);
  });
  return items;
}

// src/utils/qrcode.js
function getQRCodeClientScript() {
  return `
function generateQRCodeSVG(text, options) {
  options = options || {};
  var size = options.size || 220;
  var margin = options.margin !== undefined ? options.margin : 2;
  var darkColor = options.darkColor || '#0f172a';
  var lightColor = options.lightColor || '#ffffff';
  if (!text) return '';
  
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      EXP[i + 255] = x;
      LOG[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
  })();
  function gfMul(x, y) { return x === 0 || y === 0 ? 0 : EXP[LOG[x] + LOG[y]]; }
  function rsGenPoly(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= gfMul(poly[j], EXP[i]);
        next[j + 1] ^= poly[j];
      }
      poly = next;
    }
    return poly;
  }
  function rsEncode(data, ecCount) {
    var gen = rsGenPoly(ecCount);
    var res = new Array(ecCount).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift();
      res.push(0);
      for (var j = 0; j < ecCount; j++) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
    return res;
  }
  var VERSION_SPECS = [
    null,
    { ver: 1, size: 21, totalCW: 26, ecCW: 10, blocks: 1, cap: 14 },
    { ver: 2, size: 25, totalCW: 44, ecCW: 16, blocks: 1, cap: 26 },
    { ver: 3, size: 29, totalCW: 70, ecCW: 26, blocks: 1, cap: 42 },
    { ver: 4, size: 33, totalCW: 100, ecCW: 18, blocks: 2, cap: 62 },
    { ver: 5, size: 37, totalCW: 134, ecCW: 24, blocks: 2, cap: 84 },
    { ver: 6, size: 41, totalCW: 172, ecCW: 16, blocks: 4, cap: 106 },
    { ver: 7, size: 45, totalCW: 196, ecCW: 18, blocks: 4, cap: 122 },
    { ver: 8, size: 49, totalCW: 242, ecCW: 22, blocks: 4, cap: 152 },
    { ver: 9, size: 53, totalCW: 292, ecCW: 22, blocks: 5, cap: 180 },
    { ver: 10, size: 57, totalCW: 346, ecCW: 26, blocks: 5, cap: 213 }
  ];
  function getAlign(ver) {
    if (ver === 1) return [];
    if (ver === 2) return [6, 18];
    if (ver === 3) return [6, 22];
    if (ver === 4) return [6, 26];
    if (ver === 5) return [6, 30];
    if (ver === 6) return [6, 34];
    if (ver === 7) return [6, 22, 38];
    if (ver === 8) return [6, 24, 42];
    if (ver === 9) return [6, 26, 46];
    if (ver === 10) return [6, 28, 50];
    return [6, ver * 4 + 10];
  }
  var utf8 = new TextEncoder().encode(text);
  var spec = null;
  for (var v = 1; v < VERSION_SPECS.length; v++) {
    if (utf8.length <= VERSION_SPECS[v].cap) { spec = VERSION_SPECS[v]; break; }
  }
  if (!spec) spec = VERSION_SPECS[VERSION_SPECS.length - 1];
  var bitBuf = [];
  function pushBits(val, len) {
    for (var i = len - 1; i >= 0; i--) bitBuf.push((val >> i) & 1);
  }
  pushBits(4, 4);
  pushBits(utf8.length, spec.ver < 10 ? 8 : 16);
  for (var i = 0; i < utf8.length; i++) pushBits(utf8[i], 8);
  var dataCWCapacity = spec.totalCW - spec.ecCW * spec.blocks;
  var dataBitCapacity = dataCWCapacity * 8;
  var termLen = Math.min(4, dataBitCapacity - bitBuf.length);
  for (var i = 0; i < termLen; i++) bitBuf.push(0);
  while (bitBuf.length % 8 !== 0) bitBuf.push(0);
  var padBytes = [236, 17];
  var padIdx = 0;
  while (bitBuf.length < dataBitCapacity) { pushBits(padBytes[padIdx % 2], 8); padIdx++; }
  var dataCW = [];
  for (var i = 0; i < bitBuf.length; i += 8) {
    var byte = 0;
    for (var b = 0; b < 8; b++) byte = (byte << 1) | bitBuf[i + b];
    dataCW.push(byte);
  }
  var numBlocks = spec.blocks;
  var blockSize = Math.floor(dataCW.length / numBlocks);
  var extraCW = dataCW.length % numBlocks;
  var dataBlocks = [], ecBlocks = [];
  var cwOffset = 0;
  for (var b = 0; b < numBlocks; b++) {
    var len = blockSize + (b >= numBlocks - extraCW ? 1 : 0);
    var blockData = dataCW.slice(cwOffset, cwOffset + len);
    cwOffset += len;
    dataBlocks.push(blockData);
    ecBlocks.push(rsEncode(blockData, spec.ecCW));
  }
  var finalCW = [];
  var maxDataLen = Math.max.apply(null, dataBlocks.map(function(b) { return b.length; }));
  for (var i = 0; i < maxDataLen; i++) {
    for (var b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) finalCW.push(dataBlocks[b][i]);
    }
  }
  for (var i = 0; i < spec.ecCW; i++) {
    for (var b = 0; b < numBlocks; b++) {
      finalCW.push(ecBlocks[b][i]);
    }
  }
  var N = spec.size;
  var matrix = Array.from({ length: N }, function() { return Array(N).fill(null); });
  var isFunction = Array.from({ length: N }, function() { return Array(N).fill(false); });
  function setFinder(row, col) {
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 7; c++) {
        var isDark = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[row + r][col + c] = isDark;
        isFunction[row + r][col + c] = true;
      }
    }
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && !isFunction[rr][cc]) {
          matrix[rr][cc] = false;
          isFunction[rr][cc] = true;
        }
      }
    }
  }
  setFinder(0, 0); setFinder(0, N - 7); setFinder(N - 7, 0);
  if (spec.ver >= 2) {
    var alignPos = getAlign(spec.ver);
    for (var ai = 0; ai < alignPos.length; ai++) {
      for (var aj = 0; aj < alignPos.length; aj++) {
        var r = alignPos[ai], c = alignPos[aj];
        if (isFunction[r][c]) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var isDark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
            matrix[r + dr][c + dc] = isDark;
            isFunction[r + dr][c + dc] = true;
          }
        }
      }
    }
  }
  for (var i = 8; i < N - 8; i++) {
    if (!isFunction[6][i]) { matrix[6][i] = i % 2 === 0; isFunction[6][i] = true; }
    if (!isFunction[i][6]) { matrix[i][6] = i % 2 === 0; isFunction[i][6] = true; }
  }
  matrix[4 * spec.ver + 9][8] = true; isFunction[4 * spec.ver + 9][8] = true;
  for (var i = 0; i < 9; i++) { if (!isFunction[8][i]) isFunction[8][i] = true; if (!isFunction[i][8]) isFunction[i][8] = true; }
  for (var i = 0; i < 8; i++) { if (!isFunction[8][N - 1 - i]) isFunction[8][N - 1 - i] = true; if (!isFunction[N - 1 - i][8]) isFunction[N - 1 - i] = true; }
  var bitIdx = 0, allBits = [];
  for (var i = 0; i < finalCW.length; i++) {
    for (var b = 7; b >= 0; b--) allBits.push((finalCW[i] >> b) & 1);
  }
  var right = N - 1, upwards = true;
  while (right > 0) {
    if (right === 6) right--;
    for (var step = 0; step < N; step++) {
      var row = upwards ? N - 1 - step : step;
      for (var ci = 0; ci < 2; ci++) {
        var col = right - ci;
        if (!isFunction[row][col]) {
          var bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          var mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upwards = !upwards;
    right -= 2;
  }
  var formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  var formatPosTL = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  for (var i = 0; i < 15; i++) { matrix[formatPosTL[i][0]][formatPosTL[i][1]] = formatBits[i] === 1; }
  var formatPosSplit = [[N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],[8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]];
  for (var i = 0; i < 15; i++) { matrix[formatPosSplit[i][0]][formatPosSplit[i][1]] = formatBits[i] === 1; }
  
  var n = matrix.length;
  var total = n + margin * 2;
  var cellSize = size / total;
  var rects = '';
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (matrix[r][c]) {
        var x = (c + margin) * cellSize;
        var y = (r + margin) * cellSize;
        rects += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + cellSize.toFixed(2) + '" height="' + cellSize.toFixed(2) + '" fill="' + darkColor + '"/>';
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="' + lightColor + '" rx="12"/>' + rects + '</svg>';
}
`;
}
var EXP = new Uint8Array(512);
var LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = x << 1 ^ (x >= 128 ? 285 : 0);
  }
})();

// src/ui/client-script.js
function getFrontendFlagMap() {
  return Object.fromEntries(
    Object.entries(getCountryMap()).map(([prefix, info]) => [prefix, info.code])
  );
}
function getClientScript() {
  const flagMap = getFrontendFlagMap();
  const allCountries = getAllCountries();
  const statsSrc = countUrgent.toString() + "\n" + sortItemsByPaused.toString();
  const qrScript = getQRCodeClientScript();
  return `var __name = typeof __name === 'function' ? __name : function(target, value) { return target; };
${statsSrc}
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
let analyticsDetailsOpen = null;
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
      showToast((label ? label + ' ' : '') + '\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F', 'success');
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
    showToast((label ? label + ' ' : '') + '\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F', 'success');
  } catch (e) {
    showToast('\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u590D\u5236', 'error');
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
const ALL_COUNTRIES = ${JSON.stringify(allCountries)};
const CATEGORY_ALIASES = ${JSON.stringify(CATEGORY_ALIASES)};

function normalizeCategory(cat) {
  if (!cat) return '';
  const trimmed = String(cat).trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}

function parseCurrencyCode(val, fallback = 'CNY') {
  if (!val) return fallback;
  const s = String(val).trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(s)) return s;

  const match = s.match(/([A-Z]{3})/);
  if (match && match[1]) {
    const found = ISO_CURRENCIES.find(c => c.code === match[1]);
    if (found) return found.code;
  }

  const lower = String(val).toLowerCase().trim();
  const foundByName = ISO_CURRENCIES.find(c =>
    c.name.toLowerCase() === lower ||
    c.code.toLowerCase() === lower ||
    (lower.length >= 2 && c.name.toLowerCase().includes(lower))
  );
  if (foundByName) return foundByName.code;

  return fallback;
}

function currSym(code) { return CURRENCY_SYMBOLS[code] || code || '\xA5'; }

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
  populateCurrencyDatalist();
  populateSettingsCountryDatalist();
}

async function loadItems() {
  try {
    const res = await api('GET', '/api/items');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        allItems = data.map(item => {
          if (item.category) item.category = normalizeCategory(item.category);
          return item;
        });
      }
    } else {
      console.error('loadItems failed:', res.status);
    }
  } catch (e) {
    console.error('loadItems error:', e);
  }
  try {
    populateCategoryDatalist();
    populateRegionDatalist();
    populateCurrencyDatalist();
    populateSettingsCountryDatalist();
    renderStats();
    renderAnalytics();
    renderItems();
  } catch (err) {
    console.error('Render error in loadItems:', err);
  }
}

function populateCurrencySelects() {
  const selects = document.querySelectorAll('.currency-select-target');
  const optionsHTML = ISO_CURRENCIES.map(c =>
    '<option value="'+c.code+'">'+c.flag+' '+c.code+' \xB7 '+c.name+' ('+c.symbol+')</option>'
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
  populateCurrencyDatalist();
}

function populateCurrencyDatalist() {
  const dl = document.getElementById('currency-datalist');
  if (!dl) return;
  dl.innerHTML = ISO_CURRENCIES.map(c =>
    '<option value="'+c.code+'">'+c.flag+' '+c.code+' \xB7 '+c.name+' ('+c.symbol+')</option>'
  ).join('');
}

function populateCategoryDatalist() {
  const dl = document.getElementById('category-datalist');
  if (!dl) return;
  const set = new Set((appSettings?.categories || DEFAULT_CATEGORIES).map(c => normalizeCategory(c)).filter(Boolean));
  allItems.forEach(item => {
    if (item.category) set.add(normalizeCategory(item.category));
  });
  dl.innerHTML = Array.from(set).map(cat => '<option value="'+esc(cat)+'"></option>').join('');
}

function populateRegionDatalist() {
  const dl = document.getElementById('region-datalist');
  if (!dl) return;
  const list = appSettings?.regions || DEFAULT_REGIONS;
  const options = list.map(r =>
    '<option value="'+r.code+'">'+(r.flag ? r.flag+' ' : '')+r.code+' \xB7 '+(r.name||'')+'</option>'
  );
  dl.innerHTML = options.join('');
}

function populateSettingsCountryDatalist() {
  const dl = document.getElementById('settings-country-datalist');
  if (!dl) return;
  dl.innerHTML = ALL_COUNTRIES.map(c =>
    '<option value="'+c.flag+' '+c.code+' \xB7 '+c.name+'">'+c.name+' ('+c.code+')</option>'
  ).join('');
}

function onSelectCountryPreset(val) {
  if (!val) return;
  const trimmed = val.trim();
  const found = ALL_COUNTRIES.find(c =>
    val.includes(c.code) ||
    c.name === trimmed ||
    (trimmed.length >= 2 && c.name.includes(trimmed))
  );
  if (found) {
    const codeEl = document.getElementById('settings-new-region-code');
    const nameEl = document.getElementById('settings-new-region-name');
    const flagEl = document.getElementById('settings-new-region-flag');
    if (codeEl) codeEl.value = found.code;
    if (nameEl) nameEl.value = found.name;
    if (flagEl) flagEl.value = found.flag;
  }
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
    { label:'\u8BA2\u9605', value:subs.length, icon:'fa-credit-card', color:'text-violet-400', bg:'bg-violet-500/10', filter:'subscription' },
    { label:'\u8BDD\u8D39', value:balances.length ? fmtBalance() : '0', icon:'fa-wallet', color:'text-amber-400', bg:'bg-amber-500/10', filter:'balance' },
    { label:'\u5373\u5C06\u5230\u671F', value:urgentCount, icon:'fa-clock', color:'text-rose-400', bg:'bg-rose-500/10', filter:'urgent' },
    { label:'\u6708\u5EA6\u603B\u652F\u51FA (\u6298\u7B97)', value:currSym(baseCur) + Math.round(convertedMonthly), icon:'fa-coins', color:'text-emerald-400', bg:'bg-emerald-500/10' },
  ];

  document.getElementById('stats-bar').innerHTML = stats.map((s, idx) =>
    '<div class="glass-card rounded-xl p-4' + (s.filter ? ' cursor-pointer' : '') + (idx === 4 ? ' col-span-2 sm:col-span-1' : '') + '"' +
    (s.filter ? ' onclick="setFilter(\\''+s.filter+'\\')" role="button" tabindex="0" aria-label="\u7B5B\u9009'+s.label+'"' : '') + '><div class="flex items-center gap-3">' +
    '<div class="'+s.bg+' w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fa-solid '+s.icon+' '+s.color+'"></i></div>' +
    '<div class="min-w-0"><div class="text-xs text-slate-400 truncate">'+s.label+'</div><div class="text-xl font-bold text-white truncate">'+s.value+'</div></div>' +
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

function toggleAnalyticsDetails() {
  analyticsDetailsOpen = !analyticsDetailsOpen;
  const detailsEl = document.getElementById('analytics-details');
  const textEl = document.getElementById('analytics-toggle-text');
  const iconEl = document.getElementById('analytics-toggle-icon');
  if (detailsEl) {
    detailsEl.classList.toggle('hidden', !analyticsDetailsOpen);
  }
  if (textEl) {
    textEl.textContent = analyticsDetailsOpen ? '\u6536\u8D77\u660E\u7EC6' : '\u652F\u51FA\u660E\u7EC6';
  }
  if (iconEl) {
    iconEl.className = 'fa-solid ' + (analyticsDetailsOpen ? 'fa-chevron-up' : 'fa-chevron-down');
  }
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

  const baseCur = appSettings?.baseCurrency || 'CNY';
  const rates = appSettings?.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const totalMonthly = Object.entries(monthly).reduce((acc, [cur, val]) => acc + val * getRateToBase(cur, baseCur, rates), 0);
  const totalYearly = Object.entries(yearly).reduce((acc, [cur, val]) => acc + val * getRateToBase(cur, baseCur, rates), 0);

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

  if (analyticsDetailsOpen === null) {
    analyticsDetailsOpen = (typeof window !== 'undefined' && window.innerWidth >= 640);
  }
  const isHidden = !analyticsDetailsOpen;

  panel.innerHTML =
    '<div class="glass rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-sky-950/40 to-slate-900/40 border border-sky-500/20">' +
      '<div>' +
        '<div class="text-xs text-sky-400 font-semibold mb-0.5"><i class="fa-solid fa-calculator mr-1"></i>\u5168\u5E01\u79CD\u6C47\u7387\u6298\u7B97\u603B\u652F\u51FA (\u57FA\u51C6: '+baseCur+')</div>' +
        '<div class="text-xl sm:text-2xl font-bold text-white">'+currSym(baseCur) + totalMonthly.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ \u6708</span></div>' +
      '</div>' +
      '<div class="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-white/10 sm:pl-6">' +
        '<div>' +
          '<div class="text-xs text-slate-400 mb-0.5">\u6298\u7B97\u5E74\u5EA6\u603B\u9884\u7B97</div>' +
          '<div class="text-base sm:text-lg font-bold text-emerald-400">'+currSym(baseCur) + totalYearly.toFixed(2) + ' <span class="text-xs text-slate-400 font-normal">/ \u5E74</span></div>' +
        '</div>' +
        '<button type="button" onclick="toggleAnalyticsDetails()" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all flex items-center gap-1.5 flex-shrink-0" id="analytics-toggle-btn" title="\u5207\u6362\u6536\u652F\u660E\u7EC6\u5C55\u793A">' +
          '<span id="analytics-toggle-text">' + (analyticsDetailsOpen ? '\u6536\u8D77\u660E\u7EC6' : '\u652F\u51FA\u660E\u7EC6') + '</span>' +
          '<i id="analytics-toggle-icon" class="fa-solid ' + (analyticsDetailsOpen ? 'fa-chevron-up' : 'fa-chevron-down') + '"></i>' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div id="analytics-details" class="grid grid-cols-1 lg:grid-cols-2 gap-4 ' + (isHidden ? 'hidden' : '') + '">' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-chart-simple text-emerald-400 mr-2"></i>\u6309\u539F\u59CB\u5E01\u79CD\u7EDF\u8BA1</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+currencyHTML+'</div></div>' +
      '<div class="glass rounded-xl p-4"><div class="text-sm font-semibold text-slate-300 mb-3"><i class="fa-solid fa-layer-group text-violet-400 mr-2"></i>\u6309\u5206\u7C7B\u652F\u51FA\u7EDF\u8BA1</div>'+categoryRows+'</div>' +
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
    items = items.filter(i => {
      const catNorm = normalizeCategory(i.category || '');
      const catMatches = (i.category||'').toLowerCase().includes(search) ||
                         catNorm.toLowerCase().includes(search) ||
                         Object.entries(CATEGORY_ALIASES).some(([alias, name]) =>
                           (alias.toLowerCase().includes(search) || name.toLowerCase().includes(search)) &&
                           (catNorm === name || (i.category||'').toLowerCase() === alias.toLowerCase())
                         );
      return (i.name||'').toLowerCase().includes(search) ||
        (i.number||'').toLowerCase().includes(search) ||
        (i.remark||'').toLowerCase().includes(search) ||
        catMatches ||
        (i.region||'').toLowerCase().includes(search) ||
        (i.subId||'').toLowerCase().includes(search) ||
        (i.currency||'').toLowerCase().includes(search);
    });
  }
  const sortBy = document.getElementById('sort-select')?.value || 'expire';
  return sortItemsByPaused([...items], sortBy);
}

function renderItems() {
  try {
    const items = getFilteredItems();
    const container = document.getElementById('content-area');
    const empty = document.getElementById('empty-state');
    if (!container) return;

    if (allItems.length === 0) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    if (items.length === 0) {
      container.innerHTML = '<div class="text-center py-16 text-slate-500"><i class="fa-solid fa-filter text-4xl mb-3 opacity-30"></i><p>\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55</p></div>';
      return;
    }

    if (currentView === 'grid') container.innerHTML = renderGrid(items);
    else if (currentView === 'list') container.innerHTML = renderList(items);
    else if (currentView === 'calendar') container.innerHTML = renderCalendar(items);
  } catch (err) {
    console.error('renderItems error:', err);
  }
}

function getDaysRemaining(item) {
  const targetDate = item.type === 'balance' ? item.predictedSuspendDate : item.expireDate;
  if (!targetDate) return 999;
  const today = new Date(); today.setHours(0,0,0,0);
  const dateStr = typeof targetDate === 'string' && targetDate.length === 10
    ? targetDate + 'T00:00:00'
    : targetDate;
  const exp = new Date(dateStr);
  const diff = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  return isNaN(diff) ? 999 : diff;
}

function getStatusBadge(item) {
  if (item.status === 'paused') {
    return { text: '\u5DF2\u6682\u505C', cls: 'status-paused bg-slate-500/10 text-slate-400 border border-slate-500/20' };
  }
  const days = getDaysRemaining(item);
  if (days < 0) return { text: '\u5DF2\u8FC7\u671F ' + Math.abs(days) + ' \u5929', cls: 'status-expired bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days === 0) return { text: '\u4ECA\u5929\u5230\u671F', cls: 'status-danger bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days <= 3) return { text: days + ' \u5929\u540E\u5230\u671F', cls: 'status-danger bg-red-500/10 text-red-400 border border-red-500/20' };
  if (days <= 7) return { text: days + ' \u5929\u540E\u5230\u671F', cls: 'status-warning bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  if (days <= 15) return { text: days + ' \u5929\u540E\u5230\u671F', cls: 'status-warning bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' };
  return { text: days + ' \u5929\u540E\u5230\u671F', cls: 'status-active bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
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
      else if (isBal) { tc = 'text-amber-400'; tb = 'bg-amber-500/10'; ti = 'fa-wallet'; tl = '\u8BDD\u8D39'; }
      else { tc = 'text-violet-400'; tb = 'bg-violet-500/10'; ti = 'fa-credit-card'; tl = (item.category||'\u8BA2\u9605'); }

      const priceStr = (isSub && item.price)
        ? sym + item.price + (item.billing === 'yearly' ? '/\u5E74' : item.billing === 'once' ? '' : '/\u6708')
        : '';
      const autoStr = (isSub && item.autoRenew)
        ? '<span class="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20"><i class="fa-solid fa-rotate mr-1"></i>\u81EA\u52A8\u7EED\u8D39</span>'
        : '';
      const cycleModeStr = (isSub && item.billingMode === 'fixed')
        ? '<span class="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">\u56FA\u5B9A'+(item.cycleDays||(item.billing==='yearly'?365:30))+'\u5929</span>'
        : '';

      const regionStr = item.region ? esc(item.region) : '';
      const catStr = item.category ? esc(item.category) : '';
      const metaLine = [catStr, regionStr].filter(Boolean).join(' \xB7 ');

      let balanceStr = '';
      if (isBal) {
        balanceStr = '<div class="text-lg font-bold text-amber-300">' + sym + (item.balance != null ? item.balance : 0) +
          ' <span class="text-xs font-normal text-slate-400">(\u6708\u79DF ' + sym + (item.monthlyFee || 0) + ' \xB7 \u6BCF\u6708' + (item.billingDay || 1) + '\u65E5\u6263)</span></div>';
      } else if (isEsim && item.balance != null) {
        balanceStr = '<div class="text-xs text-slate-300"><i class="fa-solid fa-wallet text-amber-400 mr-1"></i>\u4F59\u989D: <span class="font-bold text-amber-300">' + sym + item.balance + '</span></div>';
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
              ? '<div class="flex justify-between"><span>\u9884\u8BA1\u505C\u673A\uFF1A</span><span class="font-mono text-slate-200 font-bold">' + (item.predictedSuspendDate || '-') + '</span></div>'
              : '<div class="flex justify-between"><span>\u5230\u671F\u65E5\u671F\uFF1A</span><span class="font-mono text-slate-200 font-bold">' + (item.expireDate || '-') + '</span></div>') +
            (item.cycle ? '<div class="flex justify-between"><span>\u7EED\u8D39\u5468\u671F\uFF1A</span><span>' + item.cycle + ' \u5929</span></div>' : '') +
            (priceStr ? '<div class="flex justify-between items-center"><span>\u8D39\u7528\uFF1A</span><span class="font-bold text-emerald-400">' + priceStr + '</span></div>' : '') +
            ((autoStr || cycleModeStr) ? '<div class="flex gap-1.5 pt-1 flex-wrap">' + autoStr + cycleModeStr + '</div>' : '') +
            (item.url ? '<div class="pt-1 truncate"><a href="' + safeHref(item.url) + '" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline inline-flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>' + esc(item.url.replace(/^https?:\\/\\//,'')) + '</a></div>' : '') +
            (item.remark ? '<div class="text-slate-400 text-xs italic bg-white/5 rounded-lg p-2 mt-2 break-all">' + esc(item.remark) + '</div>' : '') +
          '</div>' +
        '</div>' +

        '<div class="pt-3 border-t border-white/10 flex items-center justify-between gap-1 flex-wrap mt-2">' +
          '<div class="flex items-center gap-1 flex-wrap">' +
            (!isBal ? '<button onclick="renewItem(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 transition-colors" title="\u7EED\u671F"><i class="fa-solid fa-rotate mr-1"></i>\u7EED\u671F</button>' : '') +
            (isBal ? '<button onclick="openRechargeModal(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors" title="\u5145\u503C"><i class="fa-solid fa-plus-circle mr-1"></i>\u5145\u503C</button>' : '') +
            (isEsim && (item.smDp || item.activationCode) ? '<button onclick="showQrCode(\\'' + item.id + '\\')" class="btn-touch px-2.5 py-1 rounded-lg text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors" title="\u5B89\u88C5\u4E8C\u7EF4\u7801"><i class="fa-solid fa-qrcode mr-1"></i>\u4E8C\u7EF4\u7801</button>' : '') +
            '<button onclick="toggleStatus(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="' + (isPaused ? '\u6062\u590D\u542F\u7528' : '\u6682\u505C') + '"><i class="fa-solid ' + (isPaused ? 'fa-play text-emerald-400' : 'fa-pause') + '"></i></button>' +
          '</div>' +
          '<div class="flex items-center gap-1">' +
            '<button onclick="editItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors" title="\u7F16\u8F91"><i class="fa-solid fa-pen"></i></button>' +
            '<button onclick="deleteItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors" title="\u5220\u9664"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function renderList(items) {
  return '<div class="glass rounded-2xl overflow-hidden">' +
    '<div class="overflow-x-auto"><table class="w-full text-left text-sm min-w-[340px] sm:min-w-full">' +
      '<thead class="text-xs text-slate-400 uppercase bg-white/5 border-b border-white/10">' +
        '<tr>' +
          '<th class="px-3 sm:px-4 py-3">\u540D\u79F0 / \u7C7B\u578B</th>' +
          '<th class="px-3 sm:px-4 py-3 hidden md:table-cell">\u53F7\u7801 / \u8D26\u53F7</th>' +
          '<th class="px-3 sm:px-4 py-3 hidden sm:table-cell">\u5206\u7C7B / \u533A\u57DF</th>' +
          '<th class="px-3 sm:px-4 py-3">\u5230\u671F/\u505C\u673A\u65E5</th>' +
          '<th class="px-3 sm:px-4 py-3">\u8D39\u7528 / \u4F59\u989D</th>' +
          '<th class="px-3 sm:px-4 py-3">\u72B6\u6001</th>' +
          '<th class="px-3 sm:px-4 py-3 text-right">\u64CD\u4F5C</th>' +
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
          else if (isBal) typeBadge = '<span class="text-[11px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">\u8BDD\u8D39</span>';
          else typeBadge = '<span class="text-[11px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20">\u8BA2\u9605</span>';

          let priceOrBal = '-';
          if (isSub && item.price) priceOrBal = '<span class="font-bold text-emerald-400">' + sym + item.price + (item.billing==='yearly'?'/\u5E74':'/\u6708') + '</span>';
          else if (isBal) priceOrBal = '<span class="font-bold text-amber-300">' + sym + (item.balance ?? 0) + '</span><span class="hidden sm:inline text-xs text-slate-400"> (\u6708\u79DF ' + sym + (item.monthlyFee||0) + ')</span>';
          else if (isEsim && item.balance != null) priceOrBal = sym + item.balance;

          const metaSub = [item.category ? esc(item.category) : '', item.region ? esc(item.region) : '', item.number || item.subId ? esc(item.number || item.subId) : ''].filter(Boolean).join(' \xB7 ');

          return '<tr class="list-row ' + (item.status === 'paused' ? 'opacity-50' : '') + '">' +
            '<td class="px-3 sm:px-4 py-3">' +
              '<div class="font-bold text-white flex items-center gap-1.5 flex-wrap">' +
                (flag ? '<span>' + flag + '</span>' : '') +
                '<span class="truncate max-w-[130px] sm:max-w-none">' + esc(item.name) + '</span>' +
                typeBadge +
              '</div>' +
              (metaSub ? '<div class="text-[11px] text-slate-400 mt-0.5 sm:hidden truncate max-w-[160px]">' + metaSub + '</div>' : '') +
            '</td>' +
            '<td class="px-3 sm:px-4 py-3 font-mono text-xs text-slate-300 hidden md:table-cell">' + esc(item.number || item.subId || '-') + '</td>' +
            '<td class="px-3 sm:px-4 py-3 text-xs text-slate-300 hidden sm:table-cell">' + esc(item.category || '-') + (item.region ? ' ('+esc(item.region)+')' : '') + '</td>' +
            '<td class="px-3 sm:px-4 py-3 font-mono text-xs text-slate-200 whitespace-nowrap">' + (isBal ? item.predictedSuspendDate || '-' : item.expireDate || '-') + '</td>' +
            '<td class="px-3 sm:px-4 py-3 text-xs whitespace-nowrap">' + priceOrBal + '</td>' +
            '<td class="px-3 sm:px-4 py-3 whitespace-nowrap"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + badge.cls + '">' + badge.text + '</span></td>' +
            '<td class="px-3 sm:px-4 py-3 text-right whitespace-nowrap">' +
              '<div class="flex items-center justify-end gap-1">' +
                (!isBal ? '<button onclick="renewItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded text-xs text-sky-400 hover:bg-sky-500/10" title="\u7EED\u671F"><i class="fa-solid fa-rotate"></i></button>' : '') +
                (isBal ? '<button onclick="openRechargeModal(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded text-xs text-amber-400 hover:bg-amber-500/10" title="\u5145\u503C"><i class="fa-solid fa-plus-circle"></i></button>' : '') +
                (isEsim && (item.smDp || item.activationCode) ? '<button onclick="showQrCode(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded text-xs text-cyan-400 hover:bg-cyan-500/10" title="\u4E8C\u7EF4\u7801"><i class="fa-solid fa-qrcode"></i></button>' : '') +
                '<button onclick="editItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded text-xs text-slate-400 hover:text-white" title="\u7F16\u8F91"><i class="fa-solid fa-pen"></i></button>' +
                '<button onclick="deleteItem(\\'' + item.id + '\\')" class="btn-touch px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10" title="\u5220\u9664"><i class="fa-solid fa-trash"></i></button>' +
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

  const weekHeaders = ['\u65E5','\u4E00','\u4E8C','\u4E09','\u56DB','\u4E94','\u516D'].map(w =>
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
        '<button onclick="calYear=new Date().getFullYear();calMonth=new Date().getMonth();renderItems();" class="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-xs">\u4ECA\u5929</button>' +
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

  document.getElementById('qr-title').textContent = (item.name || 'eSIM') + ' \u5B89\u88C5\u4E8C\u7EF4\u7801';
  document.getElementById('qr-smdp-val').textContent = smdp || '(\u672A\u586B\u5199)';
  document.getElementById('qr-act-val').textContent = act || '(\u672A\u586B\u5199)';

  const confRow = document.getElementById('qr-conf-row');
  if (conf) {
    confRow.classList.remove('hidden');
    document.getElementById('qr-conf-val').textContent = conf;
  } else {
    confRow.classList.add('hidden');
  }

  const svg = generateQRCodeSVG(lpa, { size: 210 });
  document.getElementById('qr-container').innerHTML = svg || '<p class="text-slate-500 text-xs">\u65E0\u6CD5\u751F\u6210\u4E8C\u7EF4\u7801\uFF0C\u8BF7\u5148\u586B\u5199 SM-DP+ \u4E0E\u6FC0\u6D3B\u7801</p>';

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
  copyText(currentLpaString, 'LPA \u6FC0\u6D3B\u4EE3\u7801');
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
          ? '<span class="text-xs text-sky-400 font-bold px-2 py-1 bg-sky-500/10 rounded-lg border border-sky-500/20">\u57FA\u51C6 (1.0)</span>'
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
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>\u540C\u6B65\u4E2D...'; }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/' + base);
    if (!res.ok) throw new Error('API \u54CD\u5E94\u5931\u8D25');
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
      showToast('\u5DF2\u6210\u529F\u83B7\u53D6\u5E76\u540C\u6B65\u6700\u65B0\u5B9E\u65F6\u6C47\u7387 (\u57FA\u51C6: ' + base + ')', 'success');
    } else {
      throw new Error('\u672A\u83B7\u53D6\u5230\u6709\u6548\u6C47\u7387');
    }
  } catch (err) {
    console.error('syncLiveRates error:', err);
    showToast('\u6C47\u7387\u63A5\u53E3\u540C\u6B65\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u6216\u7A0D\u540E\u91CD\u8BD5', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
  }
}

function resetDefaultRates() {
  editingRates = { ...DEFAULT_EXCHANGE_RATES };
  renderRateList();
  showToast('\u5DF2\u91CD\u7F6E\u6C47\u7387\u8868\u4E3A\u53C2\u8003\u9ED8\u8BA4\u503C', 'info');
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
  showToast('\u5DF2\u6062\u590D\u9ED8\u8BA4\u9884\u8BBE\u5206\u7C7B', 'info');
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
  const searchIn = document.getElementById('settings-country-search');
  const code = codeIn ? codeIn.value.trim().toUpperCase() : '';
  const name = nameIn ? nameIn.value.trim() : '';
  const flag = flagIn ? flagIn.value.trim() : '';
  if (!code) { showToast('\u8BF7\u8F93\u5165\u533A\u57DF\u4EE3\u7801 (\u5982 TR, US) \u6216\u4ECE\u4E0A\u65B9\u641C\u7D22\u9009\u62E9', 'error'); return; }

  const existingIdx = editingRegions.findIndex(r => r.code === code);
  const entry = { code, name: name || code, flag: flag || isoToFlag(code) || '\u{1F310}' };
  if (existingIdx >= 0) editingRegions[existingIdx] = entry;
  else editingRegions.push(entry);

  if (codeIn) codeIn.value = '';
  if (nameIn) nameIn.value = '';
  if (flagIn) flagIn.value = '';
  if (searchIn) searchIn.value = '';
  renderRegionTags();
}

function removeCustomRegion(idx) {
  editingRegions.splice(idx, 1);
  renderRegionTags();
}

function resetDefaultRegions() {
  editingRegions = [ ...DEFAULT_REGIONS ];
  renderRegionTags();
  showToast('\u5DF2\u6062\u590D\u9ED8\u8BA4\u9884\u8BBE\u533A\u57DF', 'info');
}

async function saveSettingsToServer() {
  const baseSelect = document.getElementById('settings-base-currency');
  const baseCurrency = baseSelect?.value || 'CNY';

  const btn = document.getElementById('save-settings-btn');
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>\u4FDD\u5B58\u4E2D...'; }

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
      showToast('\u8BBE\u7F6E\u4E0E\u9884\u8BBE\u5DF2\u4FDD\u5B58', 'success');
    } else {
      showToast(data.message || '\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25', 'error');
    }
  } catch (err) {
    console.error('saveSettings error:', err);
    showToast('\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25', 'error');
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
  
  const typeConfig = {
    esim: {
      label: 'eSIM \u5361',
      icon: '<i class="fa-solid fa-sim-card"></i>',
      badgeCls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      subtitle: '\u8BB0\u5F55\u53F7\u7801\u3001ICCID\u3001\u6FC0\u6D3B\u53C2\u6570\u4E0E\u4FDD\u53F7\u5468\u671F',
    },
    subscription: {
      label: '\u8BA2\u9605\u670D\u52A1',
      icon: '<i class="fa-solid fa-rotate"></i>',
      badgeCls: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      subtitle: '\u8FFD\u8E2A\u8BA2\u9605\u8D39\u7528\u3001\u8BA1\u8D39\u5468\u671F\u4E0E\u81EA\u52A8\u7EED\u8D39',
    },
    balance: {
      label: '\u8BDD\u8D39\u5361',
      icon: '<i class="fa-solid fa-coins"></i>',
      badgeCls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      subtitle: '\u8FFD\u8E2A\u5361\u5185\u4F59\u989D\u3001\u6708\u79DF\u4E0E\u667A\u80FD\u505C\u673A\u9884\u6D4B',
    },
  };
  const cfg = typeConfig[type] || typeConfig.subscription;

  document.getElementById('modal-title').textContent = (item ? '\u7F16\u8F91 ' : '\u6DFB\u52A0 ') + cfg.label;
  const subEl = document.getElementById('modal-subtitle');
  if (subEl) subEl.textContent = cfg.subtitle;
  const iconBadge = document.getElementById('modal-icon-badge');
  if (iconBadge) {
    iconBadge.innerHTML = cfg.icon;
    iconBadge.className = 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm sm:text-base border ' + cfg.badgeCls;
  }

  document.getElementById('field-number').classList.toggle('hidden', type !== 'esim' && type !== 'balance');
  document.getElementById('field-esim-activation').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-esim-balance').classList.toggle('hidden', type !== 'esim');
  document.getElementById('field-category').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-region').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-sub-id').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-price').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-url').classList.toggle('hidden', type !== 'subscription');
  document.getElementById('field-balance').classList.toggle('hidden', type !== 'balance');
  
  const expireField = document.getElementById('field-expire');
  const cycleField = document.getElementById('field-cycle');
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
    document.getElementById('form-category').value = normalizeCategory(item.category || '');
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
    input.placeholder = billing === 'yearly' ? '\u9ED8\u8BA4365\u5929' : '\u9ED8\u8BA430\u5929';
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

  let rawCurrency = 'CNY';
  if (type === 'esim') rawCurrency = document.getElementById('form-currency-esim').value;
  else if (type === 'balance') rawCurrency = document.getElementById('form-currency-balance').value;
  else rawCurrency = document.getElementById('form-currency').value;

  const currency = parseCurrencyCode(rawCurrency, type === 'balance' ? 'CNY' : 'USD');
  const category = normalizeCategory(document.getElementById('form-category').value.trim());

  const body = {
    type,
    name: document.getElementById('form-name').value.trim(),
    number: document.getElementById('form-number').value.trim(),
    smDp: document.getElementById('form-smdp').value.trim(),
    activationCode: document.getElementById('form-activation-code').value.trim(),
    confirmationCode: document.getElementById('form-confirmation-code').value.trim(),
    wid: document.getElementById('form-wid').value.trim(),
    balance: type === 'esim' ? document.getElementById('form-balance-esim').value.trim() : document.getElementById('form-balance').value,
    currency,
    category,
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
    showToast('\u5230\u671F\u65E5\u671F\u4E0D\u80FD\u4E3A\u7A7A', 'error'); return;
  }
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
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  const isEsim = item.type === 'esim';
  const sym = currSym(item.currency || 'CNY');
  const overlay = document.getElementById('renew-overlay');
  document.getElementById('renew-title').textContent = isEsim ? '\u7EED\u671F eSIM' : '\u7EED\u671F\u8BA2\u9605';
  document.getElementById('renew-info').textContent = isEsim
    ? '\u5F53\u524D\u4F59\u989D: ' + (item.balance == null ? '\u672A\u8FFD\u8E2A' : sym + item.balance)
    : '\u5F53\u524D\u5230\u671F\u65E5: ' + (item.expireDate || '\u672A\u8BBE\u7F6E');
  document.getElementById('renew-balance-fields').classList.toggle('hidden', !isEsim);
  document.getElementById('renew-balance-delta').value = '';
  document.getElementById('renew-balance-note').value = '';

  const form = document.getElementById('renew-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('renew-submit');
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>\u7EED\u671F\u4E2D...';

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
        showToast('\u7EED\u671F\u6210\u529F', 'success');
        await loadItems();
      } else {
        showToast(data.message || '\u7EED\u671F\u5931\u8D25', 'error');
      }
    } catch {
      showToast('\u7EED\u671F\u5931\u8D25', 'error');
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
  document.getElementById('recharge-info').textContent = esc(item.name) + ' \u5F53\u524D\u4F59\u989D: ' + sym + (item.balance != null ? item.balance : 0);
  document.getElementById('recharge-amount').value = '';
  document.getElementById('recharge-note').value = '';

  const form = document.getElementById('recharge-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('recharge-amount').value);
    const note = document.getElementById('recharge-note').value.trim();
    if (!Number.isFinite(amount)) return showToast('\u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D', 'error');

    const btn = form.querySelector('[type="submit"]');
    const origHTML = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>\u63D0\u4EA4\u4E2D...';

    try {
      const newBal = (item.balance || 0) + amount;
      const res = await api('PUT', '/api/items/' + id, { balance: newBal });
      const data = await res.json();
      if (data.success) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        showToast((amount >= 0 ? '\u5145\u503C\u6210\u529F' : '\u6263\u51CF\u6210\u529F') + '\uFF0C\u5F53\u524D\u4F59\u989D: ' + sym + newBal.toFixed(2), 'success');
        await loadItems();
      } else {
        showToast(data.message || '\u5145\u503C\u5931\u8D25', 'error');
      }
    } catch {
      showToast('\u5145\u503C\u5931\u8D25', 'error');
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
    if (!res.ok) { showToast('\u5BFC\u51FA\u5931\u8D25', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-tracker-export-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON \u5BFC\u51FA\u6210\u529F', 'success');
  } catch { showToast('\u5BFC\u51FA\u5931\u8D25', 'error'); }
}

async function exportCSV() {
  toggleMenu();
  try {
    const res = await api('GET', '/api/items/export/csv');
    if (!res.ok) { showToast('\u5BFC\u51FA\u5931\u8D25', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub-tracker-export-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV \u5BFC\u51FA\u6210\u529F', 'success');
  } catch { showToast('\u5BFC\u51FA\u5931\u8D25', 'error'); }
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
    if (!Array.isArray(payload) || payload.length === 0) { showToast('\u65E0\u6548\u7684\u5BFC\u5165\u6587\u4EF6\u683C\u5F0F', 'error'); return; }
    showToast('\u5BFC\u5165\u4E2D...', 'info');
    const res = await api('POST', '/api/items/import/json', payload);
    const data = await res.json();
    if (data.success) {
      const d = data.data;
      showToast('\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E ' + d.added + ' \u6761\uFF0C\u8DF3\u8FC7 ' + d.skipped + ' \u6761', 'success');
      await loadItems();
    } else {
      showToast(data.message || '\u5BFC\u5165\u5931\u8D25', 'error');
    }
  } catch (e) {
    showToast('\u5BFC\u5165\u89E3\u6790\u5931\u8D25\uFF1A' + (e.message || '\u683C\u5F0F\u9519\u8BEF'), 'error');
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
  content.innerHTML = '<div class="text-sm text-slate-500 py-10 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>\u52A0\u8F7D\u4E2D...</div>';
  try {
    const res = await api('GET', '/api/history?limit=100');
    if (!res.ok) { content.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">\u52A0\u8F7D\u5386\u53F2\u5931\u8D25</div>'; return; }
    rawHistoryData = await res.json();
    renderHistory(rawHistoryData);
  } catch {
    content.innerHTML = '<div class="text-sm text-red-400 py-6 text-center">\u52A0\u8F7D\u5386\u53F2\u5931\u8D25</div>';
  }
}

function renderHistory(allEntries) {
  const content = document.getElementById('history-content');
  const data = historyFilter === 'all' ? allEntries : allEntries.filter(e => e.action === historyFilter);
  if (!data || data.length === 0) {
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
    deduct: ['\u6263\u8D39', 'fa-minus-circle', 'text-orange-400'],
    import: ['\u5BFC\u5165', 'fa-upload', 'text-violet-400'],
    update_settings: ['\u66F4\u65B0\u504F\u597D', 'fa-sliders', 'text-violet-400'],
  };
  const cfg = actionMap[entry.action] || [entry.action || '\u64CD\u4F5C', 'fa-circle-info', 'text-slate-400'];
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('zh-CN', { hour12:false }) : '';
  const itemName = entry.itemName ? esc(entry.itemName) : '\u7CFB\u7EDF\u504F\u597D\u8BBE\u7F6E';
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
  if (entry.action === 'renew' && d.newExpireDate) {
    const autoBadge = d.auto ? ' (\u81EA\u52A8\u7EED\u8D39)' : '';
    return '\u65B0\u5230\u671F\u65E5\uFF1A' + esc(d.newExpireDate) + autoBadge;
  }
  if (entry.action === 'recharge') {
    const parts = [];
    if (d.amount != null) parts.push('\u91D1\u989D\uFF1A' + esc(d.amount));
    if (d.newBalance != null) parts.push('\u65B0\u4F59\u989D\uFF1A' + esc(d.newBalance));
    if (d.predictedSuspendDate) parts.push('\u9884\u8BA1\u505C\u673A\uFF1A' + esc(d.predictedSuspendDate));
    return parts.join(' \xB7 ');
  }
  if (entry.action === 'import') return '\u65B0\u589E ' + (d.added || 0) + ' \u6761\uFF0C\u8DF3\u8FC7 ' + (d.skipped || 0) + ' \u6761\uFF0C\u603B\u8BA1 ' + (d.total || 0) + ' \u6761';
  if (entry.action === 'deduct') {
    const parts = [];
    if (d.fee != null) parts.push('\u6708\u79DF\uFF1A' + esc(d.fee));
    if (d.oldBalance != null && d.newBalance != null) parts.push('\u4F59\u989D\uFF1A' + esc(d.oldBalance) + ' \u2192 ' + esc(d.newBalance));
    return parts.join(' \xB7 ');
  }
  if (entry.action === 'update_settings') {
    return '\u57FA\u51C6\u8D27\u5E01\uFF1A' + (d.baseCurrency || '\u672A\u53D8\u66F4');
  }
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
      { type: 'esim', name: '\u7F8E\u56FD\u4FDD\u53F7\u5361', number: '+120****1234', expireDate: '2026-12-31', cycle: 180, remark: 'Ultra Mobile \u4FDD\u53F7', status: 'active', smDp: 'rsp.ultramobile.com', activationCode: 'DEMO-ACT-CODE', confirmationCode: 'DEMO-CONF-CODE', wid: '89012345678901234567890123456789', balance: 12.5, currency: 'USD' },
      { type: 'esim', name: '\u65E5\u672C IIJmio', number: '+819****4567', expireDate: '2026-09-15', cycle: 365, remark: '', status: 'active' },
      { type: 'subscription', name: 'ChatGPT Plus', category: 'AI \u670D\u52A1', region: 'US', subId: '', expireDate: '2026-07-20', price: '20', billing: 'monthly', currency: 'USD', autoRenew: true, remindDays: [3, 1, 0], url: 'https://chat.openai.com', remark: '', status: 'active' },
      { type: 'subscription', name: 'YouTube Premium', category: '\u6D41\u5A92\u4F53', region: 'TR', subId: '', expireDate: '2026-08-01', price: '99.99', billing: 'yearly', currency: 'TRY', autoRenew: false, remindDays: [7, 3, 1], url: 'https://youtube.com/premium', remark: '\u571F\u8033\u5176\u533A', status: 'active' },
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
    if (data.success) { showToast(newStatus === 'paused' ? '\u5DF2\u6682\u505C' : '\u5DF2\u542F\u7528', 'success'); await loadItems(); }
    else showToast(data.message || '\u64CD\u4F5C\u5931\u8D25', 'error');
  } catch { showToast('\u64CD\u4F5C\u5931\u8D25', 'error'); }
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

// src/ui/styles.js
function getStyles() {
  return `    * { box-sizing: border-box; }
    body {
      background: linear-gradient(-45deg, #0f172a, #1e3a5f, #164e63, #1e293b);
      background-size: 400% 400%;
      animation: gradient 20s ease infinite;
      min-height: 100vh;
      min-height: 100dvh;
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
    .modal-overlay { background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); }
    .toast-container { position:fixed; top:1rem; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:0.5rem; pointer-events:none; }
    .toast { pointer-events:auto; padding:0.75rem 1.25rem; border-radius:0.75rem; font-size:0.875rem; font-weight:500; color:#fff; backdrop-filter:blur(12px); animation:toastIn 0.3s ease; max-width:24rem; text-align:center; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
    .toast-success { background:rgba(16,185,129,0.92); }
    .toast-error { background:rgba(239,68,68,0.92); }
    .toast-info { background:rgba(56,189,248,0.92); }
    @keyframes toastIn { from{opacity:0;transform:translateY(-1rem)} to{opacity:1;transform:translateY(0)} }
    @keyframes toastOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-1rem)} }
    .fade-in { animation:fadeIn 0.25s ease; }
    @keyframes fadeIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
    .tab-active { background:rgba(56,189,248,0.2); color:#38bdf8; border-color:#38bdf8; }
    ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:3px; }
    .list-row { transition:background 0.15s; } .list-row:hover { background:rgba(255,255,255,0.05); }
    .cal-day { min-height:80px; } .cal-day:hover { background:rgba(56,189,248,0.08); }
    .cal-event { font-size:0.65rem; padding:1px 4px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    select.glass-input option { background:#1e293b; color:#f1f5f9; }
    .fab-btn { box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
    .fab-btn:active { transform: scale(0.95); }
    .tag-badge { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:0.75rem; padding:0.35rem 0.75rem; display:inline-flex; align-items:center; gap:0.5rem; font-size:0.8125rem; }
    .tag-badge:hover { border-color:rgba(56,189,248,0.4); }
    .remind-chip { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    .remind-chip:hover { border-color: rgba(56,189,248,0.4); background: rgba(56,189,248,0.08); }
    .remind-chip:has(input:checked) { border-color: rgba(56,189,248,0.5); background: rgba(56,189,248,0.18); color: #38bdf8; }
    .custom-dropdown-list { max-height:220px; overflow-y:auto; z-index:60; background:#0f172a; border:1px solid rgba(255,255,255,0.15); box-shadow:0 12px 32px rgba(0,0,0,0.5); }
    .custom-dropdown-item { padding:0.6rem 0.85rem; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:space-between; }
    .custom-dropdown-item:hover, .custom-dropdown-item.active { background:rgba(56,189,248,0.18); color:#38bdf8; }
    /* Mobile responsive overrides */
    @media (max-width: 639px) {
      .cal-day { min-height:52px; padding:2px; }
      .cal-event { font-size:0.55rem; padding:0 2px; border-radius:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:block; }
      .glass-card { padding:14px !important; }
      .glass-card .btn-touch { min-height:36px; min-width:36px; }
      /* Prevent iOS zoom on input focus (font < 16px triggers zoom) */
      input, select, textarea { font-size: 16px !important; }
      /* Safe area insets & ample bottom clearance for mobile FAB and browser toolbar */
      body { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6.5rem) !important; }
      .fab-container { bottom: calc(env(safe-area-inset-bottom, 0px) + 1.25rem) !important; }
      .modal-overlay { padding: 0.5rem !important; align-items: flex-end !important; }
      .modal-box { max-height: 92dvh !important; border-bottom-left-radius: 0 !important; border-bottom-right-radius: 0 !important; }
      .scrollbar-none::-webkit-scrollbar { display: none; }
      .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
    }
`;
}

// src/ui/template.js
var cachedHTML = null;
function getHTML() {
  if (cachedHTML) return cachedHTML;
  cachedHTML = `<!DOCTYPE html>
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
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
  <div id="dashboard-view" class="hidden max-w-6xl mx-auto p-4 md:p-8 pb-28 sm:pb-8">
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
              <button onclick="toggleMenu(event)" class="text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors" title="\u66F4\u591A\u529F\u80FD">
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
        <button onclick="setFilter('all')" data-filter="all" class="filter-tab tab-active px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all whitespace-nowrap flex-shrink-0">
          <i class="fa-solid fa-globe mr-1"></i>\u5168\u90E8
        </button>
        <button onclick="setFilter('esim')" data-filter="esim" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5 whitespace-nowrap flex-shrink-0">
          <i class="fa-solid fa-sim-card mr-1"></i>eSIM
        </button>
        <button onclick="setFilter('subscription')" data-filter="subscription" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5 whitespace-nowrap flex-shrink-0">
          <i class="fa-solid fa-credit-card mr-1"></i>\u8BA2\u9605
        </button>
        <button onclick="setFilter('balance')" data-filter="balance" class="filter-tab px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5 whitespace-nowrap flex-shrink-0">
          <i class="fa-solid fa-wallet mr-1"></i>\u8BDD\u8D39
        </button>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
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

    <!-- Mobile Floating Action Button (FAB) -->
    <div class="fab-container fixed right-4 bottom-6 sm:hidden z-40">
      <div id="fab-menu" class="hidden flex flex-col gap-2 mb-3 items-end fade-in">
        <button onclick="openModal('esim');toggleFab();" class="glass bg-cyan-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-cyan-400/30">
          <i class="fa-solid fa-sim-card"></i> eSIM \u5361
        </button>
        <button onclick="openModal('subscription');toggleFab();" class="glass bg-violet-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-violet-400/30">
          <i class="fa-solid fa-credit-card"></i> \u8BA2\u9605\u670D\u52A1
        </button>
        <button onclick="openModal('balance');toggleFab();" class="glass bg-amber-600/90 text-white px-4 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 border border-amber-400/30">
          <i class="fa-solid fa-wallet"></i> \u8BDD\u8D39\u7BA1\u7406
        </button>
      </div>
      <button id="fab-btn" onclick="toggleFab()" class="fab-btn btn-primary rounded-full text-white flex items-center justify-center text-xl shadow-2xl transition-transform active:scale-95" style="width:52px;height:52px;" aria-label="\u5FEB\u6377\u6DFB\u52A0">
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
            <h3 id="modal-title" class="text-base sm:text-lg font-bold text-white truncate">\u6DFB\u52A0</h3>
            <p id="modal-subtitle" class="text-[11px] sm:text-xs text-slate-400 truncate">\u914D\u7F6E\u670D\u52A1\u8BE6\u60C5\u3001\u8D26\u671F\u4E0E\u63D0\u9192\u89C4\u5219</p>
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
                <span>\u540D\u79F0 <span class="text-red-400">*</span></span>
                <span class="text-[11px] font-normal text-slate-400">\u5982: Netflix / Ultra Mobile / iCloud</span>
              </label>
              <input id="form-name" type="text" required placeholder="\u8F93\u5165\u670D\u52A1\u6216\u5361\u7247\u540D\u79F0" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>

            <!-- Subscription Category & Region (2 Columns) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="field-category" class="hidden">
                <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <i class="fa-solid fa-layer-group text-sky-400 text-xs"></i>
                  <span>\u5206\u7C7B\u9884\u8BBE / \u8F93\u5165</span>
                </label>
                <input id="form-category" type="text" list="category-datalist" placeholder="\u9009\u62E9\u6216\u8F93\u5165\u5206\u7C7B..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" autocomplete="off">
                <datalist id="category-datalist"></datalist>
              </div>
              
              <div id="field-region" class="hidden">
                <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <i class="fa-solid fa-globe text-emerald-400 text-xs"></i>
                  <span>\u8D26\u53F7\u533A\u57DF / \u56FD\u5BB6</span>
                </label>
                <input id="form-region" type="text" list="region-datalist" placeholder="\u5982: US / TR / \u5927\u9646..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" autocomplete="off">
                <datalist id="region-datalist"></datalist>
              </div>
            </div>

            <!-- Phone Number (eSIM & Balance) -->
            <div id="field-number" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-phone text-cyan-400 text-xs"></i>
                <span>\u624B\u673A\u53F7\u7801</span>
              </label>
              <input id="form-number" type="text" placeholder="+861****8000 / +1234567890" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
            </div>

            <!-- Subscription ID / Account -->
            <div id="field-sub-id" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-user-tag text-purple-400 text-xs"></i>
                <span>\u8BA2\u9605\u8D26\u53F7 / \u90AE\u7BB1 (\u53EF\u9009)</span>
              </label>
              <input id="form-sub-id" type="text" placeholder="\u8D26\u53F7\u90AE\u7BB1\u6216\u8BA2\u9605\u552F\u4E00\u8BC6\u522B\u7801" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>
          </div>

          <!-- Section 2: Subscription Price & Billing -->
          <div id="field-price" class="hidden bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3.5">
            <div class="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <i class="fa-solid fa-receipt text-xs"></i> \u8D39\u7528\u4E0E\u8BA1\u8D39\u5468\u671F
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u4EF7\u683C / \u8D39\u7528</label>
                <input id="form-price" type="number" step="0.01" min="0" placeholder="9.99" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u8D27\u5E01\u5E01\u79CD</label>
                <input id="form-currency" type="text" list="currency-datalist" placeholder="\u641C\u7D22 (\u5982 USD, CNY)..." class="glass-input w-full px-3 py-2 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u5468\u671F\u7C7B\u578B</label>
                <select id="form-billing" class="glass-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="monthly">\u6708\u4ED8</option>
                  <option value="yearly">\u5E74\u4ED8</option>
                  <option value="once">\u4E00\u6B21\u6027</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div id="field-billing-mode">
                <label class="text-xs text-slate-400 mb-1 block">\u8BA1\u8D39\u65B9\u5F0F</label>
                <select id="form-billing-mode" class="glass-input w-full px-3 py-2 rounded-xl text-sm">
                  <option value="natural">\u81EA\u7136\u6708 / \u5E74</option>
                  <option value="fixed">\u56FA\u5B9A\u5929\u6570</option>
                </select>
              </div>
              <div id="field-cycle-days" class="hidden">
                <label class="text-xs text-slate-400 mb-1 block">\u56FA\u5B9A\u5929\u6570 (\u5929)</label>
                <input id="form-cycle-days" type="number" min="1" placeholder="\u9ED8\u8BA430\u5929" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div class="sm:col-span-2 flex items-center justify-between pt-1">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" id="form-auto-renew" class="rounded accent-sky-500 w-4 h-4">
                  <span>\u81EA\u52A8\u7EED\u8D39 <span class="text-slate-400 text-[11px]">(\u5230\u671F\u514D\u624B\u52A8\u7EED\u671F\uFF0C\u7CFB\u7EDF\u6309\u5468\u671F\u987A\u5EF6)</span></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 3: eSIM Specific Balance & Activation -->
          <div id="field-esim-balance" class="hidden bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10">
            <div class="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-3">
              <i class="fa-solid fa-wallet text-xs"></i> \u4F59\u989D\u8FFD\u8E2A (\u53EF\u9009)
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u5F53\u524D\u4F59\u989D</label>
                <input id="form-balance-esim" type="number" step="0.01" placeholder="\u4E0D\u586B\u8868\u793A\u4E0D\u8FFD\u8E2A\u4F59\u989D" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u8D27\u5E01</label>
                <input id="form-currency-esim" type="text" list="currency-datalist" placeholder="\u5982 USD, CNY..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
            </div>
          </div>

          <div id="field-esim-activation" class="hidden bg-cyan-950/20 p-3.5 sm:p-4 rounded-2xl border border-cyan-500/20 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <i class="fa-solid fa-qrcode"></i> eSIM \u6FC0\u6D3B\u53C2\u6570 (\u652F\u6301\u626B\u7801\u5B89\u88C5)
              </span>
              <span class="text-[10px] text-amber-400/90 font-medium">\u{1F512} \u654F\u611F\u4FE1\u606F\u52A0\u5BC6</span>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">SM-DP+ \u5730\u5740</label>
              <input id="form-smdp" type="text" placeholder="\u5982: rsp.truphone.com" class="glass-input w-full px-3.5 py-2 rounded-xl text-xs font-mono">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u6FC0\u6D3B\u7801 (Matching ID)</label>
                <div class="relative">
                  <input id="form-activation-code" type="password" placeholder="\u6FC0\u6D3B\u7801" class="glass-input w-full pl-3 pr-8 py-2 rounded-xl text-xs font-mono" autocomplete="off">
                  <button type="button" onclick="togglePasswordVis('form-activation-code', this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class="fa-solid fa-eye-slash text-xs"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u786E\u8BA4\u7801 (Confirmation Code)</label>
                <div class="relative">
                  <input id="form-confirmation-code" type="password" placeholder="\u53EF\u9009\u786E\u8BA4\u7801" class="glass-input w-full pl-3 pr-8 py-2 rounded-xl text-xs font-mono" autocomplete="off">
                  <button type="button" onclick="togglePasswordVis('form-confirmation-code', this)" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class="fa-solid fa-eye-slash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">EID / WID (\u53EF\u9009\u8BBE\u5907\u6807\u8BC6)</label>
              <input id="form-wid" type="text" placeholder="32\u4F4D EID" class="glass-input w-full px-3.5 py-2 rounded-xl text-xs font-mono">
            </div>
          </div>

          <!-- Section 4: Balance Mode Details -->
          <div id="field-balance" class="hidden bg-amber-950/20 p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 space-y-3">
            <div class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <i class="fa-solid fa-coins text-xs"></i> \u8BDD\u8D39\u4E0E\u505C\u673A\u9884\u6D4B\u89C4\u5219
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u5F53\u524D\u4F59\u989D *</label>
                <input id="form-balance" type="number" step="0.01" min="0" placeholder="50.00" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u6708\u79DF *</label>
                <input id="form-monthly-fee" type="number" step="0.01" min="0" placeholder="18.00" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u6263\u8D39\u65E5 (1-28) *</label>
                <input id="form-billing-day" type="number" min="1" max="28" placeholder="5" class="glass-input w-full px-3 py-2 rounded-xl text-sm font-mono">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u8D27\u5E01</label>
                <input id="form-currency-balance" type="text" list="currency-datalist" placeholder="\u5982 CNY, HKD..." class="glass-input w-full px-3 py-2 rounded-xl text-sm uppercase" autocomplete="off">
              </div>
            </div>
          </div>

          <!-- Section 5: Dates & Reminders -->
          <div class="bg-white/5 p-3.5 sm:p-4 rounded-2xl border border-white/10 space-y-3.5">
            <div class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <i class="fa-regular fa-calendar-check text-sky-400 text-xs"></i> \u5468\u671F\u4E0E\u63D0\u9192\u914D\u7F6E
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div id="field-expire">
                <label class="text-xs text-slate-400 mb-1 block">\u5230\u671F\u65E5\u671F <span class="text-red-400">*</span></label>
                <input id="form-expire" type="date" min="2020-01-01" max="2035-12-31" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm" lang="zh-CN">
              </div>
              <div id="field-cycle">
                <label class="text-xs text-slate-400 mb-1 block">\u4FDD\u53F7 / \u7EED\u8D39\u5468\u671F (\u5929)</label>
                <input id="form-cycle" type="number" min="1" placeholder="\u5982: 180" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono">
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 mb-2 block">\u63D0\u524D\u63D0\u9192\u65F6\u95F4 (\u652F\u6301\u591A\u9009)</label>
              <div class="flex flex-wrap gap-2" id="remind-checkboxes">
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="30" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">30\u5929\u524D</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="15" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">15\u5929\u524D</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="7" class="remind-day rounded accent-sky-500"> <span class="text-slate-300">7\u5929\u524D</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="3" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">3\u5929\u524D</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="1" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">1\u5929\u524D</span>
                </label>
                <label class="remind-chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs cursor-pointer select-none">
                  <input type="checkbox" value="0" class="remind-day rounded accent-sky-500" checked> <span class="text-slate-300">\u5F53\u5929</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 6: URLs & Remarks & Status -->
          <div class="space-y-3.5">
            <div id="field-url" class="hidden">
              <label class="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-link text-sky-400 text-xs"></i>
                <span>\u670D\u52A1\u94FE\u63A5 (\u5B98\u7F51 / \u63A7\u5236\u53F0)</span>
              </label>
              <input id="form-url" type="url" placeholder="https://example.com" class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="text-xs text-slate-400 mb-1.5 block">\u5907\u6CE8\u4FE1\u606F (\u53EF\u9009)</label>
                <input id="form-remark" type="text" placeholder="\u8BB0\u5F55\u5957\u9910\u8BF4\u660E\u3001PIN/PUK\u3001\u7EED\u8D39\u89C4\u5219..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm">
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1.5 block">\u72B6\u6001</label>
                <select id="form-status" class="glass-input w-full px-3 py-2.5 rounded-xl text-sm">
                  <option value="active">\u{1F7E2} \u542F\u7528\u4E2D</option>
                  <option value="paused">\u23F8\uFE0F \u5DF2\u6682\u505C</option>
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
            <span>\u4FDD\u5B58</span>
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl font-semibold text-slate-300 text-sm border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all">
            \u53D6\u6D88
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
            <h3 class="text-base sm:text-lg font-bold text-white truncate">\u504F\u597D\u4E0E\u9884\u8BBE\u7BA1\u7406</h3>
            <p class="text-[11px] sm:text-xs text-slate-400 truncate">\u914D\u7F6E\u8D27\u5E01\u6C47\u7387\u3001\u5E38\u7528\u5206\u7C7B\u4E0E\u8D26\u53F7\u533A\u57DF</p>
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
            <i class="fa-solid fa-coins mr-1.5 text-amber-400"></i>\u8D27\u5E01\u4E0E\u6C47\u7387
          </button>
          <button onclick="setSettingsTab('category')" id="stab-btn-category" class="settings-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
            <i class="fa-solid fa-layer-group mr-1.5 text-sky-400"></i>\u9884\u8BBE\u5206\u7C7B
          </button>
          <button onclick="setSettingsTab('region')" id="stab-btn-region" class="settings-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5">
            <i class="fa-solid fa-globe mr-1.5 text-emerald-400"></i>\u9884\u8BBE\u533A\u57DF
          </button>
        </div>

        <!-- Tab 1: Currency & Rates -->
        <div id="stab-content-currency" class="space-y-4">
          <div class="bg-white/5 rounded-xl p-4 border border-white/10">
            <label class="text-sm font-semibold text-white mb-1.5 block">\u7EDF\u8BA1\u57FA\u51C6\u8D27\u5E01 (Base Currency)</label>
            <p class="text-xs text-slate-400 mb-3">\u5168\u5E01\u79CD\u603B\u652F\u51FA\u6298\u7B97\u65F6\uFF0C\u6240\u6709\u5916\u5E01\u5747\u6309\u6B64\u57FA\u51C6\u5E01\u79CD\u8FDB\u884C\u6298\u7B97</p>
            <select id="settings-base-currency" onchange="onBaseCurrencyChange()" class="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-sky-300"></select>
          </div>

          <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div>
              <div class="text-sm font-semibold text-white">\u5404\u5E01\u79CD\u6C47\u7387\u7BA1\u7406 (1 \u5916\u5E01 = X \u57FA\u51C6\u8D27\u5E01)</div>
              <div class="text-xs text-slate-400">\u652F\u6301\u4E00\u952E\u540C\u6B65\u6700\u65B0\u516C\u7F51\u5B9E\u65F6\u6C47\u7387\uFF0C\u4E5F\u53EF\u9488\u5BF9\u7279\u5B9A\u6E20\u9053\u624B\u52A8\u5FAE\u8C03</div>
            </div>
            <div class="flex gap-2">
              <button type="button" onclick="syncLiveRates()" id="sync-rates-btn" class="px-3 py-1.5 rounded-xl text-xs font-bold text-sky-300 border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 transition-colors flex items-center gap-1.5">
                <i class="fa-solid fa-rotate mr-1"></i>\u540C\u6B65\u5B9E\u65F6\u6C47\u7387
              </button>
              <button type="button" onclick="resetDefaultRates()" class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">
                \u6062\u590D\u9ED8\u8BA4
              </button>
            </div>
          </div>

          <div class="relative">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input id="settings-rate-search" type="text" placeholder="\u641C\u7D22\u8D27\u5E01\u4EE3\u7801 (\u5982 USD)\u3001\u4E2D\u6587\u540D (\u5982 \u7F8E\u5143)\u3001\u7B26\u53F7..." oninput="filterRateList()" class="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs">
          </div>

          <div id="settings-rate-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1"></div>
        </div>

        <!-- Tab 2: Categories -->
        <div id="stab-content-category" class="space-y-4 hidden">
          <div>
            <div class="text-sm font-semibold text-white mb-1">\u5E38\u7528\u5206\u7C7B\u9884\u8BBE</div>
            <div class="text-xs text-slate-400 mb-3">\u5728\u5F55\u5165\u8BA2\u9605\u670D\u52A1\u65F6\u4F5C\u4E3A\u4E0B\u62C9\u5EFA\u8BAE\u63D0\u4F9B\u3002\u652F\u6301\u968F\u65F6\u589E\u5220\u81EA\u5B9A\u4E49\u5206\u7C7B\u3002</div>
            <div id="settings-category-tags" class="flex flex-wrap gap-2 mb-4"></div>
          </div>
          <div class="flex gap-2">
            <input id="settings-new-category" type="text" placeholder="\u8F93\u5165\u65B0\u5206\u7C7B\u540D\u79F0 (\u5982: \u6E38\u620F\u5185\u8D2D / \u4F1A\u5458)..." class="glass-input flex-1 px-4 py-2.5 rounded-xl text-sm" onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomCategory();}">
            <button type="button" onclick="addCustomCategory()" class="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 flex-shrink-0">
              <i class="fa-solid fa-plus"></i> \u6DFB\u52A0
            </button>
          </div>
          <div class="pt-2">
            <button type="button" onclick="resetDefaultCategories()" class="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              \u6062\u590D\u9ED8\u8BA4\u9884\u8BBE\u5206\u7C7B
            </button>
          </div>
        </div>

        <!-- Tab 3: Regions -->
        <div id="stab-content-region" class="space-y-4 hidden">
          <div>
            <div class="text-sm font-semibold text-white mb-1">\u5E38\u7528\u533A\u57DF / \u56FD\u5BB6\u9884\u8BBE</div>
            <div class="text-xs text-slate-400 mb-3">\u65B9\u4FBF\u8DE8\u533A\u8BA2\u9605\u5FEB\u901F\u9009\u586B\u3002\u652F\u6301\u4ECE\u5168\u7403\u56FD\u5BB6\u5217\u8868\u4E2D\u5FEB\u901F\u68C0\u7D22\u5E76\u6DFB\u52A0\u3002</div>
            <div id="settings-region-tags" class="flex flex-wrap gap-2 mb-4"></div>
          </div>
          
          <!-- Quick Country Search -->
          <div class="bg-white/5 p-3 rounded-xl border border-white/10 mb-3">
            <label class="text-xs text-slate-300 font-semibold mb-1.5 block"><i class="fa-solid fa-magnifying-glass mr-1 text-emerald-400"></i>\u5168\u7403\u56FD\u5BB6/\u5730\u533A\u68C0\u7D22\u5FEB\u901F\u586B\u5145\uFF1A</label>
            <input id="settings-country-search" type="text" list="settings-country-datalist" placeholder="\u8F93\u5165\u56FD\u5BB6\u540D\u79F0\u6216\u4EE3\u7801\u68C0\u7D22 (\u5982: \u571F\u8033\u5176 / TR / \u57C3\u53CA / \u963F\u6839\u5EF7 / \u65E5\u672C)..." oninput="onSelectCountryPreset(this.value)" class="glass-input w-full px-4 py-2.5 rounded-xl text-sm" autocomplete="off">
            <datalist id="settings-country-datalist"></datalist>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input id="settings-new-region-code" type="text" placeholder="\u4EE3\u7801(\u5982 TR)" class="glass-input sm:col-span-3 px-4 py-2.5 rounded-xl text-sm uppercase">
            <input id="settings-new-region-name" type="text" placeholder="\u540D\u79F0(\u5982 \u571F\u8033\u5176)" class="glass-input sm:col-span-4 px-4 py-2.5 rounded-xl text-sm">
            <input id="settings-new-region-flag" type="text" placeholder="\u65D7\u5E1C(\u5982 \u{1F1F9}\u{1F1F7})" class="glass-input sm:col-span-2 px-4 py-2.5 rounded-xl text-sm text-center">
            <button type="button" onclick="addCustomRegion()" class="btn-primary sm:col-span-3 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plus"></i> \u6DFB\u52A0\u533A\u57DF
            </button>
          </div>
          <div class="pt-2">
            <button type="button" onclick="resetDefaultRegions()" class="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              \u6062\u590D\u9ED8\u8BA4\u9884\u8BBE\u533A\u57DF
            </button>
          </div>
        </div>
      </div>

      <!-- Settings Footer (Fixed) -->
      <div class="flex-shrink-0 px-5 py-4 sm:px-6 sm:py-4 border-t border-white/10 bg-slate-900/60 backdrop-blur-md flex gap-3">
        <button type="button" onclick="saveSettingsToServer()" id="save-settings-btn" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform">
          <i class="fa-solid fa-floppy-disk"></i> \u4FDD\u5B58\u8BBE\u7F6E
        </button>
        <button type="button" onclick="closeSettings()" class="flex-1 py-3 rounded-xl font-semibold text-slate-300 border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all">
          \u53D6\u6D88
        </button>
      </div>
    </div>
  </div>

  <!-- ========== QR CODE MODAL ========== -->
  <div id="qr-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in text-center">
      <div class="flex justify-between items-center mb-4">
        <h3 id="qr-title" class="text-lg font-bold text-white flex items-center gap-2">
          <i class="fa-solid fa-qrcode text-cyan-400"></i> eSIM \u5B89\u88C5\u4E8C\u7EF4\u7801
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
          <span class="text-slate-400 font-sans">\u6FC0\u6D3B\u7801:</span>
          <span id="qr-act-val" class="truncate max-w-[180px]"></span>
        </div>
        <div id="qr-conf-row" class="flex justify-between items-center text-slate-300 hidden">
          <span class="text-slate-400 font-sans">\u786E\u8BA4\u7801:</span>
          <span id="qr-conf-val" class="truncate max-w-[180px]"></span>
        </div>
      </div>
      <div class="space-y-2">
        <button onclick="copyLpaString()" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2">
          <i class="fa-solid fa-copy"></i> \u590D\u5236\u5B8C\u6574 LPA \u6FC0\u6D3B\u4EE3\u7801
        </button>
        <div class="flex gap-2">
          <button onclick="copyText(document.getElementById('qr-smdp-val').textContent, 'SM-DP+ \u5730\u5740')" class="flex-1 py-2 rounded-lg text-xs text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u590D\u5236 SM-DP+</button>
          <button onclick="copyText(document.getElementById('qr-act-val').textContent, '\u6FC0\u6D3B\u7801')" class="flex-1 py-2 rounded-lg text-xs text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u590D\u5236\u6FC0\u6D3B\u7801</button>
        </div>
      </div>
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
        <button onclick="filterHistory('deduct')" data-hfilter="deduct" class="hfilter-tab px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent transition-all text-slate-400 hover:text-white hover:bg-white/5"><i class="fa-solid fa-minus-circle mr-1"></i>\u6263\u8D39</button>
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

  <!-- ========== RENEW MODAL ========== -->
  <div id="renew-overlay" class="modal-overlay fixed inset-0 z-50 hidden items-center justify-center p-4">
    <div class="glass rounded-2xl p-6 max-w-sm w-full fade-in">
      <h3 id="renew-title" class="text-lg font-bold text-white mb-4">\u7EED\u671F</h3>
      <p id="renew-info" class="text-sm text-slate-400 mb-4"></p>
      <form id="renew-form">
        <div id="renew-balance-fields" class="space-y-3">
          <div class="bg-white/5 rounded-xl p-3">
            <label class="text-sm text-slate-400 mb-1 block">\u672C\u6B21\u4F59\u989D\u53D8\u52A8\uFF08\u53EF\u9009\uFF09</label>
            <input id="renew-balance-delta" type="number" step="0.01" placeholder="\u8D1F\u6570=\u6263\u8D39\uFF0C\u6B63\u6570=\u5145\u503C\uFF0C\u7559\u7A7A=\u4EC5\u7EED\u671F" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
          <div>
            <label class="text-sm text-slate-400 mb-1 block">\u5907\u6CE8\uFF08\u53EF\u9009\uFF09</label>
            <input id="renew-balance-note" type="text" placeholder="\u5982\uFF1A\u5E74\u8D39\u7EED\u671F\u6263\u6B3E" class="glass-input w-full px-4 py-3 rounded-xl text-sm">
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button id="renew-submit" type="submit" class="btn-primary flex-1 py-3 rounded-xl font-bold text-white"><i class="fa-solid fa-rotate mr-1"></i>\u786E\u8BA4\u7EED\u671F</button>
          <button type="button" onclick="document.getElementById('renew-overlay').classList.add('hidden');document.getElementById('renew-overlay').classList.remove('flex');" class="flex-1 py-3 rounded-xl font-bold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors">\u53D6\u6D88</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========== TOAST ========== -->
  <div id="toast-container" class="toast-container"></div>

  <!-- ========== DROPDOWN (body level, escapes all stacking contexts) ========== -->
  <div id="dropdown-menu" class="hidden fixed glass rounded-xl p-2 min-w-[160px]" style="z-index:99999">
    <button onclick="openSettings()" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 transition-colors">
      <i class="fa-solid fa-sliders mr-2 text-violet-400"></i>\u504F\u597D\u8BBE\u7F6E
    </button>
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
  return cachedHTML;
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
  if (path.startsWith("/api/settings")) {
    const result = await handleSettings(request, env, path);
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
      const currSym4 = CURRENCY_SYMBOLS[item.currency] || item.currency || "\xA5";
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
` : "") + `\u{1F4B0} \u4F59\u989D: ${currSym4}${item.balance}
\u{1F4B8} \u6708\u79DF: ${currSym4}${item.monthlyFee}/\u6708
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

// src/services/auto-deduct.js
function tg3(s) {
  return escapeTelegramHTML(s);
}
function currSym2(code) {
  return CURRENCY_SYMBOLS[code] || code || "\xA5";
}
async function autoDeduct(env, now = /* @__PURE__ */ new Date()) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;
  const today = todayString(now);
  const todayDay = parseInt(today.split("-")[2], 10);
  let changed = false;
  const deductedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type !== "balance") continue;
    if (item.status !== "active") continue;
    if (!item.monthlyFee || item.monthlyFee <= 0) continue;
    if (!item.billingDay) continue;
    if (todayDay !== item.billingDay) continue;
    if (item.lastDeductDate === today) continue;
    const fee = item.monthlyFee;
    const oldBalance = item.balance;
    const newBalance = Math.round((oldBalance - fee) * 100) / 100;
    if (newBalance < 0) {
      const sym = currSym2(item.currency);
      const msg = [
        `\u{1F6A8} <b>\u3010Sub-Tracker \u4F59\u989D\u4E0D\u8DB3\u3011</b>`,
        "",
        `\u{1F4F1} \u540D\u79F0: ${tg3(item.name)}`,
        item.number ? `\u{1F4DE} \u53F7\u7801: ${tg3(item.number)}` : "",
        `\u{1F4B0} \u6263\u8D39\u524D\u4F59\u989D: ${sym}${oldBalance}`,
        `\u{1F4B8} \u672C\u6708\u6708\u79DF: ${sym}${fee}`,
        `\u26A0\uFE0F \u6263\u8D39\u540E\u4F59\u989D: ${sym}${newBalance}`,
        `\u{1F4C5} \u6BCF\u6708${item.billingDay}\u65E5\u6263\u8D39`,
        item.remark ? `\u{1F4DD} \u5907\u6CE8: ${tg3(item.remark)}` : "",
        "",
        "\u8BF7\u5C3D\u5FEB\u5145\u503C\uFF0C\u907F\u514D\u505C\u673A\uFF01"
      ].filter(Boolean).join("\n");
      await sendNotifications(env, msg).catch(() => {
      });
    }
    const newSuspendDate = calcSuspendDate(newBalance, fee, item.billingDay, now);
    items[i] = {
      ...item,
      balance: newBalance,
      predictedSuspendDate: newSuspendDate,
      lastDeductDate: today
    };
    changed = true;
    deductedItems.push({
      item: items[i],
      fee,
      oldBalance,
      newBalance
    });
  }
  if (changed) {
    await saveAllItems(env.DB, items);
    for (const { item, fee, oldBalance, newBalance } of deductedItems) {
      await addHistory(env.DB, {
        action: "deduct",
        itemId: item.id,
        itemName: item.name,
        details: {
          fee,
          oldBalance,
          newBalance,
          billingDay: item.billingDay
        }
      }).catch(() => {
      });
      console.log(`Auto-deducted ${fee} from "${item.name}" (${oldBalance} \u2192 ${newBalance})`);
    }
  }
}

// src/services/auto-renew.js
function tg4(s) {
  return escapeTelegramHTML(s);
}
function currSym3(code) {
  return CURRENCY_SYMBOLS[code] || code || "\xA5";
}
async function autoRenewSubscriptions(env, now = /* @__PURE__ */ new Date()) {
  const items = await getAllItems(env.DB);
  if (!items.length) return;
  const today = todayString(now);
  let changed = false;
  const renewedItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type !== "subscription") continue;
    if (item.status !== "active") continue;
    if (!item.autoRenew) continue;
    if (!item.expireDate) continue;
    if (item.billing === "once") continue;
    if (item.expireDate <= today) {
      const mode = item.billingMode || "natural";
      const baseDate = item.expireDate;
      const newExpireDate = addBillingPeriod(baseDate, item.billing, mode, item.cycleDays);
      items[i] = {
        ...item,
        expireDate: newExpireDate
      };
      changed = true;
      renewedItems.push({
        item: items[i],
        baseDate,
        newExpireDate
      });
    }
  }
  if (changed) {
    await saveAllItems(env.DB, items);
    for (const { item, baseDate, newExpireDate } of renewedItems) {
      await addHistory(env.DB, {
        action: "renew",
        itemId: item.id,
        itemName: item.name,
        itemType: "subscription",
        details: {
          oldExpireDate: baseDate,
          newExpireDate,
          auto: true
        }
      }).catch(() => {
      });
      const sym = currSym3(item.currency);
      const priceText = item.price ? `
\u{1F4B0} \u7EED\u8D39\u91D1\u989D: ${sym}${item.price}` : "";
      const msg = [
        `\u{1F504} <b>\u3010Sub-Tracker \u8BA2\u9605\u81EA\u52A8\u7EED\u8D39\u3011</b>`,
        "",
        `\u{1F4E6} \u8BA2\u9605\u540D\u79F0: ${tg4(item.name)}`,
        item.category ? `\u{1F3F7}\uFE0F \u5206\u7C7B: ${tg4(item.category)}` : "",
        priceText,
        `\u{1F4C5} \u4E0A\u671F\u5230\u671F: ${baseDate}`,
        `\u{1F389} \u65B0\u5230\u671F\u65E5: <b>${newExpireDate}</b>`,
        item.remark ? `\u{1F4DD} \u5907\u6CE8: ${tg4(item.remark)}` : "",
        "",
        "<i>\u7CFB\u7EDF\u5DF2\u6839\u636E\u8BBE\u7F6E\u81EA\u52A8\u987A\u5EF6\u4E0B\u4E00\u4E2A\u8BA1\u8D39\u5468\u671F\u3002</i>"
      ].filter(Boolean).join("\n");
      await sendNotifications(env, msg, { title: "Sub-Tracker \u81EA\u52A8\u7EED\u8D39" }).catch(() => {
      });
      console.log(`Auto-renewed subscription "${item.name}" (${baseDate} \u2192 ${newExpireDate})`);
    }
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
      await autoDeduct(env);
      await autoRenewSubscriptions(env);
      await checkReminders(env);
    } catch (err) {
      console.error("Cron error:", err);
    }
  }
};
export {
  index_default as default
};
