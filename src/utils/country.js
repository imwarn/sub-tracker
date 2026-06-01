/**
 * Country code → flag emoji mapping
 * Extracts country code from phone number prefix
 */

const COUNTRY_MAP = {
  '1': { name: '美国', flag: '🇺🇸' },
  '7': { name: '俄罗斯', flag: '🇷🇺' },
  '20': { name: '埃及', flag: '🇪🇬' },
  '27': { name: '南非', flag: '🇿🇦' },
  '30': { name: '希腊', flag: '🇬🇷' },
  '31': { name: '荷兰', flag: '🇳🇱' },
  '33': { name: '法国', flag: '🇫🇷' },
  '34': { name: '西班牙', flag: '🇪🇸' },
  '36': { name: '匈牙利', flag: '🇭🇺' },
  '39': { name: '意大利', flag: '🇮🇹' },
  '44': { name: '英国', flag: '🇬🇧' },
  '46': { name: '瑞典', flag: '🇸🇪' },
  '48': { name: '波兰', flag: '🇵🇱' },
  '49': { name: '德国', flag: '🇩🇪' },
  '52': { name: '墨西哥', flag: '🇲🇽' },
  '55': { name: '巴西', flag: '🇧🇷' },
  '60': { name: '马来西亚', flag: '🇲🇾' },
  '61': { name: '澳大利亚', flag: '🇦🇺' },
  '62': { name: '印尼', flag: '🇮🇩' },
  '63': { name: '菲律宾', flag: '🇵🇭' },
  '65': { name: '新加坡', flag: '🇸🇬' },
  '66': { name: '泰国', flag: '🇹🇭' },
  '81': { name: '日本', flag: '🇯🇵' },
  '82': { name: '韩国', flag: '🇰🇷' },
  '84': { name: '越南', flag: '🇻🇳' },
  '86': { name: '中国', flag: '🇨🇳' },
  '90': { name: '土耳其', flag: '🇹🇷' },
  '91': { name: '印度', flag: '🇮🇳' },
  '92': { name: '巴基斯坦', flag: '🇵🇰' },
  '93': { name: '阿富汗', flag: '🇦🇫' },
  '95': { name: '缅甸', flag: '🇲🇲' },
  '212': { name: '摩洛哥', flag: '🇲🇦' },
  '213': { name: '阿尔及利亚', flag: '🇩🇿' },
  '216': { name: '突尼斯', flag: '🇹🇳' },
  '218': { name: '利比亚', flag: '🇱🇾' },
  '220': { name: '冈比亚', flag: '🇬🇲' },
  '234': { name: '尼日利亚', flag: '🇳🇬' },
  '254': { name: '肯尼亚', flag: '🇰🇪' },
  '351': { name: '葡萄牙', flag: '🇵🇹' },
  '352': { name: '卢森堡', flag: '🇱🇺' },
  '353': { name: '爱尔兰', flag: '🇮🇪' },
  '354': { name: '冰岛', flag: '🇮🇸' },
  '358': { name: '芬兰', flag: '🇫🇮' },
  '359': { name: '保加利亚', flag: '🇧🇬' },
  '370': { name: '立陶宛', flag: '🇱🇹' },
  '371': { name: '拉脱维亚', flag: '🇱🇻' },
  '372': { name: '爱沙尼亚', flag: '🇪🇪' },
  '380': { name: '乌克兰', flag: '🇺🇦' },
  '852': { name: '香港', flag: '🇭🇰' },
  '853': { name: '澳门', flag: '🇲🇴' },
  '855': { name: '柬埔寨', flag: '🇰🇭' },
  '856': { name: '老挝', flag: '🇱🇦' },
  '880': { name: '孟加拉', flag: '🇧🇩' },
  '886': { name: '台湾', flag: '🇹🇼' },
  '960': { name: '马尔代夫', flag: '🇲🇻' },
  '966': { name: '沙特', flag: '🇸🇦' },
  '971': { name: '阿联酋', flag: '🇦🇪' },
  '972': { name: '以色列', flag: '🇮🇱' },
  '977': { name: '尼泊尔', flag: '🇳🇵' },
  '998': { name: '乌兹别克斯坦', flag: '🇺🇿' },
};

/**
 * Parse phone number to extract country info
 * @param {string} number - Phone number (e.g. "+8613800138000", "+447911123456")
 * @returns {{ code: string, flag: string, name: string } | null}
 */
export function parseCountry(number) {
  if (!number) return null;

  // Strip all non-digit chars except leading +
  let digits = number.replace(/[^\d]/g, '');
  // Remove leading 00 (international prefix)
  if (digits.startsWith('00')) digits = digits.substring(2);

  // Try longest prefix first (3 digits), then 2, then 1
  for (const len of [3, 2, 1]) {
    const prefix = digits.substring(0, len);
    if (COUNTRY_MAP[prefix]) {
      return { code: prefix, ...COUNTRY_MAP[prefix] };
    }
  }
  return null;
}

/**
 * Get flag emoji from phone number
 */
export function getFlag(number) {
  const info = parseCountry(number);
  return info ? info.flag : '🌍';
}
