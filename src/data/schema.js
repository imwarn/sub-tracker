/**
 * Unified data schema for eSIM cards, subscriptions, and balance trackers.
 */

import {
  BILLING_TYPES,
  CURRENCY_CODES,
  DEFAULT_REMIND_DAYS,
  ITEM_TYPES,
  REMIND_DAY_OPTIONS,
  STATUSES,
} from './constants.js';
import { calcSuspendDate } from '../utils/date.js';

const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function asString(value, fallback = '') {
  return value == null ? fallback : String(value).trim();
}

function asNumber(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asInteger(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

export function normalizeRemindDays(value) {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? DEFAULT_REMIND_DAYS : [value];
  const days = raw
    .map(day => Number(day))
    .filter(day => Number.isInteger(day) && REMIND_DAY_OPTIONS.includes(day));
  return [...new Set(days)].sort((a, b) => b - a);
}

function isValidDateString(value) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Create a new item with defaults
 * @param {'esim'|'subscription'|'balance'} type
 * @param {object} data
 * @returns {object}
 */
export function createItem(type, data) {
  const status = STATUSES.includes(data.status) ? data.status : 'active';
  const base = {
    id: crypto.randomUUID(),
    type,
    name: asString(data.name),
    expireDate: asString(data.expireDate),
    cycle: asInteger(data.cycle),
    remark: asString(data.remark),
    status,
    createdAt: new Date().toISOString(),
  };

  if (type === 'esim') {
    return {
      ...base,
      number: asString(data.number),
    };
  }

  if (type === 'balance') {
    const balance = asNumber(data.balance, 0);
    const monthlyFee = asNumber(data.monthlyFee, 0);
    const billingDay = asInteger(data.billingDay, 1);
    return {
      ...base,
      number: asString(data.number),
      balance,
      monthlyFee,
      billingDay,
      currency: CURRENCY_CODES.includes(data.currency) ? data.currency : 'CNY',
      remindDays: normalizeRemindDays(data.remindDays),
      predictedSuspendDate: calcSuspendDate(balance, monthlyFee, billingDay),
    };
  }

  // subscription
  return {
    ...base,
    category: asString(data.category),
    region: asString(data.region),
    subId: asString(data.subId),
    price: data.price === '' || data.price == null ? null : asString(data.price),
    billing: BILLING_TYPES.includes(data.billing) ? data.billing : 'monthly',
    currency: CURRENCY_CODES.includes(data.currency) ? data.currency : 'CNY',
    autoRenew: Boolean(data.autoRenew),
    remindDays: normalizeRemindDays(data.remindDays),
    url: asString(data.url),
  };
}

/**
 * Validate required fields
 */
export function validateItem(type, data) {
  if (!ITEM_TYPES.includes(type)) return '无效的类型';

  const name = asString(data.name);
  if (!name) return '名称不能为空';
  if (name.length > 120) return '名称不能超过 120 个字符';

  const status = data.status || 'active';
  if (!STATUSES.includes(status)) return '状态只能是 active 或 paused';

  const cycle = data.cycle;
  if (cycle != null && cycle !== '') {
    const n = Number(cycle);
    if (!Number.isInteger(n) || n < 1) return '周期须为正整数';
  }

  if (type !== 'balance') {
    if (!data.expireDate) return '到期日期不能为空';
    if (!isValidDateString(data.expireDate)) return '到期日期格式不正确';
  }

  if (type === 'balance') {
    if (data.balance != null && data.balance !== '' && !Number.isFinite(Number(data.balance))) {
      return '余额格式不正确';
    }
    if (!data.monthlyFee && data.monthlyFee !== 0) return '月租不能为空';
    if (!Number.isFinite(Number(data.monthlyFee)) || Number(data.monthlyFee) < 0) return '月租格式不正确';
    if (!data.billingDay) return '扣费日不能为空';
    const bd = Number(data.billingDay);
    if (!Number.isInteger(bd)) return '扣费日须为整数';
    if (bd < 1 || bd > 28) return '扣费日须为 1-28';
  }

  if (type === 'subscription') {
    if (data.price != null && data.price !== '') {
      const price = Number(data.price);
      if (!Number.isFinite(price) || price < 0) return '价格格式不正确';
    }
    if (data.billing && !BILLING_TYPES.includes(data.billing)) return '计费周期不正确';
    if (!isValidHttpUrl(asString(data.url))) return '链接必须以 http:// 或 https:// 开头';
  }

  if (data.currency && !CURRENCY_CODES.includes(data.currency)) return '货币类型不支持';

  const remindDays = normalizeRemindDays(data.remindDays);
  if (remindDays.length === 0) return '提醒时间不能为空';

  return null;
}

/**
 * Merge update data into existing item (partial update)
 */
export function mergeUpdate(existing, data) {
  const updated = { ...existing };
  // Common fields
  for (const key of ['name', 'expireDate', 'cycle', 'remark', 'status']) {
    if (data[key] !== undefined) {
      if (key === 'cycle') updated[key] = asInteger(data[key]);
      else if (key === 'name' || key === 'remark' || key === 'expireDate') updated[key] = asString(data[key]);
      else updated[key] = data[key];
    }
  }
  // eSIM fields
  if (existing.type === 'esim') {
    if (data.number !== undefined) updated.number = asString(data.number);
  }
  // Subscription fields
  if (existing.type === 'subscription') {
    for (const key of ['category', 'region', 'subId', 'price', 'billing', 'currency', 'autoRenew', 'remindDays', 'url']) {
      if (data[key] !== undefined) {
        if (['category', 'region', 'subId', 'url'].includes(key)) updated[key] = asString(data[key]);
        else if (key === 'price') updated[key] = data[key] === '' || data[key] == null ? null : asString(data[key]);
        else if (key === 'autoRenew') updated[key] = Boolean(data[key]);
        else if (key === 'remindDays') updated[key] = normalizeRemindDays(data[key]);
        else updated[key] = data[key];
      }
    }
  }
  // Balance fields
  if (existing.type === 'balance') {
    for (const key of ['number', 'balance', 'monthlyFee', 'billingDay', 'currency', 'remindDays']) {
      if (data[key] !== undefined) {
        if (key === 'balance' || key === 'monthlyFee') updated[key] = asNumber(data[key], 0);
        else if (key === 'billingDay') updated[key] = asInteger(data[key], 1);
        else if (key === 'number') updated[key] = asString(data[key]);
        else if (key === 'remindDays') updated[key] = normalizeRemindDays(data[key]);
        else updated[key] = data[key];
      }
    }
    updated.predictedSuspendDate = calcSuspendDate(updated.balance, updated.monthlyFee, updated.billingDay);
  }
  return updated;
}
