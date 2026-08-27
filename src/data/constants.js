import {
  ISO_CURRENCIES,
  CURRENCY_SYMBOLS,
  CURRENCY_CODES,
  DEFAULT_EXCHANGE_RATES,
  getCurrencyInfo,
} from './currencies.js';

export const ITEM_TYPES = ['esim', 'subscription', 'balance'];

export const STATUSES = ['active', 'paused'];

export const BILLING_TYPES = ['monthly', 'yearly', 'once'];

export const BILLING_MODES = ['natural', 'fixed'];

export const DEFAULT_REMIND_DAYS = [3, 1, 0];

export const REMIND_DAY_OPTIONS = [30, 15, 7, 3, 1, 0];

export const DEFAULT_CATEGORIES = [
  'AI 服务',
  '流媒体',
  'VPN / 节点',
  '云服务',
  '域名 / SSL',
  'VPS / 服务器',
  '软件订阅',
  '游戏 / 娱乐',
  '效率 / 工具',
  '生活 / 购物',
  '其他',
];

/**
 * Mapping legacy category keys (e.g. from old select values) to canonical names
 */
export const CATEGORY_ALIASES = {
  'AI': 'AI 服务',
  'Streaming': '流媒体',
  'VPN': 'VPN / 节点',
  'Cloud': '云服务',
  'Domain': '域名 / SSL',
  'VPS': 'VPS / 服务器',
  'Software': '软件订阅',
  'Game': '游戏 / 娱乐',
  'Other': '其他',
};

export function normalizeCategory(cat) {
  if (!cat) return '';
  const trimmed = String(cat).trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}

export const DEFAULT_REGIONS = [
  { code: 'CN', name: '中国大陆', flag: '🇨🇳' },
  { code: 'US', name: '美区', flag: '🇺🇸' },
  { code: 'HK', name: '香港', flag: '🇭🇰' },
  { code: 'TW', name: '台湾', flag: '🇹🇼' },
  { code: 'JP', name: '日本', flag: '🇯🇵' },
  { code: 'KR', name: '韩国', flag: '🇰🇷' },
  { code: 'TR', name: '土耳其', flag: '🇹🇷' },
  { code: 'NG', name: '尼日利亚', flag: '🇳🇬' },
  { code: 'AR', name: '阿根廷', flag: '🇦🇷' },
  { code: 'EG', name: '埃及', flag: '🇪🇬' },
  { code: 'IN', name: '印度', flag: '🇮🇳' },
  { code: 'BR', name: '巴西', flag: '🇧🇷' },
  { code: 'PK', name: '巴基斯坦', flag: '🇵🇰' },
  { code: 'PH', name: '菲律宾', flag: '🇵🇭' },
  { code: 'MY', name: '马来西亚', flag: '🇲🇾' },
  { code: 'SG', name: '新加坡', flag: '🇸🇬' },
  { code: 'GB', name: '英国', flag: '🇬🇧' },
  { code: 'EU', name: '欧洲', flag: '🇪🇺' },
  { code: 'OTHER', name: '其他', flag: '🌐' },
];

export {
  ISO_CURRENCIES,
  CURRENCY_SYMBOLS,
  CURRENCY_CODES,
  DEFAULT_EXCHANGE_RATES,
  getCurrencyInfo,
};
