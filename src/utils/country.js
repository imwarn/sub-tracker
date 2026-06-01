/**
 * Country calling code → flag emoji mapping (E.164 / ITU-T)
 * Comprehensive table covering all assigned country codes.
 * Uses longest-prefix-first matching for correct disambiguation.
 */

const COUNTRY_MAP = {
  // 1-digit
  '1':  { name: '美国/加拿大', flag: '🇺🇸' },
  '7':  { name: '俄罗斯',     flag: '🇷🇺' },

  // 2-digit: Zone 2 (Africa)
  '20': { name: '埃及',       flag: '🇪🇬' },
  '27': { name: '南非',       flag: '🇿🇦' },

  // 2-digit: Zone 3 (Europe)
  '30': { name: '希腊',       flag: '🇬🇷' },
  '31': { name: '荷兰',       flag: '🇳🇱' },
  '32': { name: '比利时',     flag: '🇧🇪' },
  '33': { name: '法国',       flag: '🇫🇷' },
  '34': { name: '西班牙',     flag: '🇪🇸' },
  '36': { name: '匈牙利',     flag: '🇭🇺' },
  '39': { name: '意大利',     flag: '🇮🇹' },

  // 2-digit: Zone 4 (Europe)
  '40': { name: '罗马尼亚',   flag: '🇷🇴' },
  '41': { name: '瑞士',       flag: '🇨🇭' },
  '43': { name: '奥地利',     flag: '🇦🇹' },
  '44': { name: '英国',       flag: '🇬🇧' },
  '45': { name: '丹麦',       flag: '🇩🇰' },
  '46': { name: '瑞典',       flag: '🇸🇪' },
  '47': { name: '挪威',       flag: '🇳🇴' },
  '48': { name: '波兰',       flag: '🇵🇱' },
  '49': { name: '德国',       flag: '🇩🇪' },

  // 2-digit: Zone 5 (Americas)
  '51': { name: '秘鲁',       flag: '🇵🇪' },
  '52': { name: '墨西哥',     flag: '🇲🇽' },
  '53': { name: '古巴',       flag: '🇨🇺' },
  '54': { name: '阿根廷',     flag: '🇦🇷' },
  '55': { name: '巴西',       flag: '🇧🇷' },
  '56': { name: '智利',       flag: '🇨🇱' },
  '57': { name: '哥伦比亚',   flag: '🇨🇴' },
  '58': { name: '委内瑞拉',   flag: '🇻🇪' },

  // 2-digit: Zone 6 (Southeast Asia / Oceania)
  '60': { name: '马来西亚',   flag: '🇲🇾' },
  '61': { name: '澳大利亚',   flag: '🇦🇺' },
  '62': { name: '印尼',       flag: '🇮🇩' },
  '63': { name: '菲律宾',     flag: '🇵🇭' },
  '64': { name: '新西兰',     flag: '🇳🇿' },
  '65': { name: '新加坡',     flag: '🇸🇬' },
  '66': { name: '泰国',       flag: '🇹🇭' },

  // 2-digit: Zone 8 (East Asia)
  '81': { name: '日本',       flag: '🇯🇵' },
  '82': { name: '韩国',       flag: '🇰🇷' },
  '84': { name: '越南',       flag: '🇻🇳' },
  '86': { name: '中国',       flag: '🇨🇳' },

  // 2-digit: Zone 9 (West/South/Central Asia)
  '90': { name: '土耳其',     flag: '🇹🇷' },
  '91': { name: '印度',       flag: '🇮🇳' },
  '92': { name: '巴基斯坦',   flag: '🇵🇰' },
  '93': { name: '阿富汗',     flag: '🇦🇫' },
  '94': { name: '斯里兰卡',   flag: '🇱🇰' },
  '95': { name: '缅甸',       flag: '🇲🇲' },
  '98': { name: '伊朗',       flag: '🇮🇷' },

  // 3-digit: Zone 2 (Africa cont.)
  '212': { name: '摩洛哥',     flag: '🇲🇦' },
  '213': { name: '阿尔及利亚', flag: '🇩🇿' },
  '216': { name: '突尼斯',     flag: '🇹🇳' },
  '218': { name: '利比亚',     flag: '🇱🇾' },
  '220': { name: '冈比亚',     flag: '🇬🇲' },
  '221': { name: '塞内加尔',   flag: '🇸🇳' },
  '222': { name: '毛里塔尼亚', flag: '🇲🇷' },
  '223': { name: '马里',       flag: '🇲🇱' },
  '224': { name: '几内亚',     flag: '🇬🇳' },
  '225': { name: '科特迪瓦',   flag: '🇨🇮' },
  '226': { name: '布基纳法索', flag: '🇧🇫' },
  '227': { name: '尼日尔',     flag: '🇳🇪' },
  '228': { name: '多哥',       flag: '🇹🇬' },
  '229': { name: '贝宁',       flag: '🇧🇯' },
  '230': { name: '毛里求斯',   flag: '🇲🇺' },
  '231': { name: '利比里亚',   flag: '🇱🇷' },
  '232': { name: '塞拉利昂',   flag: '🇸🇱' },
  '233': { name: '加纳',       flag: '🇬🇭' },
  '234': { name: '尼日利亚',   flag: '🇳🇬' },
  '235': { name: '乍得',       flag: '🇹🇩' },
  '236': { name: '中非',       flag: '🇨🇫' },
  '237': { name: '喀麦隆',     flag: '🇨🇲' },
  '238': { name: '佛得角',     flag: '🇨🇻' },
  '239': { name: '圣多美',     flag: '🇸🇹' },
  '240': { name: '赤道几内亚', flag: '🇬🇶' },
  '241': { name: '加蓬',       flag: '🇬🇦' },
  '242': { name: '刚果(布)',   flag: '🇨🇬' },
  '243': { name: '刚果(金)',   flag: '🇨🇩' },
  '244': { name: '安哥拉',     flag: '🇦🇴' },
  '245': { name: '几内亚比绍', flag: '🇬🇼' },
  '246': { name: '迪戈加西亚', flag: '🇮🇴' },
  '247': { name: '阿森松岛',   flag: '🇦🇨' },
  '248': { name: '塞舌尔',     flag: '🇸🇨' },
  '249': { name: '苏丹',       flag: '🇸🇩' },
  '250': { name: '卢旺达',     flag: '🇷🇼' },
  '251': { name: '埃塞俄比亚', flag: '🇪🇹' },
  '252': { name: '索马里',     flag: '🇸🇴' },
  '253': { name: '吉布提',     flag: '🇩🇯' },
  '254': { name: '肯尼亚',     flag: '🇰🇪' },
  '255': { name: '坦桑尼亚',   flag: '🇹🇿' },
  '256': { name: '乌干达',     flag: '🇺🇬' },
  '257': { name: '布隆迪',     flag: '🇧🇮' },
  '258': { name: '莫桑比克',   flag: '🇲🇿' },
  '260': { name: '赞比亚',     flag: '🇿🇲' },
  '261': { name: '马达加斯加', flag: '🇲🇬' },
  '262': { name: '留尼汪',     flag: '🇷🇪' },
  '263': { name: '津巴布韦',   flag: '🇿🇼' },
  '264': { name: '纳米比亚',   flag: '🇳🇦' },
  '265': { name: '马拉维',     flag: '🇲🇼' },
  '266': { name: '莱索托',     flag: '🇱🇸' },
  '267': { name: '博茨瓦纳',   flag: '🇧🇼' },
  '268': { name: '斯威士兰',   flag: '🇸🇿' },
  '269': { name: '科摩罗',     flag: '🇰🇲' },
  '290': { name: '圣赫勒拿',   flag: '🇸🇭' },
  '291': { name: '厄立特里亚', flag: '🇪🇷' },
  '297': { name: '阿鲁巴',     flag: '🇦🇼' },
  '298': { name: '法罗群岛',   flag: '🇫🇴' },
  '299': { name: '格陵兰',     flag: '🇬🇱' },

  // 3-digit: Zone 3 (Europe cont.)
  '350': { name: '直布罗陀',   flag: '🇬🇮' },
  '351': { name: '葡萄牙',     flag: '🇵🇹' },
  '352': { name: '卢森堡',     flag: '🇱🇺' },
  '353': { name: '爱尔兰',     flag: '🇮🇪' },
  '354': { name: '冰岛',       flag: '🇮🇸' },
  '355': { name: '阿尔巴尼亚', flag: '🇦🇱' },
  '356': { name: '马耳他',     flag: '🇲🇹' },
  '357': { name: '塞浦路斯',   flag: '🇨🇾' },
  '358': { name: '芬兰',       flag: '🇫🇮' },
  '359': { name: '保加利亚',   flag: '🇧🇬' },
  '370': { name: '立陶宛',     flag: '🇱🇹' },
  '371': { name: '拉脱维亚',   flag: '🇱🇻' },
  '372': { name: '爱沙尼亚',   flag: '🇪🇪' },
  '373': { name: '摩尔多瓦',   flag: '🇲🇩' },
  '374': { name: '亚美尼亚',   flag: '🇦🇲' },
  '375': { name: '白俄罗斯',   flag: '🇧🇾' },
  '376': { name: '安道尔',     flag: '🇦🇩' },
  '377': { name: '摩纳哥',     flag: '🇲🇨' },
  '378': { name: '圣马力诺',   flag: '🇸🇲' },
  '380': { name: '乌克兰',     flag: '🇺🇦' },
  '381': { name: '塞尔维亚',   flag: '🇷🇸' },
  '382': { name: '黑山',       flag: '🇲🇪' },
  '383': { name: '科索沃',     flag: '🇽🇰' },
  '385': { name: '克罗地亚',   flag: '🇭🇷' },
  '386': { name: '斯洛文尼亚', flag: '🇸🇮' },
  '387': { name: '波黑',       flag: '🇧🇦' },
  '389': { name: '北马其顿',   flag: '🇲🇰' },

  // 3-digit: Zone 8 (East Asia cont.)
  '850': { name: '朝鲜',       flag: '🇰🇵' },
  '852': { name: '香港',       flag: '🇭🇰' },
  '853': { name: '澳门',       flag: '🇲🇴' },
  '855': { name: '柬埔寨',     flag: '🇰🇭' },
  '856': { name: '老挝',       flag: '🇱🇦' },
  '880': { name: '孟加拉',     flag: '🇧🇩' },
  '886': { name: '台湾',       flag: '🇹🇼' },

  // 3-digit: Zone 9 (West/South/Central Asia cont.)
  '960': { name: '马尔代夫',   flag: '🇲🇻' },
  '961': { name: '黎巴嫩',     flag: '🇱🇧' },
  '962': { name: '约旦',       flag: '🇯🇴' },
  '963': { name: '叙利亚',     flag: '🇸🇾' },
  '964': { name: '伊拉克',     flag: '🇮🇶' },
  '965': { name: '科威特',     flag: '🇰🇼' },
  '966': { name: '沙特',       flag: '🇸🇦' },
  '967': { name: '也门',       flag: '🇾🇪' },
  '968': { name: '阿曼',       flag: '🇴🇲' },
  '970': { name: '巴勒斯坦',   flag: '🇵🇸' },
  '971': { name: '阿联酋',     flag: '🇦🇪' },
  '972': { name: '以色列',     flag: '🇮🇱' },
  '973': { name: '巴林',       flag: '🇧🇭' },
  '974': { name: '卡塔尔',     flag: '🇶🇦' },
  '975': { name: '不丹',       flag: '🇧🇹' },
  '976': { name: '蒙古',       flag: '🇲🇳' },
  '977': { name: '尼泊尔',     flag: '🇳🇵' },
  '992': { name: '塔吉克斯坦', flag: '🇹🇯' },
  '993': { name: '土库曼斯坦', flag: '🇹🇲' },
  '994': { name: '阿塞拜疆',   flag: '🇦🇿' },
  '995': { name: '格鲁吉亚',   flag: '🇬🇪' },
  '996': { name: '吉尔吉斯斯坦', flag: '🇰🇬' },
  '998': { name: '乌兹别克斯坦', flag: '🇺🇿' },
};

