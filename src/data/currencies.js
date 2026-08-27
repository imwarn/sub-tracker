/**
 * ISO 4217 Currency definitions and reference exchange rates.
 * Comprehensive dictionary covering major global and low-cost subscription currencies.
 */

export const ISO_CURRENCIES = [
  // Top Asian / Domestic
  { code: 'CNY', name: '人民币', symbol: '¥', flag: '🇨🇳' },
  { code: 'USD', name: '美元', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: '欧元', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: '英镑', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: '日元', symbol: '¥', flag: '🇯🇵' },
  { code: 'HKD', name: '港币', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'TWD', name: '新台币', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'KRW', name: '韩元', symbol: '₩', flag: '🇰🇷' },
  { code: 'SGD', name: '新加坡元', symbol: 'S$', flag: '🇸🇬' },
  { code: 'MYR', name: '马来西亚林吉特', symbol: 'RM', flag: '🇲🇾' },
  { code: 'THB', name: '泰铢', symbol: '฿', flag: '🇹🇭' },
  { code: 'PHP', name: '菲律宾比索', symbol: '₱', flag: '🇵🇭' },
  { code: 'IDR', name: '印尼盾', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'VND', name: '越南盾', symbol: '₫', flag: '🇻🇳' },
  { code: 'INR', name: '印度卢比', symbol: '₹', flag: '🇮🇳' },
  { code: 'PKR', name: '巴基斯坦卢比', symbol: '₨', flag: '🇵🇰' },
  { code: 'BDT', name: '孟加拉塔卡', symbol: '৳', flag: '🇧🇩' },

  // Popular Low-Cost / Cross-Region Subscription Currencies
  { code: 'TRY', name: '土耳其里拉', symbol: '₺', flag: '🇹🇷' },
  { code: 'NGN', name: '尼日利亚奈拉', symbol: '₦', flag: '🇳🇬' },
  { code: 'ARS', name: '阿根廷比索', symbol: '$', flag: '🇦🇷' },
  { code: 'EGP', name: '埃及镑', symbol: 'E£', flag: '🇪🇬' },
  { code: 'BRL', name: '巴西雷亚尔', symbol: 'R$', flag: '🇧🇷' },
  { code: 'KZT', name: '哈萨克斯坦坚戈', symbol: '₸', flag: '🇰🇿' },
  { code: 'UAH', name: '乌克兰格里夫纳', symbol: '₴', flag: '🇺🇦' },
  { code: 'GHS', name: '加纳塞地', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'KES', name: '肯尼亚先令', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'ZAR', name: '南非兰特', symbol: 'R', flag: '🇿🇦' },
  { code: 'COP', name: '哥伦比亚比索', symbol: 'COL$', flag: '🇨🇴' },
  { code: 'CLP', name: '智利比索', symbol: 'CLP$', flag: '🇨🇱' },
  { code: 'PEN', name: '秘鲁索尔', symbol: 'S/.', flag: '🇵🇪' },
  { code: 'MXN', name: '墨西哥比索', symbol: 'Mex$', flag: '🇲🇽' },

  // Major Developed Markets
  { code: 'CAD', name: '加拿大元', symbol: 'CA$', flag: '🇨🇦' },
  { code: 'AUD', name: '澳大利亚元', symbol: 'AU$', flag: '🇦🇺' },
  { code: 'NZD', name: '新西兰元', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'SEK', name: '瑞典克朗', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: '挪威克朗', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: '丹麦克朗', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', name: '波兰兹罗提', symbol: 'zł', flag: '🇵🇱' },
  { code: 'CZK', name: '捷克克朗', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', name: '匈牙利福林', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'RON', name: '罗马尼亚列伊', symbol: 'lei', flag: '🇷🇴' },
  { code: 'BGN', name: '保加利亚列弗', symbol: 'лв', flag: '🇧🇬' },
  { code: 'RUB', name: '俄罗斯卢布', symbol: '₽', flag: '🇷🇺' },
  { code: 'ILS', name: '以色列新谢克尔', symbol: '₪', flag: '🇮🇱' },

  // Middle East & Others
  { code: 'AED', name: '阿联酋迪拉姆', symbol: 'AED', flag: '🇦🇪' },
  { code: 'SAR', name: '沙特里亚尔', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'QAR', name: '卡塔尔里亚尔', symbol: 'QR', flag: '🇶🇦' },
  { code: 'KWD', name: '科威特第纳尔', symbol: 'KD', flag: '🇰🇼' },
  { code: 'BHD', name: '巴林第纳尔', symbol: 'BD', flag: '🇧🇭' },
  { code: 'OMR', name: '阿曼里亚尔', symbol: 'OMR', flag: '🇴🇲' },
  { code: 'MAD', name: '摩洛哥迪拉姆', symbol: 'MAD', flag: '🇲🇦' },
  { code: 'GEL', name: '格鲁吉亚拉里', symbol: '₾', flag: '🇬🇪' },
  { code: 'LKR', name: '斯里兰卡卢比', symbol: 'Rs', flag: '🇱🇰' },
  { code: 'NPR', name: '尼泊尔卢比', symbol: 'Rs', flag: '🇳🇵' },
  { code: 'UYU', name: '乌拉圭比索', symbol: '$U', flag: '🇺🇾' },
  { code: 'CRC', name: '哥斯达黎加科朗', symbol: '₡', flag: '🇨🇷' },
];

export const CURRENCY_SYMBOLS = Object.fromEntries(
  ISO_CURRENCIES.map(c => [c.code, c.symbol])
);

export const CURRENCY_CODES = ISO_CURRENCIES.map(c => c.code);

/**
 * Default reference exchange rates relative to CNY (Base = CNY: 1.0)
 * 1 Foreign Currency = X CNY
 */
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
  ARS: 0.0073,
  BRL: 1.28,
  EGP: 0.15,
  KZT: 0.015,
  VND: 0.00029,
  IDR: 0.00045,
  CAD: 5.35,
  AUD: 4.75,
  NZD: 4.35,
  CHF: 8.20,
  RUB: 0.078,
  ZAR: 0.39,
  AED: 1.97,
  SAR: 1.93,
  PLN: 1.85,
  SEK: 0.70,
  NOK: 0.68,
  DKK: 1.05,
  MXN: 0.36,
  CLP: 0.0076,
  COP: 0.0018,
  PEN: 1.95,
  PKR: 0.026,
  BDT: 0.060,
  CZK: 0.31,
  HUF: 0.020,
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
  CRC: 0.014,
};

export function getCurrencyInfo(code) {
  if (!code) return null;
  const upper = String(code).toUpperCase().trim();
  return ISO_CURRENCIES.find(c => c.code === upper) || null;
}
