export const ITEM_TYPES = ['esim', 'subscription', 'balance'];

export const STATUSES = ['active', 'paused'];

export const BILLING_TYPES = ['monthly', 'yearly', 'once'];

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