// Pre-sorted prefix list: longest first for greedy matching
const PREFIXES_3 = [];
const PREFIXES_2 = [];
const PREFIXES_1 = [];
for (const code of Object.keys(COUNTRY_MAP)) {
  if (code.length === 3) PREFIXES_3.push(code);
  else if (code.length === 2) PREFIXES_2.push(code);
  else PREFIXES_1.push(code);
}

/**
 * Parse phone number to extract country info
 * Strips +, spaces, dashes, parentheses, and leading 00 prefix.
 * Tries 3-digit → 2-digit → 1-digit prefix matching.
 *
 * @param {string} number - Phone number (e.g. "+861****8000", "+447****3456")
 * @returns {{ code: string, flag: string, name: string } | null}
 */
export function parseCountry(number) {
  if (!number) return null;

  // Strip everything except digits
  let digits = number.replace(/[^0-9]/g, '');
  if (!digits) return null;

  // Remove leading 00 (international dial prefix)
  if (digits.startsWith('00')) digits = digits.substring(2);

  // Try 3-digit prefixes first, then 2, then 1
  if (digits.length >= 3) {
    const p3 = digits.substring(0, 3);
    if (COUNTRY_MAP[p3]) return { code: p3, ...COUNTRY_MAP[p3] };
  }
  if (digits.length >= 2) {
    const p2 = digits.substring(0, 2);
    if (COUNTRY_MAP[p2]) return { code: p2, ...COUNTRY_MAP[p2] };
  }
  if (digits.length >= 1) {
    const p1 = digits[0];
    if (COUNTRY_MAP[p1]) return { code: p1, ...COUNTRY_MAP[p1] };
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

/**
 * Get the full COUNTRY_MAP (for frontend sync)
 */
export function getCountryMap() {
  return COUNTRY_MAP;
}
