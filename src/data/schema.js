/**
 * Unified data schema for eSIM cards and subscriptions
 */

/**
 * Create a new item with defaults
 * @param {'esim'|'subscription'|'balance'} type
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

  if (type === 'balance') {
    return {
      ...base,
      number: data.number || '',
      balance: data.balance != null ? parseFloat(data.balance) : 0,
      monthlyFee: data.monthlyFee != null ? parseFloat(data.monthlyFee) : 0,
      billingDay: data.billingDay != null ? parseInt(data.billingDay) : 1,
      currency: data.currency || 'CNY',
      remindDays: data.remindDays ?? 3,
    };
  }

  // subscription
  return {
    ...base,
    category: data.category || '',
    region: data.region || '',
    subId: data.subId || '',
    price: data.price || null,
    billing: data.billing || 'monthly',
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
  if (type !== 'balance' && !data.expireDate) return '到期日期不能为空';
  if (type === 'balance') {
    if (!data.monthlyFee && data.monthlyFee !== 0) return '月租不能为空';
    if (!data.billingDay) return '扣费日不能为空';
    const bd = parseInt(data.billingDay);
    if (bd < 1 || bd > 28) return '扣费日须为 1-28';
  }
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
    for (const key of ['category', 'region', 'subId', 'price', 'billing', 'currency', 'autoRenew', 'remindDays', 'url']) {
      if (data[key] !== undefined) updated[key] = data[key];
    }
  }
  // Balance fields
  if (existing.type === 'balance') {
    for (const key of ['number', 'balance', 'monthlyFee', 'billingDay', 'currency', 'remindDays']) {
      if (data[key] !== undefined) {
        if (key === 'balance' || key === 'monthlyFee') updated[key] = parseFloat(data[key]);
        else if (key === 'billingDay') updated[key] = parseInt(data[key]);
        else updated[key] = data[key];
      }
    }
  }
  return updated;
}
