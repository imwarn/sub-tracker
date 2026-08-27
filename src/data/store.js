/**
 * KV data store operations
 * All items (eSIM + subscriptions) are stored in a single KV key as a JSON array.
 *
 * ⚠️ CONCURRENCY NOTE: All CRUD operations are read-modify-write without locking.
 * Concurrent requests (e.g. two devices editing simultaneously) can cause lost writes
 * where the later save overwrites earlier changes. This is acceptable for personal use
 * (<100 items, single user) but should be considered if multi-user access is added.
 * For concurrent-safe storage, migrate to Cloudflare D1 with transactions.
 *
 * KV Key Layout:
 *   items               → JSON array of all items
 *   settings            → JSON object of app preferences & exchange rates
 *   TG_BOT_TOKEN        → Telegram bot token
 *   TG_CHAT_ID          → Telegram chat ID
 *   DEFAULT_NOTIFY_CHANNEL → Default notification channel
 *   AUTH_NOTIFY_CHANNEL → OTP notification channel
 *   admin_auth_code     → Current OTP code (TTL 300s)
 *   admin_auth_attempts → Failed attempt counter (TTL 300s)
 *   session_token_<uuid> → Active session (TTL 2592000s = 30d)
 *   history             → JSON array of recent activity entries
 */

import {
  DEFAULT_CATEGORIES,
  DEFAULT_EXCHANGE_RATES,
  DEFAULT_REGIONS,
} from './constants.js';

const ITEMS_KEY = 'items';
const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 100;

export function getDefaultSettings() {
  return {
    baseCurrency: 'CNY',
    exchangeRates: { ...DEFAULT_EXCHANGE_RATES },
    categories: [...DEFAULT_CATEGORIES],
    regions: [...DEFAULT_REGIONS],
    defaultRemindDays: [3, 1, 0],
  };
}

/**
 * Get all items from KV
 * @param {KVNamespace} db
 * @returns {Promise<Array>}
 */
export async function getAllItems(db) {
  try {
    const items = await db.get(ITEMS_KEY, { type: 'json' });
    return items || [];
  } catch {
    return [];
  }
}

/**
 * Save all items to KV
 * @param {KVNamespace} db
 * @param {Array} items
 */
export async function saveAllItems(db, items) {
  await db.put(ITEMS_KEY, JSON.stringify(items));
}

/**
 * Get a single item by ID
 */
export async function getItemById(db, id) {
  const items = await getAllItems(db);
  return items.find(item => item.id === id) || null;
}

/**
 * Add a new item
 */
export async function addItem(db, item) {
  const items = await getAllItems(db);
  items.push(item);
  await saveAllItems(db, items);
  return item;
}

/**
 * Update an existing item by ID
 */
export async function updateItem(db, id, updater) {
  const items = await getAllItems(db);
  const idx = items.findIndex(item => item.id === id);
  if (idx === -1) return null;
  items[idx] = updater(items[idx]);
  await saveAllItems(db, items);
  return items[idx];
}

/**
 * Delete an item by ID
 */
export async function deleteItem(db, id) {
  const items = await getAllItems(db);
  const deleted = items.find(item => item.id === id);
  const filtered = items.filter(item => item.id !== id);
  if (filtered.length === items.length) return false;
  await saveAllItems(db, filtered);
  return deleted;
}

/**
 * Get items filtered by type
 */
export async function getItemsByType(db, type) {
  const items = await getAllItems(db);
  return items.filter(item => item.type === type);
}

/**
 * Get user settings merged with defaults
 */
export async function getSettings(db) {
  const defaults = getDefaultSettings();
  try {
    const custom = await db.get(SETTINGS_KEY, { type: 'json' });
    if (!custom || typeof custom !== 'object') return defaults;
    return {
      baseCurrency: custom.baseCurrency || defaults.baseCurrency,
      exchangeRates: { ...defaults.exchangeRates, ...(custom.exchangeRates || {}) },
      categories: Array.isArray(custom.categories) && custom.categories.length > 0 ? custom.categories : defaults.categories,
      regions: Array.isArray(custom.regions) && custom.regions.length > 0 ? custom.regions : defaults.regions,
      defaultRemindDays: Array.isArray(custom.defaultRemindDays) ? custom.defaultRemindDays : defaults.defaultRemindDays,
    };
  } catch {
    return defaults;
  }
}

/**
 * Save user settings to KV
 */
export async function saveSettings(db, settings) {
  await db.put(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

/**
 * Get a config value from KV
 */
export async function getConfig(db, key) {
  return await db.get(key);
}

/**
 * Set a config value in KV
 */
export async function setConfig(db, key, value, options) {
  await db.put(key, value, options);
}

export async function getHistory(db, limit = HISTORY_LIMIT) {
  try {
    const history = await db.get(HISTORY_KEY, { type: 'json' });
    return (history || []).slice(0, limit);
  } catch {
    return [];
  }
}

export async function addHistory(db, entry) {
  const history = await getHistory(db, HISTORY_LIMIT);
  const next = [
    {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    },
    ...history,
  ].slice(0, HISTORY_LIMIT);
  await db.put(HISTORY_KEY, JSON.stringify(next));
  return next[0];
}

export async function clearHistory(db) {
  await db.put(HISTORY_KEY, JSON.stringify([]));
}
