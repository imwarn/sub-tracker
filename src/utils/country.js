/**
 * Country calling code → ISO 3166-1 alpha-2 code mapping (E.164 / ITU-T)
 * Comprehensive table covering all assigned country codes.
 * Uses longest-prefix-first matching for correct disambiguation.
 */

const COUNTRY_MAP = {
  // 1-digit
  '1': { name: '美国/加拿大', code: 'US' },
  '7': { name: '俄罗斯', code: 'RU' },

  // 2-digit: Zone 2 (Africa)
  '20': { name: '埃及', code: 'EG' },
  '27': { name: '南非', code: 'ZA' },

  // 2-digit: Zone 3 (Europe)
  '30': { name: '希腊', code: 'GR' },
  '31': { name: '荷兰', code: 'NL' },
  '32': { name: '比利时', code: 'BE' },
  '33': { name: '法国', code: 'FR' },
  '34': { name: '西班牙', code: 'ES' },
  '36': { name: '匈牙利', code: 'HU' },
  '39': { name: '意大利', code: 'IT' },

  // 2-digit: Zone 4 (Europe)
  '40': { name: '罗马尼亚', code: 'RO' },
  '41': { name: '瑞士', code: 'CH' },
  '43': { name: '奥地利', code: 'AT' },
  '44': { name: '英国', code: 'GB' },
  '45': { name: '丹麦', code: 'DK' },
  '46': { name: '瑞典', code: 'SE' },
  '47': { name: '挪威', code: 'NO' },
  '48': { name: '波兰', code: 'PL' },
  '49': { name: '德国', code: 'DE' },

  // 2-digit: Zone 5 (Americas)
  '51': { name: '秘鲁', code: 'PE' },
  '52': { name: '墨西哥', code: 'MX' },
  '53': { name: '古巴', code: 'CU' },
  '54': { name: '阿根廷', code: 'AR' },
  '55': { name: '巴西', code: 'BR' },
  '56': { name: '智利', code: 'CL' },
  '57': { name: '哥伦比亚', code: 'CO' },
  '58': { name: '委内瑞拉', code: 'VE' },

  // 2-digit: Zone 6 (Southeast Asia / Oceania)
  '60': { name: '马来西亚', code: 'MY' },
  '61': { name: '澳大利亚', code: 'AU' },
  '62': { name: '印尼', code: 'ID' },
  '63': { name: '菲律宾', code: 'PH' },
  '64': { name: '新西兰', code: 'NZ' },
  '65': { name: '新加坡', code: 'SG' },
  '66': { name: '泰国', code: 'TH' },

  // 2-digit: Zone 8 (East Asia)
  '81': { name: '日本', code: 'JP' },
  '82': { name: '韩国', code: 'KR' },
  '84': { name: '越南', code: 'VN' },
  '86': { name: '中国', code: 'CN' },

  // 2-digit: Zone 9 (West/South/Central Asia)
  '90': { name: '土耳其', code: 'TR' },
  '91': { name: '印度', code: 'IN' },
  '92': { name: '巴基斯坦', code: 'PK' },
  '93': { name: '阿富汗', code: 'AF' },
  '94': { name: '斯里兰卡', code: 'LK' },
  '95': { name: '缅甸', code: 'MM' },
  '98': { name: '伊朗', code: 'IR' },

  // 3-digit: Zone 2 (Africa cont.)
  '212': { name: '摩洛哥', code: 'MA' },
  '213': { name: '阿尔及利亚', code: 'DZ' },
  '216': { name: '突尼斯', code: 'TN' },
  '218': { name: '利比亚', code: 'LY' },
  '220': { name: '冈比亚', code: 'GM' },
  '221': { name: '塞内加尔', code: 'SN' },
  '222': { name: '毛里塔尼亚', code: 'MR' },
  '223': { name: '马里', code: 'ML' },
  '224': { name: '几内亚', code: 'GN' },
  '225': { name: '科特迪瓦', code: 'CI' },
  '226': { name: '布基纳法索', code: 'BF' },
  '227': { name: '尼日尔', code: 'NE' },
  '228': { name: '多哥', code: 'TG' },
  '229': { name: '贝宁', code: 'BJ' },
  '230': { name: '毛里求斯', code: 'MU' },
  '231': { name: '利比里亚', code: 'LR' },
  '232': { name: '塞拉利昂', code: 'SL' },
  '233': { name: '加纳', code: 'GH' },
  '234': { name: '尼日利亚', code: 'NG' },
  '235': { name: '乍得', code: 'TD' },
  '236': { name: '中非', code: 'CF' },
  '237': { name: '喀麦隆', code: 'CM' },
  '238': { name: '佛得角', code: 'CV' },
  '239': { name: '圣多美', code: 'ST' },
  '240': { name: '赤道几内亚', code: 'GQ' },
  '241': { name: '加蓬', code: 'GA' },
  '242': { name: '刚果(布)', code: 'CG' },
  '243': { name: '刚果(金)', code: 'CD' },
  '244': { name: '安哥拉', code: 'AO' },
  '245': { name: '几内亚比绍', code: 'GW' },
  '246': { name: '迪戈加西亚', code: 'IO' },
  '247': { name: '阿森松岛', code: 'AC' },
  '248': { name: '塞舌尔', code: 'SC' },
  '249': { name: '苏丹', code: 'SD' },
  '250': { name: '卢旺达', code: 'RW' },
  '251': { name: '埃塞俄比亚', code: 'ET' },
  '252': { name: '索马里', code: 'SO' },
  '253': { name: '吉布提', code: 'DJ' },
  '254': { name: '肯尼亚', code: 'KE' },
  '255': { name: '坦桑尼亚', code: 'TZ' },
  '256': { name: '乌干达', code: 'UG' },
  '257': { name: '布隆迪', code: 'BI' },
  '258': { name: '莫桑比克', code: 'MZ' },
  '260': { name: '赞比亚', code: 'ZM' },
  '261': { name: '马达加斯加', code: 'MG' },
  '262': { name: '留尼汪', code: 'RE' },
  '263': { name: '津巴布韦', code: 'ZW' },
  '264': { name: '纳米比亚', code: 'NA' },
  '265': { name: '马拉维', code: 'MW' },
  '266': { name: '莱索托', code: 'LS' },
  '267': { name: '博茨瓦纳', code: 'BW' },
  '268': { name: '斯威士兰', code: 'SZ' },
  '269': { name: '科摩罗', code: 'KM' },
  '290': { name: '圣赫勒拿', code: 'SH' },
  '291': { name: '厄立特里亚', code: 'ER' },
  '297': { name: '阿鲁巴', code: 'AW' },
  '298': { name: '法罗群岛', code: 'FO' },
  '299': { name: '格陵兰', code: 'GL' },

  // 3-digit: Zone 3 (Europe cont.)
  '350': { name: '直布罗陀', code: 'GI' },
  '351': { name: '葡萄牙', code: 'PT' },
  '352': { name: '卢森堡', code: 'LU' },
  '353': { name: '爱尔兰', code: 'IE' },
  '354': { name: '冰岛', code: 'IS' },
  '355': { name: '阿尔巴尼亚', code: 'AL' },
  '356': { name: '马耳他', code: 'MT' },
  '357': { name: '塞浦路斯', code: 'CY' },
  '358': { name: '芬兰', code: 'FI' },
  '359': { name: '保加利亚', code: 'BG' },
  '370': { name: '立陶宛', code: 'LT' },
  '371': { name: '拉脱维亚', code: 'LV' },
  '372': { name: '爱沙尼亚', code: 'EE' },
  '373': { name: '摩尔多瓦', code: 'MD' },
  '374': { name: '亚美尼亚', code: 'AM' },
  '375': { name: '白俄罗斯', code: 'BY' },
  '376': { name: '安道尔', code: 'AD' },
  '377': { name: '摩纳哥', code: 'MC' },
  '378': { name: '圣马力诺', code: 'SM' },
  '380': { name: '乌克兰', code: 'UA' },
  '381': { name: '塞尔维亚', code: 'RS' },
  '382': { name: '黑山', code: 'ME' },
  '383': { name: '科索沃', code: 'XK' },
  '385': { name: '克罗地亚', code: 'HR' },
  '386': { name: '斯洛文尼亚', code: 'SI' },
  '387': { name: '波黑', code: 'BA' },
  '389': { name: '北马其顿', code: 'MK' },

  // 3-digit: Zone 8 (East Asia cont.)
  '850': { name: '朝鲜', code: 'KP' },
  '852': { name: '香港', code: 'HK' },
  '853': { name: '澳门', code: 'MO' },
  '855': { name: '柬埔寨', code: 'KH' },
  '856': { name: '老挝', code: 'LA' },
  '880': { name: '孟加拉', code: 'BD' },
  '886': { name: '台湾', code: 'TW' },

  // 3-digit: Zone 9 (West/South/Central Asia cont.)
  '960': { name: '马尔代夫', code: 'MV' },
  '961': { name: '黎巴嫩', code: 'LB' },
  '962': { name: '约旦', code: 'JO' },
  '963': { name: '叙利亚', code: 'SY' },
  '964': { name: '伊拉克', code: 'IQ' },
  '965': { name: '科威特', code: 'KW' },
  '966': { name: '沙特', code: 'SA' },
  '967': { name: '也门', code: 'YE' },
  '968': { name: '阿曼', code: 'OM' },
  '970': { name: '巴勒斯坦', code: 'PS' },
  '971': { name: '阿联酋', code: 'AE' },
  '972': { name: '以色列', code: 'IL' },
  '973': { name: '巴林', code: 'BH' },
  '974': { name: '卡塔尔', code: 'QA' },
  '975': { name: '不丹', code: 'BT' },
  '976': { name: '蒙古', code: 'MN' },
  '977': { name: '尼泊尔', code: 'NP' },
  '992': { name: '塔吉克斯坦', code: 'TJ' },
  '993': { name: '土库曼斯坦', code: 'TM' },
  '994': { name: '阿塞拜疆', code: 'AZ' },
  '995': { name: '格鲁吉亚', code: 'GE' },
  '996': { name: '吉尔吉斯斯坦', code: 'KG' },
  '998': { name: '乌兹别克斯坦', code: 'UZ' },
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
 * @returns {{ code: string, iso: string, name: string } | null}
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
    if (COUNTRY_MAP[p3]) return { code: p3, iso: COUNTRY_MAP[p3].code, name: COUNTRY_MAP[p3].name };
  }
  if (digits.length >= 2) {
    const p2 = digits.substring(0, 2);
    if (COUNTRY_MAP[p2]) return { code: p2, iso: COUNTRY_MAP[p2].code, name: COUNTRY_MAP[p2].name };
  }
  if (digits.length >= 1) {
    const p1 = digits[0];
    if (COUNTRY_MAP[p1]) return { code: p1, iso: COUNTRY_MAP[p1].code, name: COUNTRY_MAP[p1].name };
  }

  return null;
}

/**
 * Get ISO country code from phone number
 */
export function getFlag(number) {
  const info = parseCountry(number);
  return info ? info.iso : '';
}

/**
 * Get the full COUNTRY_MAP (for frontend sync)
 */
export function getCountryMap() {
  return COUNTRY_MAP;
}
