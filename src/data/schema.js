/**
 * Unified data schema for eSIM cards and subscriptions
 */

/**
 * Create a new item with defaults
 * @param {'esim'|'subscription'} type
 * @param {object} data
 * @returns {object}
 */
export function createItem(type, data) {
  const base = {
    id: Date.now().toString(),
    type,
    name: data.name || '',
    expireDate: data.expireDate || '',
    cycle: data.cycle || null,
    remark: data.remark || '',
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
  };

  if (type === 'esim') {
    return {
      ...base,
      number: data.number || '',
    };
  }

  // subscription
  return {
    ...base,
    category: data.category || '',
    price: data.price || null,
    currency: data.currency || 'CNY',
    autoRenew: data.autoRenew || false,
    remindDays: data.remindDays ?? 3,
    url: data.url || '',
  };
}

/**
 * Validate required fields
 */
export function validateItem(type, data) {
  if (!data.name) return '名称不能为空';
  if (!data.expireDate) return '到期日期不能为空';
  if (type === 'subscription' && data.price && isNaN(parseFloat(data.price))) {
    return '价格格式不正确';
  }
  return null;
}

/**
 * Merge update data into existing item (partial update)
 */
export function mergeUpdate(existing, data) {
  const updated = { ...existing };
  // Common fields
  for (const key of ['name', 'expireDate', 'cycle', 'remark', 'status']) {
    if (data[key] !== undefined) updated[key] = data[key];
  }
  // eSIM fields
  if (existing.type === 'esim') {
    if (data.number !== undefined) updated.number = data.number;
  }
  // Subscription fields
  if (existing.type === 'subscription') {
    for (const key of ['category', 'price', 'currency', 'autoRenew', 'remindDays', 'url']) {
      if (data[key] !== undefined) updated[key] = data[key];
    }
  }
  return updated;
}
