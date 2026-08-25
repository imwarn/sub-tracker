export const ITEM_TYPES = ['esim', 'subscription', 'balance'];

export const STATUSES = ['active', 'paused'];

export const BILLING_TYPES = ['monthly', 'yearly', 'once'];

export const BILLING_MODES = ['natural', 'fixed'];

export const DEFAULT_REMIND_DAYS = [3, 1, 0];

export const REMIND_DAY_OPTIONS = [30, 15, 7, 3, 1, 0];

export const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: '$',
  TWD: '$',
  KRW: '₩',
  TRY: '₺',
  THB: '฿',
  NGN: '₦',
  INR: '₹',
  PHP: '₱',
  MYR: 'RM',
  SGD: '$',
};

export const CURRENCY_CODES = Object.keys(CURRENCY_SYMBOLS);

// Reference exchange rates (to CNY base)
export const DEFAULT_EXCHANGE_RATES = {
  CNY: 1.0,
  USD: 7.25,
  EUR: 7.85,
  GBP: 9.20,
  JPY: 0.048,
  HKD: 0.93,
  TWD: 0.23,
  KRW: 0.0054,
  TRY: 0.22,
  THB: 0.20,
  NGN: 0.0048,
  INR: 0.087,
  PHP: 0.13,
  MYR: 1.62,
  SGD: 5.40,
};
